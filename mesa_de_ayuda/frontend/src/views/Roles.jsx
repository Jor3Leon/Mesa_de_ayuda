import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';

const MODULE_LABELS = {
  ADMINISTRACION: 'Seguridad & Administración',
  DASHBOARD: 'Dashboard Operacional',
  ANALYTICS: 'Analítica & Reportes',
  ASSETS: 'Inventario ITAM & Hardware',
  CMDB: 'CMDB & Topología',
  CUSTOMERS: 'Estructura Organizacional',
  TICKETS: 'Mesa de Ayuda & Service Desk',
};

const ACTION_LABELS = {
  APPROVE: 'Aprobar',
  ASSIGN: 'Asignar',
  CLOSE: 'Cerrar',
  CREATE: 'Crear',
  DELETE: 'Eliminar',
  EDIT: 'Editar',
  EXPORT: 'Exportar',
  MANAGE: 'Administrar',
  VIEW: 'Consultar',
};

function getPermissionMeta(code) {
  const [moduleCode = 'GENERAL', actionCode = 'ACCESS'] = String(code || '').split('_');
  const moduleGroupCode = moduleCode === 'USERS' || moduleCode === 'ROLES' ? 'ADMINISTRACION' : moduleCode;

  return {
    moduleCode,
    moduleGroupCode,
    actionCode,
    moduleLabel: MODULE_LABELS[moduleGroupCode] || moduleGroupCode,
    actionLabel: ACTION_LABELS[actionCode] || actionCode,
  };
}

function getPermissionDisplay(permission) {
  if (permission.code === 'DASHBOARD_VIEW') {
    return { title: 'Ver Dashboard', subtitle: 'Acceso a la consola principal de operaciones.' };
  }
  if (permission.code === 'ANALYTICS_VIEW') {
    return { title: 'Ver Analítica', subtitle: 'Acceso a gráficos de rendimiento y ANS.' };
  }
  if (permission.code === 'USERS_MANAGE') {
    return { title: 'Gestionar Usuarios', subtitle: 'Crear, editar y desactivar cuentas.' };
  }
  if (permission.code === 'ROLES_MANAGE') {
    return { title: 'Gestionar Roles & RBAC', subtitle: 'Modificar matrices de permisos.' };
  }
  if (permission.code === 'TICKETS_CONFIGURE') {
    return { title: 'Campos Administrativos', subtitle: 'Modificar tipo, categoría, ANS y técnicos.' };
  }
  if (permission.code === 'TICKETS_VIEW_STATS') {
    return { title: 'Estadísticas de Tickets', subtitle: 'Ver contadores y tablero de métricas.' };
  }
  if (permission.code === 'ASSETS_MANAGE') {
    return { title: 'Gestionar Activos', subtitle: 'Crear, editar y dar de baja hardware.' };
  }
  if (permission.code === 'ASSETS_VIEW') {
    return { title: 'Ver Inventario', subtitle: 'Consultar catálogo de equipos y telemetría.' };
  }

  return {
    title: permission.name || permission.code,
    subtitle: permission.description || 'Permiso del sistema',
  };
}

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest('/roles'),
      apiRequest('/permissions'),
    ])
      .then(([rolesRes, permsRes]) => {
        const roleList = Array.isArray(rolesRes) ? rolesRes : [];
        const permList = Array.isArray(permsRes) ? permsRes : [];
        setRoles(roleList);
        setPermissions(permList);
        if (roleList.length > 0) {
          setSelectedRole({
            ...roleList[0],
            permissionCodes: [...(roleList[0].permissionCodes || [])],
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const groupedPermissions = useMemo(() => {
    const groups = permissions.reduce((acc, permission) => {
      const meta = getPermissionMeta(permission.code);
      const currentGroup = acc.get(meta.moduleGroupCode) || {
        moduleCode: meta.moduleGroupCode,
        moduleLabel: meta.moduleLabel,
        permissions: [],
      };

      currentGroup.permissions.push({
        ...permission,
        actionCode: meta.actionCode,
        actionLabel: meta.actionLabel,
      });

      acc.set(meta.moduleGroupCode, currentGroup);
      return acc;
    }, new Map());

    return Array.from(groups.values()).sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
  }, [permissions]);

  function handleSelectRole(role) {
    setSelectedRole({
      ...role,
      permissionCodes: [...(role.permissionCodes || [])],
    });
    setFeedback('');
    setError('');
  }

  function handleTogglePermission(code) {
    if (!selectedRole) return;

    setSelectedRole((prev) => {
      const nextPermissions = prev.permissionCodes.includes(code)
        ? prev.permissionCodes.filter((currentCode) => currentCode !== code)
        : [...prev.permissionCodes, code];

      return { ...prev, permissionCodes: nextPermissions };
    });
  }

  function handleToggleModule(moduleCodes) {
    if (!selectedRole) return;

    setSelectedRole((prev) => {
      const hasAllPermissions = moduleCodes.every((code) => prev.permissionCodes.includes(code));
      const nextPermissions = hasAllPermissions
        ? prev.permissionCodes.filter((code) => !moduleCodes.includes(code))
        : [...new Set([...prev.permissionCodes, ...moduleCodes])];

      return { ...prev, permissionCodes: nextPermissions };
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!selectedRole) return;

    setSaving(true);
    setError('');
    setFeedback('');

    try {
      const updated = await apiRequest(`/roles/${selectedRole.id}`, {
        method: 'PUT',
        body: {
          name: selectedRole.name,
          description: selectedRole.description,
          permissionCodes: selectedRole.permissionCodes,
        },
      });

      const mappedRole = {
        ...updated,
        permissionCodes: updated.permissionCodes || selectedRole.permissionCodes,
      };

      setRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? mappedRole : r)));
      setSelectedRole(mappedRole);
      setFeedback(`Matriz de permisos para el rol "${selectedRole.name}" guardada con éxito.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <p style={{ fontWeight: '600' }}>Cargando matriz RBAC...</p>
      </div>
    );
  }

  const selectedPermsCount = selectedRole?.permissionCodes?.length || 0;
  const coveragePercent = permissions.length > 0 ? Math.round((selectedPermsCount / permissions.length) * 100) : 0;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO CONTROL BAR */}
      <div
        style={{
          background: 'linear-gradient(135deg, #001D40 0%, #002D62 50%, #083b75 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 25px -5px rgba(0, 45, 98, 0.35)',
          border: '1px solid rgba(0, 209, 255, 0.25)',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 209, 255, 0.4)',
              color: '#ffffff',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
                Matriz de Roles & Permisos (RBAC)
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'rgba(0, 209, 255, 0.18)',
                  color: '#00D1FF',
                  border: '1px solid rgba(0, 209, 255, 0.4)',
                }}
              >
                Security v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Define privilegios operativos y permisos modulares para cada nivel técnico y perfil institucional.
            </p>
          </div>
        </div>

        {selectedRole && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#002D62',
              color: '#ffffff',
              padding: '0.65rem 1.35rem',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(0, 45, 98, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saving ? 'Guardando...' : 'Guardar Matriz'}
          </button>
        )}
      </div>

      {/* 📊 ENTERPRISE KPI METRICS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* KPI 1: Roles */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)',
              border: '1px solid #c4b5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Roles Definidos
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {roles.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>
              Perfiles en catálogo
            </div>
          </div>
        </div>

        {/* KPI 2: Permisos Totales */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permisos del Sistema
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {permissions.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '0.2rem' }}>
              Acciones granulares
            </div>
          </div>
        </div>

        {/* KPI 3: Rol Seleccionado */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)',
              border: '1px solid #6ee7b7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permisos del Rol
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {selectedPermsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>
              Asignados a {selectedRole?.name || '---'}
            </div>
          </div>
        </div>

        {/* KPI 4: Cobertura */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cobertura de Acceso
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {coveragePercent}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>
              Alcance de privilegios
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
          ✅ {feedback}
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 🧭 SPLIT LAYOUT (ROLES SELECTOR + PERMISSIONS MATRIX) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: ROLES SELECTOR */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Niveles & Perfiles ({roles.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Selecciona uno</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              const permCount = r.permissionCodes?.length || 0;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                    background: isSelected ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 14px rgba(124, 58, 237, 0.15)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: isSelected ? '#5b21b6' : '#0f172a' }}>
                      {r.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: isSelected ? '#ddd6fe' : '#f1f5f9',
                        color: isSelected ? '#4c1d95' : '#475569',
                      }}
                    >
                      {permCount} permisos
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    {r.description || 'Perfil de acceso estándar del sistema.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: PERMISSIONS MATRIX */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            gridColumn: 'span 2',
          }}
        >
          {selectedRole ? (
            <form onSubmit={handleSave}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                    Privilegios para: <span style={{ color: '#7c3aed' }}>{selectedRole.name}</span>
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {selectedRole.description || 'Configura qué acciones tiene permitido realizar este perfil.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                  }}
                >
                  {saving ? 'Guardando...' : '💾 Guardar Matriz'}
                </button>
              </div>

              {/* MODULES PERMISSION ACCORDION */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {groupedPermissions.map((group) => {
                  const moduleCodes = group.permissions.map((p) => p.code);
                  const isAllChecked = moduleCodes.every((code) => selectedRole.permissionCodes.includes(code));

                  return (
                    <div
                      key={group.moduleCode}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#ffffff',
                      }}
                    >
                      {/* Module Header */}
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          background: '#f8fafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>
                          📦 {group.moduleLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleModule(moduleCodes)}
                          style={{
                            background: isAllChecked ? '#ede9fe' : '#f1f5f9',
                            border: `1px solid ${isAllChecked ? '#c4b5fd' : '#cbd5e1'}`,
                            color: isAllChecked ? '#5b21b6' : '#475569',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          {isAllChecked ? 'Deseleccionar Módulo' : 'Seleccionar Todo'}
                        </button>
                      </div>

                      {/* Permissions Checkbox Grid */}
                      <div
                        style={{
                          padding: '1rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '0.75rem',
                        }}
                      >
                        {group.permissions.map((perm) => {
                          const isChecked = selectedRole.permissionCodes.includes(perm.code);
                          const display = getPermissionDisplay(perm);

                          return (
                            <label
                              key={perm.code}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: isChecked ? '1px solid #c4b5fd' : '1px solid #f1f5f9',
                                background: isChecked ? '#faf5ff' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.code)}
                                style={{ marginTop: '0.2rem', accentColor: '#7c3aed', width: '16px', height: '16px' }}
                              />
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: isChecked ? '#5b21b6' : '#0f172a' }}>
                                  {display.title}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                  {display.subtitle}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Selecciona un rol de la lista izquierda para editar su matriz de permisos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
