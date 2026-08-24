import { useEffect, useMemo, useState, useRef } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './index.css';
import { apiRequest, clearStoredSession, getStoredSession, setStoredSession } from './lib/api';
import Analytics from './views/Analytics';
import Assets from './views/Assets';
import CMDB from './views/CMDB';
import Customers from './views/Customers';
import Dashboard from './views/Dashboard';
import Login from './views/Login';
import Patches from './views/Patches';
import Scripts from './views/Scripts';
import Tickets from './views/Tickets';
import Users from './views/Users';
import Roles from './views/Roles';
import StandarUserPortal from './views/StandarUserPortal';
import CannedResponses from './views/CannedResponses';
import Categories from './views/Categories';

// Jerarquía de roles: cada rol puede cambiar a los roles listados debajo
const ROLE_HIERARCHY = {
  ADMIN: ['LEVEL_3', 'LEVEL_2', 'LEVEL_1', 'USUARIO ESTANDAR'],
  LEVEL_3: ['LEVEL_2', 'LEVEL_1', 'USUARIO ESTANDAR'],
  LEVEL_2: ['LEVEL_1', 'USUARIO ESTANDAR'],
  LEVEL_1: ['USUARIO ESTANDAR'],
  'USUARIO ESTANDAR': [],
};

// Permisos de fallback (solo si la consulta al API falla)
const FALLBACK_ROLE_PERMISSIONS = {
  ADMIN: ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'TICKETS_DELETE', 'TICKETS_CONFIGURE', 'ASSETS_VIEW', 'ASSETS_MANAGE', 'USERS_MANAGE', 'ROLES_MANAGE'],
  LEVEL_3: ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW', 'ASSETS_MANAGE'],
  LEVEL_2: ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW'],
  LEVEL_1: ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW'],
  'NIVEL 3': ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW', 'ASSETS_MANAGE'],
  'NIVEL 2': ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW'],
  'NIVEL 1': ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW'],
  'USUARIO ESTANDAR': ['TICKETS_VIEW', 'TICKETS_CREATE'],
};

function getAvailableRoles(realRole) {
  return ROLE_HIERARCHY[realRole] || [];
}

function getRoleLabel(role) {
  return {
    ADMIN: 'Administrador',
    LEVEL_1: 'Tecnico Nivel 1',
    LEVEL_2: 'Tecnico Nivel 2',
    LEVEL_3: 'Tecnico Nivel 3',
    'USUARIO ESTANDAR': 'Usuario Estándar',
  }[role] || role;
}

function getRoleColor(role) {
  return {
    ADMIN: '#10b981',
    LEVEL_3: '#0ea5e9',
    LEVEL_2: '#8b5cf6',
    LEVEL_1: '#f59e0b',
    'USUARIO ESTANDAR': '#6b7280',
  }[role] || '#64748b';
}

function getUserInitials(name) {
  return String(name || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'US';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });
}

function UserAvatar({ user, size = 40, className = 'profile-avatar' }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`Avatar de ${user.name}`}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      {getUserInitials(user?.name)}
    </div>
  );
}

function ProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen valida para el avatar.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar los 2 MB.');
      return;
    }

    try {
      const avatarUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, avatarUrl }));
      setError('');
    } catch (fileError) {
      setError(fileError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave({
        email: form.email,
        phone: form.phone,
        avatarUrl: form.avatarUrl || null,
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card profile-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <h3 id="profile-modal-title">Mi perfil</h3>
            <p>Actualiza tu celular, correo y avatar personal.</p>
          </div>
        </div>

        {error && <div className="feedback error" style={{ marginTop: '1rem' }}>{error}</div>}

        <form className="form-grid profile-form-grid" style={{ marginTop: '1rem' }} onSubmit={handleSubmit}>
          <div className="field full">
            <label>Vista previa del avatar</label>
            <div className="profile-editor-avatar">
              <UserAvatar user={{ ...user, avatarUrl: form.avatarUrl }} size={84} className="profile-avatar profile-avatar-large" />
              <div className="profile-editor-actions">
                <label className="btn-ghost profile-upload-btn" htmlFor="profile-avatar-file">
                  Cargar imagen
                </label>
                <input
                  id="profile-avatar-file"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleFileChange}
                  hidden
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setForm((current) => ({ ...current, avatarUrl: '' }))}
                >
                  Usar avatar predeterminado
                </button>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="profile-email">Correo</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="usuario@dominio.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="profile-phone">Celular</label>
            <input
              id="profile-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="3001234567"
            />
          </div>

          <div className="field full">
            <label>Usuario</label>
            <div className="profile-static-value">
              <strong>{user?.name}</strong>
              <span>{getRoleLabel(user?.role)}</span>
            </div>
          </div>

          <div className="toolbar full">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const icons = {
    dashboard: (
      <svg {...common}>
        <path d="M4 13h7V4H4zM13 20h7v-9h-7zM13 4h7v5h-7zM4 20h7v-5H4z" />
      </svg>
    ),
    analytics: (
      <svg {...common}>
        <path d="M4 19h16" />
        <path d="M7 16V9" />
        <path d="M12 16V5" />
        <path d="M17 16v-3" />
      </svg>
    ),
    assets: (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
    discovery: (
      <svg {...common}>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    policy: (
      <svg {...common}>
        <path d="M8 3h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v4h4" />
        <path d="M9 13h6M9 17h6M9 9h2" />
      </svg>
    ),
    tickets: (
      <svg {...common}>
        <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
        <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
        <path d="M9 9h6M9 15h6" />
      </svg>
    ),
    customers: (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    ),
    support: (
      <svg {...common}>
        <path d="M18 8a6 6 0 1 0-12 0v4a2 2 0 0 0 2 2h1" />
        <path d="M15 14a3 3 0 0 1-3 3h-1" />
        <path d="M18 14h1a2 2 0 0 0 2-2V8" />
      </svg>
    ),
    cmdb: (
      <svg {...common}>
        <path d="M12 3 4 7l8 4 8-4-8-4Z" />
        <path d="m4 12 8 4 8-4" />
        <path d="m4 17 8 4 8-4" />
      </svg>
    ),
    patch: (
      <svg {...common}>
        <path d="M14 4a2.8 2.8 0 1 1 4 4L9 17l-4 1 1-4 9-10Z" />
      </svg>
    ),
    software: (
      <svg {...common}>
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="m3 16 9 5 9-5" />
        <path d="m3 12 9 5 9-5" />
      </svg>
    ),
    users: (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </svg>
    ),
    knowledge: (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M12 6v4M12 14v.01" />
      </svg>
    ),
  };

  return icons[name] ?? icons.dashboard;
}

function buildNavSections(user) {
  const hasPermission = (perm) => user?.permissions?.includes(perm);
  const isAdmin = user?.role === 'ADMIN';

  if (user?.role === 'USUARIO ESTANDAR') {
    return [
      {
        title: 'Mi Soporte',
        items: [
          { name: 'Mis Tickets', path: '/tickets', icon: 'tickets', description: 'Gestionar mis solicitudes de soporte' },
        ],
      },
    ];
  }

  const sections = [
    {
      title: 'Operacion RMM',
      items: [
        { name: 'Dispositivos', path: '/assets', icon: 'assets', description: 'Inventario y salud de equipos', requiredPermission: 'ASSETS_VIEW' },
        { name: 'Discovery', path: '/discovery', icon: 'discovery', description: 'Exploracion de red pendiente', requiredPermission: 'ASSETS_VIEW' },
        { name: 'Politicas', path: '/scripts', icon: 'policy', description: 'Automatizacion y estandares', requiredPermission: 'ASSETS_VIEW' },
      ],
    },
    {
      title: 'Mesa PSA',
      items: [
        { name: 'Tickets', path: '/tickets', icon: 'tickets', description: 'Incidentes y solicitudes', requiredPermission: 'TICKETS_VIEW' },
      ],
    },
    {
      title: 'Activos',
      items: [{ name: 'CMDB', path: '/cmdb', icon: 'cmdb', description: 'Relacion completa de activos', requiredPermission: 'ASSETS_VIEW' }],
    },
    {
      title: 'Despliegue',
      items: [
        { name: 'Parches', path: '/patch', icon: 'patch', description: 'Actualizaciones y cumplimiento', requiredPermission: 'ASSETS_VIEW' },
        { name: 'Software', path: '/software', icon: 'software', description: 'Distribucion pendiente', requiredPermission: 'ASSETS_VIEW' },
      ],
    },
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (isAdmin) return true;
      if (item.requiredPermission) return hasPermission(item.requiredPermission);
      if (item.requiredAnyPermission) return item.requiredAnyPermission.some(p => hasPermission(p));
      return true; // Default to show if no permissions specified
    })
  })).filter(section => section.items.length > 0);

  // Administration section with granular filtering
  const adminItems = [
    { 
      name: 'Usuarios', 
      path: '/users', 
      icon: 'users', 
      description: 'Roles, accesos y tecnicos',
      requiredPermission: 'USERS_MANAGE'
    },
    { 
      name: 'Roles y Permisos', 
      path: '/roles', 
      icon: 'policy', 
      description: 'Gestion de niveles de acceso',
      requiredPermission: 'ROLES_MANAGE'
    },
    { 
      name: 'Categorías y ANS', 
      path: '/categories', 
      icon: 'policy', 
      description: 'Tipos de tickets y niveles de servicio',
      requiredAnyPermission: ['USERS_MANAGE', 'ROLES_MANAGE', 'TICKETS_CONFIGURE']
    },
    { 
      name: 'Base de Conocimiento', 
      path: '/knowledge', 
      icon: 'knowledge', 
      description: 'Respuestas predeterminadas',
      requiredAnyPermission: ['USERS_MANAGE', 'ROLES_MANAGE', 'TICKETS_CONFIGURE']
    },
    { 
      name: 'Clientes', 
      path: '/customers', 
      icon: 'customers', 
      description: 'Entidades y contactos',
      requiredPermission: 'USERS_MANAGE'
    },
    { 
      name: 'Service Desk', 
      path: '/desk', 
      icon: 'support', 
      description: 'Modulo en implementacion',
      requiredPermission: 'USERS_MANAGE'
    },
  ];

  const filteredAdminItems = adminItems.filter(item => {
    if (isAdmin) return true;
    if (item.requiredPermission) return hasPermission(item.requiredPermission);
    if (item.requiredAnyPermission) return item.requiredAnyPermission.some(p => hasPermission(p));
    return false;
  });

  if (filteredAdminItems.length > 0) {
    filteredSections.push({
      title: 'Administracion',
      items: filteredAdminItems,
    });
  }

  return filteredSections;
}

function Header({ user, realRole, viewAsRole, onRoleSwitch, navSections, onLogout, isSidebarCollapsed, onToggleSidebar, onProfileUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  const quickLinks = useMemo(
    () =>
      navSections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          section: section.title,
        })),
      ),
    [navSections],
  );

  const filteredLinks = searchQuery
    ? quickLinks.filter((item) =>
        `${item.name} ${item.description} ${item.section}`.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const availableRoles = getAvailableRoles(realRole);
  const isImpersonating = viewAsRole && viewAsRole !== realRole;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
    }
    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRoleDropdownOpen]);

  return (
    <header className="header">
      <div className="brand">
        {/* Hamburger: visible en desktop y mobile */}
        <button 
          type="button" 
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? "Expandir menu" : "Contraer menu"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="brand-mark">AY</div>
        <div>
          <p className="brand-title">Mesa de Ayuda</p>
          <p className="brand-subtitle">Centro de operacion y soporte</p>
        </div>
      </div>

      {/* Buscador: oculto en mobile para mantener header compacto */}
      <div className="search-shell hide-mobile">
        <Icon name="discovery" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar modulos, tickets o clientes"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {filteredLinks.length > 0 && (
          <div className="nav-dropdown nav-dropdown-wide">
            {filteredLinks.slice(0, 5).map((item) => (
              <Link key={item.path} to={item.path} className="nav-dropdown-link" onClick={() => setSearchQuery('')}>
                <span className="nav-dropdown-icon">
                  <Icon name={item.icon} size={16} />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.section}</small>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Meta del usuario: visible en desktop */}
      <div className="header-meta hide-mobile">
        {/* Role Switcher Dropdown */}
        <div style={{ position: 'relative' }} ref={roleDropdownRef}>
          <button
            type="button"
            className="status-pill"
            onClick={() => availableRoles.length > 0 && setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            style={{ 
              cursor: availableRoles.length > 0 ? 'pointer' : 'default',
              border: isImpersonating ? `2px solid ${getRoleColor(viewAsRole)}` : undefined,
              background: isImpersonating ? `${getRoleColor(viewAsRole)}15` : undefined,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title={availableRoles.length > 0 ? 'Clic para cambiar vista de rol' : getRoleLabel(user.role)}
          >
            <span className="status-dot" style={{ background: getRoleColor(viewAsRole || realRole) }} />
            <span>{getRoleLabel(viewAsRole || realRole)}</span>
            {availableRoles.length > 0 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transition: 'transform 0.2s', transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {isRoleDropdownOpen && availableRoles.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: '#fff',
              borderRadius: '14px',
              boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              minWidth: '260px',
              zIndex: 1000,
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease',
            }}>
              {/* Header del Dropdown */}
              <div style={{ padding: '0.9rem 1rem 0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Cambiar Vista de Rol
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Rol real: <strong style={{ color: getRoleColor(realRole) }}>{getRoleLabel(realRole)}</strong>
                </div>
              </div>

              {/* Opción: Volver al rol real */}
              {isImpersonating && (
                <button
                  type="button"
                  onClick={() => { onRoleSwitch(null); setIsRoleDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    background: '#ecfdf5',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    fontSize: '0.85rem',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ecfdf5'}
                >
                  <span style={{ fontSize: '1.1rem' }}>↩️</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#065f46' }}>Volver a {getRoleLabel(realRole)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Restaurar mi rol original</div>
                  </div>
                </button>
              )}

              {/* Lista de roles disponibles */}
              {availableRoles.map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => { onRoleSwitch(role); setIsRoleDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    background: viewAsRole === role ? `${getRoleColor(role)}10` : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    fontSize: '0.85rem',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = viewAsRole === role ? `${getRoleColor(role)}10` : 'transparent'}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${getRoleColor(role)}18`,
                    border: `1.5px solid ${getRoleColor(role)}40`,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}>
                    {viewAsRole === role ? '✓' : role === 'USUARIO ESTANDAR' ? '👤' : '🔧'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{getRoleLabel(role)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {role === 'USUARIO ESTANDAR' ? 'Solo crear y ver sus tickets' :
                       role === 'LEVEL_1' ? 'Soporte básico y tickets' :
                       role === 'LEVEL_2' ? 'Soporte intermedio y activos' :
                       'Soporte avanzado y gestión'}
                    </div>
                  </div>
                  {viewAsRole === role && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: getRoleColor(role), background: `${getRoleColor(role)}15`, padding: '2px 8px', borderRadius: '6px' }}>Activo</span>
                  )}
                </button>
              ))}

              {/* Footer informativo */}
              <div style={{ padding: '0.6rem 1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>ℹ️</span> Vista temporal: solo cambia la interfaz, no los permisos reales.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de impersonación */}
        {isImpersonating && (
          <div style={{
            background: `${getRoleColor(viewAsRole)}15`,
            border: `1px solid ${getRoleColor(viewAsRole)}40`,
            borderRadius: '8px',
            padding: '0.25rem 0.6rem',
            fontSize: '0.68rem',
            color: getRoleColor(viewAsRole),
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            cursor: 'pointer',
          }}
          onClick={() => onRoleSwitch(null)}
          title="Clic para restaurar rol original"
          >
            <span>👁️</span> Vista como
          </div>
        )}

        <button type="button" className="profile-chip profile-chip-button" onClick={() => setIsProfileOpen(true)}>
          <UserAvatar user={user} />
          <div>
            <strong>{user.name}</strong>
            <small>{user.phone || user.email}</small>
          </div>
        </button>
        <button type="button" className="btn-ghost" onClick={onLogout}>
          Salir
        </button>
      </div>

      {isProfileOpen ? (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onSave={onProfileUpdate}
        />
      ) : null}
    </header>
  );
}

function Sidebar({ user, navSections, isCollapsed, onClose }) {
  const location = useLocation();
  const primaryItems = user?.role === 'USUARIO ESTANDAR' ? [] : [
    { name: 'Dashboard', path: '/', icon: 'dashboard', requiredPermission: 'DASHBOARD_VIEW' },
    { name: 'Analitica', path: '/analytics', icon: 'analytics', requiredPermission: 'ANALYTICS_VIEW' },
  ].filter(item => {
    if (user?.role === 'ADMIN') return true;
    if (item.requiredPermission) return user?.permissions?.includes(item.requiredPermission);
    return true;
  });

  // Auto-expand sections containing the active route
  const [collapsed, setCollapsed] = useState(() => {
    const initial = {};
    navSections.forEach((section) => {
      const hasActive = section.items.some((item) => item.path === location.pathname);
      initial[section.title] = !hasActive;
    });
    return initial;
  });

  const toggleSection = (title) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path) => location.pathname === path;

  // Sidebar footer: perfil y logout (visible solo en mobile dentro del sidebar)
  const sidebarFooter = (
    <div className="sidebar-mobile-footer">
      <div className="sidebar-footer-user">
        <UserAvatar user={user} size={36} />
        <div className="sidebar-footer-info">
          <strong>{user?.name}</strong>
          <small>{getRoleLabel(user?.role)}</small>
        </div>
      </div>
    </div>
  );

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header del sidebar en mobile */}
      <div className="sidebar-mobile-header">
        <div className="sidebar-mobile-brand">
          <div className="brand-mark" style={{ width: 32, height: 32, fontSize: '0.8rem', borderRadius: '8px' }}>AY</div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Menu</span>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Cerrar menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Contenido de navegación: igual en desktop y mobile */}
      <div className="sidebar-scroll-content">
        <div className="sidebar-group">
          {primaryItems.map((item) => (
            <Link key={item.path} to={item.path} className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`} onClick={onClose}>
              <span className="sidebar-icon">
                <Icon name={item.icon} />
              </span>
              <span>
                {item.name}
              </span>
            </Link>
          ))}
        </div>

        {navSections.map((section) => (
          <div key={section.title} className="sidebar-group">
            <div
              className="sidebar-section-title"
              onClick={() => toggleSection(section.title)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
            >
              <span>{section.title}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'transform 0.25s ease', transform: collapsed[section.title] ? 'rotate(-90deg)' : 'rotate(0deg)', opacity: 0.5 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div style={{
              overflow: 'hidden',
              maxHeight: collapsed[section.title] ? '0px' : '500px',
              transition: 'max-height 0.3s ease',
            }}>
              {section.items.map((item) => (
                <Link key={item.path} to={item.path} className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`} onClick={onClose}>
                  <span className="sidebar-icon">
                    <Icon name={item.icon} />
                  </span>
                  <span>
                    {item.name}
                    <small className="sidebar-item-meta">{item.description}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer del sidebar visible en mobile */}
      {sidebarFooter}
    </aside>
  );
}

function PlaceholderModule({ title, description }) {
  return (
    <div className="view-container">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Modulo en preparacion</p>
          <h2>{title}</h2>
          <p className="muted-text">{description}</p>
        </div>
        <div className="stat-grid compact-grid">
          <div className="stat-card">
            <span>Estado</span>
            <strong>En diseno</strong>
          </div>
          <div className="stat-card">
            <span>Siguiente paso</span>
            <strong>Integracion backend</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProtectedRoute({ user, allowedRoles, requiredPermission, requiredAnyPermission, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredPermission = () => {
    if (requiredPermission && !user.permissions?.includes(requiredPermission)) return false;
    if (requiredAnyPermission && !requiredAnyPermission.some((permission) => user.permissions?.includes(permission))) return false;
    return true;
  };

  const hasRole = () => {
    if (allowedRoles && !allowedRoles.includes(user.role)) return false;
    return true;
  };

  if (!hasRole() || !hasRequiredPermission()) {
    // If we are at the home page or any other page and lack permission, 
    // go to /tickets which is the base view for all authorized users.
    // This prevents infinite loops if / itself is protected.
    return <Navigate to="/tickets" replace />;
  }

  return children;
}

function AppShell({ user, onLogout, onProfileUpdate }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewAsRole, setViewAsRole] = useState(null);
  const [rolesMap, setRolesMap] = useState({}); // { 'LEVEL_1': ['ANALYTICS_VIEW', ...], ... }

  // Cargar los roles reales y sus permisos desde el backend
  const loadRoles = () => {
    apiRequest('/roles')
      .then((roles) => {
        if (Array.isArray(roles)) {
          const map = {};
          roles.forEach(r => {
            const roleName = (r.name || '').trim().toUpperCase();
            const perms = r.permissionCodes || [];
            map[roleName] = perms;
            if (roleName.startsWith('NIVEL ')) {
              map['LEVEL_' + roleName.replace('NIVEL ', '')] = perms;
            }
            if (roleName.startsWith('LEVEL_')) {
              map['NIVEL ' + roleName.replace('LEVEL_', '')] = perms;
            }
          });
          setRolesMap(map);
        }
      })
      .catch(() => {
        setRolesMap(FALLBACK_ROLE_PERMISSIONS);
      });
  };

  useEffect(() => {
    loadRoles();
    window.addEventListener('roles-updated', loadRoles);
    return () => window.removeEventListener('roles-updated', loadRoles);
  }, []);

  // Construir el usuario efectivo con el rol simulado y permisos REALES del backend
  const effectiveUser = useMemo(() => {
    const currentRole = (viewAsRole || user?.role || '').trim().toUpperCase();
    
    // Buscar permisos reales del rol en el mapa cargado del backend o fallback
    const resolvedPermissions = rolesMap[currentRole] 
      || rolesMap[currentRole.replace('LEVEL_', 'NIVEL ')]
      || rolesMap[currentRole.replace('NIVEL ', 'LEVEL_')]
      || FALLBACK_ROLE_PERMISSIONS[currentRole]
      || FALLBACK_ROLE_PERMISSIONS[viewAsRole]
      || (viewAsRole ? [] : user?.permissions)
      || [];

    if (!viewAsRole || viewAsRole === user?.role) {
      return {
        ...user,
        permissions: resolvedPermissions.length > 0 ? resolvedPermissions : (user?.permissions || []),
      };
    }

    return {
      ...user,
      role: viewAsRole,
      permissions: resolvedPermissions,
      _realRole: user?.role,
    };
  }, [user, viewAsRole, rolesMap]);

  const navSections = useMemo(() => buildNavSections(effectiveUser), [effectiveUser]);

  function closeSidebar() {
    setIsSidebarCollapsed(true);
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => !prev);
  }

  function handleRoleSwitch(role) {
    setViewAsRole(role);
  }

  // No es necesario forzar el colapso en el montaje ya que el estado inicial es true
  useEffect(() => {
    // Mantener sincronizado si es necesario en cambios de tamaño extremos,
    // pero respetando el estado inicial contraído.
  }, []);

  const isMobileOpen = !isSidebarCollapsed;

  return (
    <div className={`app-wrapper ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
      <Header 
        user={effectiveUser}
        realRole={user.role}
        viewAsRole={viewAsRole}
        onRoleSwitch={handleRoleSwitch}
        navSections={navSections} 
        onLogout={onLogout}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onProfileUpdate={onProfileUpdate}
      />
      <div className="main-layout">
        {/* Backdrop: toca fuera del sidebar en mobile para cerrarlo */}
        {isMobileOpen && (
          <div
            className="sidebar-mobile-backdrop"
            role="presentation"
            onClick={closeSidebar}
          />
        )}
        <Sidebar
          user={effectiveUser}
          navSections={navSections}
          isCollapsed={isSidebarCollapsed}
          onClose={closeSidebar}
        />
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={effectiveUser?.role === 'USUARIO ESTANDAR' ? <Navigate to="/tickets" replace /> : (
                <ProtectedRoute user={effectiveUser} requiredPermission="DASHBOARD_VIEW">
                  <Dashboard user={effectiveUser} />
                </ProtectedRoute>
              )} 
            />
            <Route 
              path="/tickets" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="TICKETS_VIEW">
                  <Tickets />
                </ProtectedRoute>
              )} 
            />
            <Route 
              path="/analytics" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="ANALYTICS_VIEW">
                  <Analytics />
                </ProtectedRoute>
              )} 
            />
            <Route
              path="/knowledge"
              element={(
                <ProtectedRoute user={effectiveUser} requiredAnyPermission={['USERS_MANAGE', 'ROLES_MANAGE', 'TICKETS_CONFIGURE']}>
                  <CannedResponses />
                </ProtectedRoute>
              )}
            />
            <Route 
              path="/assets" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="ASSETS_VIEW">
                  <Assets />
                </ProtectedRoute>
              )} 
            />
            <Route 
              path="/customers" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="USERS_MANAGE">
                  <Customers />
                </ProtectedRoute>
              )} 
            />
            <Route 
              path="/cmdb" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="ASSETS_VIEW">
                  <CMDB />
                </ProtectedRoute>
              )} 
            />
            <Route 
              path="/patch" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="ASSETS_VIEW">
                  <Patches />
                </ProtectedRoute>
              )} 
            />
            <Route 
              path="/scripts" 
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="ASSETS_VIEW">
                  <Scripts />
                </ProtectedRoute>
              )} 
            />
            <Route
              path="/users"
              element={(
                <ProtectedRoute user={effectiveUser} requiredPermission="USERS_MANAGE">
                  <Users />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/roles"
              element={(
                <ProtectedRoute user={effectiveUser} requiredAnyPermission={['USERS_MANAGE', 'ROLES_MANAGE']}>
                  <Roles />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/categories"
              element={(
                <ProtectedRoute user={effectiveUser} requiredAnyPermission={['USERS_MANAGE', 'ROLES_MANAGE', 'TICKETS_CONFIGURE']}>
                  <Categories />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/discovery"
              element={<PlaceholderModule title="Discovery de red" description="Aqui podremos incorporar exploracion automatica y conciliacion de activos detectados." />}
            />
            <Route
              path="/desk"
              element={<PlaceholderModule title="Service Desk" description="La estructura principal ya esta lista para conectar catalogo, SLA y bandeja de asignaciones." />}
            />
            <Route
              path="/software"
              element={<PlaceholderModule title="Distribucion de software" description="Este modulo quedo preparado como siguiente etapa para paquetes, versiones y despliegues." />}
            />
            <Route path="*" element={<PlaceholderModule title="Ruta no disponible" description="La vista solicitada no existe o aun no ha sido implementada." />} />
          </Routes>
        </main>
      </div>

      {/* Modal de perfil */}
      {isProfileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onSave={onProfileUpdate}
        />
      )}
    </div>
  );
}

function AppRoutes({ session, onLogin, onLogout, onProfileUpdate }) {
  return (
    <Routes>
      <Route
        path="/login"
        element={session?.user ? <Navigate to="/" replace /> : <Login onLogin={onLogin} />}
      />
      <Route
          path="/*"
          element={(
          <ProtectedRoute user={session?.user}>
            <AppShell user={session?.user} onLogout={onLogout} onProfileUpdate={onProfileUpdate} />
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getStoredSession()?.token));

  useEffect(() => {
    const storedSession = getStoredSession();

    if (!storedSession?.token) {
      return undefined;
    }

    let ignore = false;

    apiRequest('/auth/me')
      .then((user) => {
        if (ignore) {
          return;
        }

        const nextSession = { token: storedSession.token, user };
        setStoredSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (ignore) {
          return;
        }

        clearStoredSession();
        setSession(null);
      })
      .finally(() => {
        if (!ignore) {
          setCheckingSession(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleLogin(credentials) {
    const nextSession = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setStoredSession(nextSession);
    setSession(nextSession);
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
  }

  async function handleProfileUpdate(profileData) {
    const updatedUser = await apiRequest('/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });

    const storedSession = getStoredSession();
    const nextSession = session
      ? { ...session, user: updatedUser }
      : { token: storedSession?.token, user: updatedUser };

    setStoredSession(nextSession);
    setSession(nextSession);
  }

  if (checkingSession) {
    return <main className="login-shell"><section className="login-card"><div className="empty-state">Validando sesion...</div></section></main>;
  }

  return (
    <Router>
      <AppRoutes session={session} onLogin={handleLogin} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />
    </Router>
  );
}
