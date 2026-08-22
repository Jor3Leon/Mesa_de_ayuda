import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

/**
 * Portal del Usuario Estándar - Versión Simplificada
 * Se ha eliminado la funcionalidad de ver detalles y gestión de estado
 * a petición del usuario, volviendo a un listado informativo simple.
 */
export default function StandarUserPortal() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  // Formulario para nuevo ticket
  const [form, setForm] = useState({
    title: '',
    description: '',
    ticketType: 'Incidencia'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/tickets');
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: form.title,
          description: form.description,
          ticketType: form.ticketType
        })
      });
      setForm({ title: '', description: '', ticketType: 'Incidencia' });
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      alert('Error al crear ticket: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Estadísticas simples
  const stats = {
    total: tickets.length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length
  };

  const getStatusBadge = (status) => {
    const labels = { 
      NEW: 'Nuevo', 
      OPEN: 'En Progreso', 
      IN_PROGRESS: 'En Progreso', 
      RESOLVED: 'Resuelto', 
      CLOSED: 'Cerrado' 
    };
    const classes = {
      NEW: 'badge-warning',
      OPEN: 'badge-info',
      IN_PROGRESS: 'badge-info',
      RESOLVED: 'badge-success',
      CLOSED: 'badge-closed'
    };
    return <span className={`badge ${classes[status] || 'badge-neutral'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="view-container">
      {/* Encabezado Principal */}
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Portal de Soporte</p>
          <h2>Mis Solicitudes</h2>
          <p className="muted-text">
            Consulte el estado de sus requerimientos técnicos y cree nuevas solicitudes.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Nueva Solicitud
            </button>
          </div>
        </div>
        
        <div className="stat-grid compact-grid">
          <div className="stat-card">
            <span>Total Tickets</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span>En Gestión</span>
            <strong>{stats.inProgress}</strong>
          </div>
        </div>
      </section>

      {/* Listado de Tickets */}
      <section className="card">
        <div className="section-heading">
          <h3>Listado de Solicitudes</h3>
        </div>
        
        {loading ? (
          <div className="feedback">Cargando...</div>
        ) : error ? (
          <div className="feedback error">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="feedback">No se encontraron solicitudes.</div>
        ) : (
          <div className="table-responsive" style={{ marginTop: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td style={{ fontWeight: 600 }}>#{ticket.id}</td>
                    <td style={{ textTransform: 'uppercase' }}>{ticket.title}</td>
                    <td>{ticket.ticketType}</td>
                    <td>{getStatusBadge(ticket.status)}</td>
                    <td className="muted-text">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Nueva Solicitud */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: 'min(100%, 600px)' }}>
            <div className="modal-header">
              <h3>Nueva Solicitud</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTicket} className="modal-body">
              <div className="field">
                <label>Título</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Problema con acceso a correo"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value.toUpperCase() })}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="field">
                <label>Categoría</label>
                <select 
                  value={form.ticketType} 
                  onChange={e => setForm({ ...form, ticketType: e.target.value })}
                >
                  <option value="Incidencia">Incidencia</option>
                  <option value="Requerimiento">Requerimiento</option>
                </select>
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea 
                  required
                  rows="5"
                  placeholder="Explique su solicitud..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                ></textarea>
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '1.5rem', border: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enviando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
