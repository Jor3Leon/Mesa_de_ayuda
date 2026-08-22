import React from 'react';
import SlaBadge from './SlaBadge';

export default function TicketList({ tickets, onSelect, selectedId, loading }) {
  if (loading) return <div className="loading-state">Cargando tickets...</div>;

  const getStatusClass = (status) => {
    const mapping = {
      NEW: 'badge-warning',
      OPEN: 'badge-info',
      IN_PROGRESS: 'badge-info',
      RESOLVED: 'badge-success',
      CLOSED: 'badge-closed',
    };
    return mapping[status] || 'badge-neutral';
  };

  const getStatusLabel = (status) => {
    const labels = { NEW: 'Nuevo', OPEN: 'Abierto', IN_PROGRESS: 'En Progreso', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' };
    return labels[status] || status;
  };

  return (
    <div className="ticket-list-container">
      {tickets.length === 0 ? (
        <div className="empty-state">No se encontraron tickets con los filtros actuales.</div>
      ) : (
        <div className="ticket-grid">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className={`ticket-card ${selectedId === ticket.id ? 'active' : ''}`}
              onClick={() => onSelect(ticket.id)}
            >
              <div className="ticket-card-header">
                <span className={`badge ${getStatusClass(ticket.status)}`}>
                  {getStatusLabel(ticket.status)}
                </span>
                <span className="ticket-id">#{ticket.id}</span>
              </div>
              <h4 className="ticket-subject">{ticket.subject}</h4>
              <p className="ticket-customer">{ticket.customer?.name || 'Cliente sin nombre'}</p>
              <div className="ticket-card-footer">
                <SlaBadge ticket={ticket} />
                <span className={`priority-indicator ${ticket.priority.toLowerCase()}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
