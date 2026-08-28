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
            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
            fontSize: '1.25rem'
          }}>
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Matriz de Roles & Permisos (RBAC)
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', border: '1px solid rgba(124, 58, 237, 0.4)' }}>
                Security v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Define privilegios operativos para cada nivel técnico y perfil institucional.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Roles Definidos</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>{roles.length}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Total Permisos</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#a78bfa' }}>{permissions.length}</div>
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

      {/* 🧭 SPLIT LAYOUT (ROLES LIST + PERMISSIONS MATRIX) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: ROLES SELECTOR */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            Niveles & Perfiles ({roles.length})
          </h3>

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
                    boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: isSelected ? '#5b21b6' : '#0f172a' }}>
                      {r.name}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      background: isSelected ? '#ddd6fe' : '#f1f5f9',
                      color: isSelected ? '#4c1d95' : '#475569'
                    }}>
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
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          gridColumn: 'span 2'
        }}>
          {selectedRole ? (
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
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
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)'
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
                  const isSomeChecked = moduleCodes.some((code) => selectedRole.permissionCodes.includes(code));

                  return (
                    <div
                      key={group.moduleCode}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#ffffff'
                      }}
                    >
                      {/* Module Header */}
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
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
                            cursor: 'pointer'
                          }}
                        >
                          {isAllChecked ? 'Deseleccionar Módulo' : 'Seleccionar Todo'}
                        </button>
                      </div>

                      {/* Permissions Checkbox Grid */}
                      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
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
                                transition: 'all 0.15s ease'
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
              Selecciona un rol a la izquierda para editar su matriz de permisos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
