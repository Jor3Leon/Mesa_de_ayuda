import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

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

  const getStatusBadge = (status) => {
    const map = {
      NEW: { label: 'Nuevo / En Cola', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
      OPEN: { label: 'En Diagnóstico', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
      IN_PROGRESS: { label: 'En Atención Técnica', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
      RESOLVED: { label: 'Resuelto / Listo', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
      CLOSED: { label: 'Cerrado', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
    };
    const s = map[status] || { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    return (
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          padding: '0.25rem 0.65rem',
          borderRadius: '9999px',
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
        {s.label}
      </span>
    );
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
                Centro de Atención al Funcionario
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
                Autoservicio TIC
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Radica tus tickets de soporte tecnológico y consulta su estado en tiempo real.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#002D62',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: '1px solid rgba(0, 209, 255, 0.4)',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 45, 98, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Crear Solicitud
        </button>
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
        {/* KPI 1: Total */}
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mis Solicitudes
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '0.2rem' }}>
              Historial de radicados
            </div>
          </div>
        </div>

        {/* KPI 2: En Proceso */}
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
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              En Gestión Técnica
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.inProgress}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>
              En diagnóstico / atención
            </div>
          </div>
        </div>

        {/* KPI 3: Resueltas */}
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
              Resueltas & Listas
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.resolved}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>
              Cerradas satisfactoriamente
            </div>
          </div>
        </div>

        {/* KPI 4: Soporte */}
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Canal Prioritario
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              24/7
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>
              Mesa de Ayuda TIC
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

        {/* Live Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', maxWidth: '380px', minWidth: '220px', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
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
                  onClick={() => setSelectedTicket(t)}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
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
