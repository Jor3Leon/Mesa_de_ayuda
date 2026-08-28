import { useEffect, useState, useMemo } from 'react';
import { apiRequest, getStoredSession } from '../lib/api';

const initialForm = {
  name: '',
  username: '',
  email: '',
  phone: '',
  locationId: '',
  password: '',
  role: 'NIVEL 1',
};

function getRoleBadgeStyle(role) {
  const r = (role || '').toUpperCase();
  if (r.includes('ADMIN')) return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: '🛡️ Administrador' };
  if (r.includes('3') || r.includes('NIVEL 3')) return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: '⚡ Nivel 3 (Infra)' };
  if (r.includes('2') || r.includes('NIVEL 2')) return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', label: '🔧 Nivel 2 (Especialista)' };
  if (r.includes('1') || r.includes('NIVEL 1')) return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: '🎧 Nivel 1 (Soporte)' };
  return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: '👤 Usuario Estándar' };
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null);
  const session = getStoredSession();
  const currentUserId = session?.user?.id;

  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiRequest('/users'),
      apiRequest('/roles').catch(() => []),
      apiRequest('/locations').catch(() => [])
    ])
      .then(([usersRes, rolesRes, locationsRes]) => {
        if (!ignore) {
          const userList = Array.isArray(usersRes) ? usersRes : [];
          const roleList = Array.isArray(rolesRes) ? rolesRes : [];
          const locList = Array.isArray(locationsRes) ? locationsRes : [];

          setUsers(userList);
          setRoles(roleList);
          setLocations(locList);
          setForm((current) => ({
            ...current,
            role: roleList[0]?.name || current.role,
            locationId: locList[0]?.id ? String(locList[0].id) : '',
          }));
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');

    try {
      const savedUser = await apiRequest(editingUserId ? `/users/${editingUserId}` : '/users', {
        method: editingUserId ? 'PUT' : 'POST',
        body: form,
      });

      setUsers((current) => {
        const nextUsers = editingUserId
          ? current.map((user) => (user.id === editingUserId ? savedUser : user))
          : [...current, savedUser];

        return nextUsers.sort((a, b) => (a.role || '').localeCompare(b.role || '') || a.name.localeCompare(b.name));
      });
      setEditingUserId(null);
      setForm({
        ...initialForm,
        role: roles[0]?.name || initialForm.role,
        locationId: locations[0]?.id ? String(locations[0].id) : '',
      });
      setFeedback(editingUserId ? 'Usuario actualizado correctamente.' : 'Usuario creado con éxito en la plataforma.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(user) {
    setEditingUserId(user.id);
    setForm({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      locationId: user.locationId ? String(user.locationId) : '',
      password: '',
      role: user.role || roles[0]?.name || initialForm.role,
    });
    setError('');
    setFeedback('');
  }

  function cancelEditing() {
    setEditingUserId(null);
    setForm({
      ...initialForm,
      role: roles[0]?.name || initialForm.role,
      locationId: locations[0]?.id ? String(locations[0].id) : '',
    });
  }

  async function handleToggleUserStatus(user) {
    const nextStatus = !user.isActive;
    const confirmed = window.confirm(`¿Deseas ${nextStatus ? 'ACTIVAR' : 'DESACTIVAR'} el acceso de ${user.name}?`);
    if (!confirmed) return;

    setTogglingUserId(user.id);
    setError('');
    setFeedback('');

    try {
      const updatedUser = await apiRequest(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: { isActive: nextStatus },
      });
      setUsers((current) =>
        current
          .map((item) => (
            item.id === user.id
              ? { ...item, ...updatedUser, isActive: updatedUser?.isActive ?? nextStatus }
              : item
          ))
          .sort((a, b) => (a.role || '').localeCompare(b.role || '') || a.name.localeCompare(b.name)),
      );
      setFeedback(`Usuario ${user.name} ${nextStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setTogglingUserId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !search.trim() || 
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.location?.name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const activeCount = users.filter((u) => u.isActive !== false).length;
  const adminCount = users.filter((u) => (u.role || '').toUpperCase().includes('ADMIN')).length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO CONTROL BAR */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        marginBottom: '1.75rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            fontSize: '1.25rem'
          }}>
            👥
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Gestión de Usuarios & Cuentas
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                RBAC v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Control de acceso granular, asignación de dependencias y clasificación de niveles técnicos.
            </p>
          </div>
        </div>

        {/* Hero Quick Stats */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Total Usuarios</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>{users.length}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Activos</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399' }}>{activeCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Admins</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f87171' }}>{adminCount}</div>
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

      {/* 🧭 SPLIT LAYOUT (LIST + FORM) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: USERS LIST */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          gridColumn: 'span 2'
        }}>
          {/* List Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Directorio de Usuarios ({filteredUsers.length})
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem', flex: '1', maxWidth: '480px', justifyContent: 'flex-end' }}>
              <input
                type="text"
                placeholder="Buscar por nombre, usuario, correo o sede..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#f8fafc' }}
              >
                <option value="ALL">Todos los roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Usuario / Funcionario</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Username</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Ubicación / Dependencia</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Nivel de Acceso</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron usuarios con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadgeStyle(u.role);
                    const isSelf = currentUserId === u.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '0.8rem'
                            }}>
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: '#475569' }}>
                          @{u.username}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                          {u.location?.name || 'Sin ubicación asignada'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            background: u.isActive !== false ? '#ecfdf5' : '#fee2e2',
                            color: u.isActive !== false ? '#047857' : '#b91c1c'
                          }}>
                            {u.isActive !== false ? '🟢 Activo' : '🔴 Inactivo'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button
                              onClick={() => startEditing(u)}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                              title="Editar usuario"
                            >
                              ✏️
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={togglingUserId === u.id}
                                style={{
                                  background: u.isActive !== false ? '#fef2f2' : '#ecfdf5',
                                  border: `1px solid ${u.isActive !== false ? '#fecaca' : '#a7f3d0'}`,
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                                title={u.isActive !== false ? 'Desactivar acceso' : 'Activar acceso'}
                              >
                                {u.isActive !== false ? '🚫' : '✅'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: CREATE / EDIT USER FORM */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          position: 'sticky',
          top: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {editingUserId ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
            </h3>
            {editingUserId && (
              <button
                onClick={cancelEditing}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                Nombre Completo *
              </label>
              <input
                required
                type="text"
                placeholder="Ej: Ing. Mario Gómez"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Usuario (Login) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: mgomez"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Rol / Permisos *
                </label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                  {roles.length === 0 && (
                    <>
                      <option value="ADMIN">ADMIN</option>
                      <option value="NIVEL 3">NIVEL 3</option>
                      <option value="NIVEL 2">NIVEL 2</option>
                      <option value="NIVEL 1">NIVEL 1</option>
                      <option value="USUARIO ESTANDAR">USUARIO ESTANDAR</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                Correo Institucional *
              </label>
              <input
                required
                type="email"
                placeholder="Ej: mgomez@yopal.gov.co"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                Sede & Ubicación Asignada
              </label>
              <select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              >
                <option value="">Seleccionar Ubicación</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                {editingUserId ? 'Nueva Contraseña (opcional)' : 'Contraseña Inicial *'}
              </label>
              <input
                type="password"
                placeholder={editingUserId ? 'Dejar en blanco para mantener' : '••••••••'}
                required={!editingUserId}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                padding: '0.75rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.9rem',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
              }}
            >
              {saving ? 'Guardando...' : editingUserId ? 'Guardar Cambios' : 'Registrar Usuario'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
