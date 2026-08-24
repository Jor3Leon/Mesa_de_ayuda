import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';

const MODULE_LABELS = {
  ADMINISTRACION: 'ADMINISTRACION',
  DASHBOARD: 'Dashboard',
  ANALYTICS: 'Analitica',
  ASSETS: 'Inventario',
  CMDB: 'CMDB',
  CUSTOMERS: 'Clientes',
  KNOWLEDGE: 'Base de conocimiento',
  PATCH: 'Parches',
  SCRIPTS: 'Politicas',
  TICKETS: 'Tickets',
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
    return {
      title: 'Consultar',
      subtitle: 'Ver Dashboard Operacional',
    };
  }

  if (permission.code === 'ANALYTICS_VIEW') {
    return {
      title: 'Consultar',
      subtitle: 'Ver Estadísticas y Analítica',
    };
  }

  if (permission.code === 'USERS_MANAGE') {
    return {
      title: 'Usuarios',
      subtitle: 'Gestionar usuarios',
    };
  }

  if (permission.code === 'ROLES_MANAGE') {
    return {
      title: 'Roles y Permisos',
      subtitle: 'Gestionar roles y permisos',
    };
  }

  if (permission.code === 'TICKETS_CONFIGURE') {
    return {
      title: 'Campos Administrativos',
      subtitle: 'Modificar tipo, categoria, ANS y asignaciones',
    };
  }

  if (permission.code === 'TICKETS_VIEW_STATS') {
    return {
      title: 'Tablero Estadísticas',
      subtitle: 'Ver contadores de tickets (Total, Nuevos, En Progreso, Resueltos, Vencidos)',
    };
  }

  return {
    title: permission.actionLabel,
    subtitle: permission.name,
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
        setRoles(rolesRes);
        setPermissions(permsRes);
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

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        permissions: group.permissions.sort((a, b) => {
          if (group.moduleCode === 'ADMINISTRACION') {
            const adminOrder = { USERS_MANAGE: 0, ROLES_MANAGE: 1 };
            return (adminOrder[a.code] ?? 99) - (adminOrder[b.code] ?? 99);
          }

          return a.actionLabel.localeCompare(b.actionLabel);
        }),
      }))
      .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
  }, [permissions]);

  function handleSelectRole(role) {
    setSelectedRole({
      ...role,
      permissionCodes: [...role.permissionCodes],
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
        body: JSON.stringify({
          name: selectedRole.name,
          description: selectedRole.description,
          permissionCodes: selectedRole.permissionCodes,
        }),
      });

      setRoles((prev) => prev.map((role) => (
        role.id === updated.id
          ? { ...updated, permissionCodes: updated.permissions.map((permission) => permission.permission.code) }
          : role
      )));
      setFeedback('Rol actualizado con exito.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const assignedModules = selectedRole
    ? groupedPermissions.filter((group) => group.permissions.some((permission) => selectedRole.permissionCodes.includes(permission.code))).length
    : 0;

  return (
    <div className="view-container">
      <section className="section-heading">
        <div>
          <h2>Roles y Permisos</h2>
          <p>Configura niveles de acceso con una asignacion estructurada por modulo y capacidad operativa.</p>
        </div>
      </section>

      {error && <div className="feedback error">{error}</div>}
      {feedback && <div className="feedback">{feedback}</div>}

      <section className="split-card">
        <article className="card">
          <h3>Roles del Sistema</h3>
          <p className="muted-text" style={{ marginBottom: '1rem' }}>Selecciona un rol para editar su perfil funcional y sus permisos.</p>

          <div className="table-shell">
            {loading ? (
              <div className="empty-state">Cargando roles...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th>Permisos</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={selectedRole?.id === role.id ? 'row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><strong>{role.name}</strong></td>
                      <td><small>{role.description}</small></td>
                      <td><span className="badge badge-neutral">{role.permissionCodes.length}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="card">
          <h3>{selectedRole ? `Editando Rol: ${selectedRole.name}` : 'Seleccione un rol'}</h3>

          {!selectedRole ? (
            <div className="empty-state">Selecciona un rol de la lista para ver y editar sus permisos.</div>
          ) : (
            <form className="form-grid" style={{ marginTop: '1rem' }} onSubmit={handleSave}>
              <div className="field full">
                <label>Nombre del Rol</label>
                <input
                  value={selectedRole.name}
                  onChange={(event) => setSelectedRole({ ...selectedRole, name: event.target.value.toUpperCase() })}
                  placeholder="Ej: COORDINADOR"
                />
              </div>

              <div className="field full">
                <label>Descripcion</label>
                <textarea
                  value={selectedRole.description || ''}
                  onChange={(event) => setSelectedRole({ ...selectedRole, description: event.target.value })}
                  placeholder="Describe la funcion de este rol..."
                />
              </div>

              <div className="field full">
                <label>Matriz de Permisos</label>

                <div className="permissions-shell">
                  <div className="permissions-summary">
                    <div className="permissions-summary-card">
                      <span>Permisos activos</span>
                      <strong>{selectedRole.permissionCodes.length}</strong>
                    </div>
                    <div className="permissions-summary-card">
                      <span>Modulos configurados</span>
                      <strong>{assignedModules}</strong>
                    </div>
                  </div>

                  <div className="permissions-module-grid">
                    {groupedPermissions.map((group) => {
                      const selectedCount = group.permissions.filter((permission) => selectedRole.permissionCodes.includes(permission.code)).length;
                      const allSelected = selectedCount === group.permissions.length;

                      return (
                        <section key={group.moduleCode} className="permission-module-card">
                          <div className="permission-module-head">
                            <div>
                              <h4>{group.moduleLabel}</h4>
                              <p>{selectedCount} de {group.permissions.length} permisos asignados</p>
                            </div>

                            <label className={`permission-module-toggle ${allSelected ? 'is-active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => handleToggleModule(group.permissions.map((permission) => permission.code))}
                              />
                              <span>Todo</span>
                            </label>
                          </div>

                          <div className={`permission-capability-list ${group.permissions.length === 1 ? 'is-single' : ''}`}>
                            {group.permissions.map((permission) => {
                              const isSelected = selectedRole.permissionCodes.includes(permission.code);
                              const display = getPermissionDisplay(permission);

                              return (
                                <label key={permission.id} className={`permission-capability-item ${isSelected ? 'is-selected' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTogglePermission(permission.code)}
                                  />
                                  <div className="permission-capability-copy">
                                    <strong>{display.title}</strong>
                                    <span>{display.subtitle}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn full" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          )}
        </article>
      </section>
    </div>
  );
}
