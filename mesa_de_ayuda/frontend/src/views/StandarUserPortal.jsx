import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function StandarUserPortal() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  
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
      setTickets(Array.isArray(data) ? data : []);
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
        body: {
          subject: form.title,
          description: form.description,
          ticketType: form.ticketType
        }
      });
      setForm({ title: '', description: '', ticketType: 'Incidencia' });
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      alert('Error al radicar solicitud: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: tickets.length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN' || t.status === 'NEW').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length
  };

  const getStatusBadge = (status) => {
    const map = {
      NEW: { label: 'Nuevo / Asignando', bg: '#fef3c7', color: '#92400e' },
      OPEN: { label: 'En Diagnóstico', bg: '#eff6ff', color: '#1e40af' },
      IN_PROGRESS: { label: 'En Atención Técnica', bg: '#eff6ff', color: '#1e40af' },
      RESOLVED: { label: 'Resuelto / Listo', bg: '#ecfdf5', color: '#047857' },
      CLOSED: { label: 'Cerrado', bg: '#f1f5f9', color: '#475569' }
    };
    const s = map[status] || { label: status, bg: '#f1f5f9', color: '#475569' };
    return (
      <span style={{
        fontSize: '0.75rem',
        fontWeight: '700',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        background: s.bg,
        color: s.color
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
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
            🙋
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Centro de Atención al Funcionario
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                Autoservicio TIC
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Radica solicitudes de soporte tecnológico y consulta el estado de tus requerimientos en tiempo real.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
          }}
        >
          + Radicar Nueva Solicitud
        </button>
      </div>

      {/* KPI STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Solicitudes</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginTop: '0.25rem' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>En Gestión por TIC</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2563eb', marginTop: '0.25rem' }}>{stats.inProgress}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Resueltas & Listas</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#059669', marginTop: '0.25rem' }}>{stats.resolved}</div>
        </div>
      </div>

      {/* LIST OF REQUESTS */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
          Mis Radicados de Soporte
        </h3>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando solicitudes...</div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>No tienes solicitudes registradas actualmente.</p>
            <button onClick={() => setShowForm(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              + Crear Solicitud de Ayuda
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '0.85rem' }}>#{t.id}</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t.subject || t.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '650px', lineHeight: 1.4 }}>
                    {t.description}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                    📅 Radicado el {new Date(t.createdAt).toLocaleDateString()} a las {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div>
                  {getStatusBadge(t.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL NUEVA SOLICITUD */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                ➕ Radicar Solicitud al Soporte TIC
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Tipo de Requerimiento *
                </label>
                <select
                  value={form.ticketType}
                  onChange={(e) => setForm({ ...form, ticketType: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="Incidencia">Falla o Incidencia (Equipo dañado, sin internet, impresora)</option>
                  <option value="Requerimiento">Requerimiento o Servicio (Instalación software, cuenta nueva)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Asunto Breve *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Impresora en Oficina de Contratación no responde"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Descripción Detallada *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Indica qué sucede, en qué oficina te encuentras y cualquier detalle que ayude al técnico..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: '#2563eb', color: '#ffffff', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                >
                  {submitting ? 'Radicando...' : 'Radicar Solicitud →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
