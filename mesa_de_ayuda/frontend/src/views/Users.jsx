import { useEffect, useState } from 'react';
import { apiRequest, getStoredSession } from '../lib/api';

const initialForm = {
  name: '',
  username: '',
  email: '',
  phone: '',
  locationId: '',
  password: '',
  role: 'LEVEL_1',
};

function getRoleBadgeClass(role) {
  if (role === 'ADMIN') return 'badge-danger';
  if (role === 'LEVEL_3') return 'badge-warning';
  if (role === 'LEVEL_2') return 'badge-neutral';
  return 'badge-success';
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 20l4.2-1 9.3-9.3a1.8 1.8 0 0 0 0-2.5l-.7-.7a1.8 1.8 0 0 0-2.5 0L5 15.8 4 20zM13 6l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 3v8m5.66-5.66a8 8 0 1 1-11.32 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingUserId, setEditingUserId] = useState(null);
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
      apiRequest('/roles'),
      apiRequest('/locations')
    ])
      .then(([usersRes, rolesRes, locationsRes]) => {
        if (!ignore) {
          const catalogLocations = locationsRes.filter((location) => Number.isInteger(location.id));
          setUsers(usersRes);
          setRoles(rolesRes);
          setLocations(catalogLocations);
          setForm((current) => ({
            ...current,
            role: rolesRes.length > 0 ? rolesRes[0].name : current.role,
            locationId: catalogLocations[0]?.id ? String(catalogLocations[0].id) : '',
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
        body: JSON.stringify(form),
      });

      setUsers((current) => {
        const nextUsers = editingUserId
          ? current.map((user) => (user.id === editingUserId ? savedUser : user))
          : [...current, savedUser];

        return nextUsers.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
      });
      setEditingUserId(null);
      setForm({
        ...initialForm,
        role: roles[0]?.name || initialForm.role,
        locationId: locations[0]?.id ? String(locations[0].id) : '',
      });
      setFeedback(editingUserId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
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
    const confirmed = window.confirm(`${nextStatus ? 'Activar' : 'Desactivar'} al usuario ${user.name}?`);
    if (!confirmed) {
      return;
    }

    setTogglingUserId(user.id);
    setError('');
    setFeedback('');
    setUsers((current) =>
      current.map((item) => (item.id === user.id ? { ...item, isActive: nextStatus } : item)),
    );

    try {
      const updatedUser = await apiRequest(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      setUsers((current) =>
        current
          .map((item) => (
            item.id === user.id
              ? { ...item, ...updatedUser, isActive: updatedUser?.isActive ?? nextStatus }
              : item
          ))
          .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
      );
      setFeedback(`Usuario ${nextStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (requestError) {
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, isActive: user.isActive } : item)),
      );
      setError(requestError.message);
    } finally {
      setTogglingUserId(null);
    }
  }

  return (
    <div className="view-container">
      <section className="section-heading">
        <div>
          <h2>Administracion de usuarios</h2>
          <p>Gestion de accesos y clasificacion por nivel tecnico y rol administrativo.</p>
        </div>
      </section>

      {error && <div className="feedback error">{error}</div>}
      {feedback && <div className="feedback">{feedback}</div>}

      <section className="split-card users-layout" style={{ '--desktop-columns': 'minmax(0, 6fr) minmax(0, 4fr)' }}>
        <article className="card users-table-card">
          <h3>Usuarios registrados</h3>
          <div className="table-shell users-table-shell" style={{ marginTop: '1rem' }}>
            {loading ? (
              <div className="empty-state">Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No hay usuarios creados.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Dependencia</th>
                    <th>Rol</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.username}</td>
                      <td>{user.location?.name || user.dependencia || '-'}</td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="users-actions">
                          <button
                            type="button"
                            className={`btn-ghost users-icon-btn ${editingUserId === user.id ? 'is-active' : ''}`}
                            onClick={() => startEditing(user)}
                            title="Editar usuario"
                            aria-label={`Editar usuario ${user.name}`}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className={`btn-ghost users-icon-btn ${user.isActive ? 'status-active' : 'status-inactive'} ${togglingUserId === user.id ? 'is-busy' : ''}`}
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={togglingUserId === user.id || currentUserId === user.id}
                            title={currentUserId === user.id ? 'No puedes desactivar tu propio usuario' : user.isActive ? 'Usuario activo. Click para desactivar' : 'Usuario inactivo. Click para activar'}
                            aria-label={`${user.isActive ? 'Desactivar' : 'Activar'} usuario ${user.name}`}
                          >
                            <PowerIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="card users-form-card">
          <h3>{editingUserId ? 'Editar usuario' : 'Crear usuario'}</h3>
          <form className="form-grid users-form-grid" style={{ marginTop: '1rem' }} onSubmit={handleSubmit}>
            <div className="field full">
              <label htmlFor="user-name">Nombre</label>
              <input
                id="user-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nombre del funcionario o tecnico"
              />
            </div>

            <div className="field">
              <label htmlFor="user-username">Usuario</label>
              <input
                id="user-username"
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))}
                placeholder="Usuario para iniciar sesion"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="user-email">Correo</label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="usuario@yopal.gov.co"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="user-phone">Celular</label>
              <input
                id="user-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Numero telefonico"
              />
            </div>

            <div className="field">
              <label htmlFor="user-location">Dependencia</label>
              <select
                id="user-location"
                value={form.locationId}
                onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}
                disabled={locations.length === 0}
              >
                {locations.length === 0 && <option value="">No hay dependencias disponibles</option>}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="user-role">Rol</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                required
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name} - {role.description}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="user-password">Contrasena</label>
              <input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Asignar contrasena inicial"
                required
              />
            </div>

            <div className="users-form-actions full">
              {editingUserId && (
                <button type="button" className="btn-ghost" onClick={cancelEditing} disabled={saving}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn" disabled={saving}>
                {saving ? (editingUserId ? 'Guardando...' : 'Creando...') : (editingUserId ? 'Guardar cambios' : 'Crear usuario')}
              </button>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}
