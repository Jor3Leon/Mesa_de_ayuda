import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const STATUS_MAP = {
  NEW: { label: 'Nuevo', bg: '#fef3c7', color: '#b45309' },
  OPEN: { label: 'En Progreso', bg: '#e0f2fe', color: '#0369a1' },
  IN_PROGRESS: { label: 'En Progreso', bg: '#e0f2fe', color: '#0369a1' },
  SCHEDULED: { label: 'Programado', bg: '#fef3c7', color: '#b45309' },
  RESOLVED: { label: 'Resuelto', bg: '#dcfce7', color: '#15803d' },
  CLOSED: { label: 'Cerrado', bg: '#f1f5f9', color: '#475569' },
};

const PRIORITY_MAP = {
  ALTO: { label: 'Alto', color: '#dc2626', bg: '#fee2e2' },
  MEDIO: { label: 'Medio', color: '#0284c7', bg: '#e0f2fe' },
  BAJO: { label: 'Bajo', color: '#10b981', bg: '#dcfce7' },
  HIGH: { label: 'Alto', color: '#dc2626', bg: '#fee2e2' },
  MEDIUM: { label: 'Medio', color: '#0284c7', bg: '#e0f2fe' },
  LOW: { label: 'Bajo', color: '#10b981', bg: '#dcfce7' },
  CRITICAL: { label: 'Alto', color: '#dc2626', bg: '#fee2e2' },
  EMERGENCY: { label: 'Alto', color: '#dc2626', bg: '#fee2e2' },
};

export default function StandarUserPortal() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    ticketType: 'Incidencia',
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
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      await apiRequest('/tickets', {
        method: 'POST',
        body: {
          subject: form.title,
          description: form.description,
          ticketType: form.ticketType,
        },
      });
      setForm({ title: '', description: '', ticketType: 'Incidencia' });
      setShowModal(false);
      setFeedback('¡Tu solicitud ha sido radicada con éxito! Un técnico la atenderá en breve.');
      fetchTickets();
    } catch (err) {
      setError('Error al radicar solicitud: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: tickets.length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'OPEN' || t.status === 'NEW').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const isResolved = t.status === 'RESOLVED' || t.status === 'CLOSED';
      const isInProg = t.status === 'IN_PROGRESS' || t.status === 'OPEN' || t.status === 'NEW';
      const matchesFilter =
        statusFilter === 'ALL' ||
        (statusFilter === 'IN_PROGRESS' && isInProg) ||
        (statusFilter === 'RESOLVED' && isResolved);

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (t.subject || t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        String(t.id).includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [tickets, statusFilter, search]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO BANNER INSTITUCIONAL YOPAL */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #001D40 0%, #002D62 50%, #003A7A 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Centro de Atención al Funcionario
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Radica tus tickets de soporte tecnológico y consulta su estado en tiempo real.
            </p>
          </div>
        </div>
      </div>

      {/* 📊 ENTERPRISE KPI METRICS GRID */}
      {/* 📊 STATS CARDS */}
      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 135px), 1fr))',
          gap: '0.55rem',
          marginBottom: '1.15rem',
        }}
      >
        {/* KPI 1: Total */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.55rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #2563eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.12rem',
            minHeight: '54px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Mis Solicitudes
            </span>
            <span style={{ fontSize: '0.88rem', lineHeight: 1, opacity: 0.85 }}>📑</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.total}
            </strong>
            <span style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Historial
            </span>
          </div>
        </div>

        {/* KPI 2: En Proceso */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.55rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #d97706',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.12rem',
            minHeight: '54px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              En Gestión
            </span>
            <span style={{ fontSize: '0.88rem', lineHeight: 1, opacity: 0.85 }}>⚡</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.inProgress}
            </strong>
            <span style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              En atención
            </span>
          </div>
        </div>

        {/* KPI 3: Resueltas */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.55rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #059669',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.12rem',
            minHeight: '54px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Resueltas
            </span>
            <span style={{ fontSize: '0.88rem', lineHeight: 1, opacity: 0.85 }}>✅</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.resolved}
            </strong>
            <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Solucionadas
            </span>
          </div>
        </div>

        {/* KPI 4: Soporte */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.55rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #7c3aed',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.12rem',
            minHeight: '54px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Canal Mesa
            </span>
            <span style={{ fontSize: '0.88rem', lineHeight: 1, opacity: 0.85 }}>🛡️</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1, letterSpacing: '-0.02em' }}>
              24/7
            </strong>
            <span style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Soporte TIC
            </span>
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

      {/* 🧭 SEGMENTED NAVIGATION & SEARCH CONTROLS */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Filter Segmented Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            background: '#f1f5f9',
            padding: '0.35rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'ALL' ? '#ffffff' : 'transparent',
              color: statusFilter === 'ALL' ? '#0f172a' : '#64748b',
              fontWeight: statusFilter === 'ALL' ? '700' : '500',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'ALL' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Todas ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'IN_PROGRESS' ? '#ffffff' : 'transparent',
              color: statusFilter === 'IN_PROGRESS' ? '#0f172a' : '#64748b',
              fontWeight: statusFilter === 'IN_PROGRESS' ? '700' : '500',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'IN_PROGRESS' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⏳ En Proceso ({stats.inProgress})
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'RESOLVED' ? '#ffffff' : 'transparent',
              color: statusFilter === 'RESOLVED' ? '#0f172a' : '#64748b',
              fontWeight: statusFilter === 'RESOLVED' ? '700' : '500',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'RESOLVED' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ✓ Resueltas ({stats.resolved})
          </button>
        </div>

        {/* Live Search & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', maxWidth: '540px', minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar en mis solicitudes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.85rem',
                color: '#1e293b',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#002D62',
              color: '#ffffff',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.82rem',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 45, 98, 0.25)',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Crear Solicitud
          </button>
        </div>
      </div>

      {/* 📦 LIST OF REQUESTS */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
          Mis Radicados de Soporte ({filteredTickets.length})
        </h3>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando solicitudes...</div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b' }}>No tienes tickets registrados</h4>
            <p style={{ color: '#64748b', margin: '0 0 1.25rem 0', fontSize: '0.875rem' }}>
              Si tienes una incidencia técnica o deseas radicar una solicitud, crea un ticket de atención.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              + Radicar Ticket
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredTickets.map((t) => {
              const statusInfo = STATUS_MAP[t.status] || { label: t.status, bg: '#f1f5f9', color: '#475569' };
              const priorityInfo = PRIORITY_MAP[t.priority] || { label: t.priority, color: '#64748b' };
              const isIncidencia = t.ticketType === 'Incidencia';

              return (
                <div
                  key={t.id}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>#{t.id}</span>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: isIncidencia ? '#fef2f2' : '#eff6ff',
                          color: isIncidencia ? '#ef4444' : '#2563eb',
                        }}
                      >
                        {isIncidencia ? '🚨 Incidencia' : '📋 Solicitud'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: priorityInfo.bg || '#e0f2fe',
                          color: priorityInfo.color || '#0284c7',
                        }}
                      >
                        {priorityInfo.label || 'Medio'}
                      </span>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#0f172a', lineHeight: '1.3' }}>
                    {t.title}
                  </h4>

                  <p style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {t.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: statusInfo.bg,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 MODAL DE CREACIÓN DE TICKET */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '550px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  Radicar Nuevo Ticket
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Selecciona si reportas una Incidencia o una Solicitud técnica
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontWeight: '700',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Tipo de Ticket *
                </label>
                <select
                  value={form.ticketType}
                  onChange={(e) => setForm({ ...form, ticketType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                >
                  <option value="Incidencia">🚨 Incidencia</option>
                  <option value="Solicitud">📋 Solicitud</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Asunto Breve *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Impresora en Oficina de Contratación no responde"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Descripción Detallada *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Indica qué sucede, en qué oficina te encuentras y cualquier detalle que ayude al técnico..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                  }}
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
