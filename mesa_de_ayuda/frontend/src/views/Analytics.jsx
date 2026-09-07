import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest, getStoredSession } from '../lib/api';
import StatCard from '../components/analytics/StatCard';
import AnsBadge from '../components/tickets/AnsBadge';
import { generateAnalyticsExecutiveReport } from '../lib/reports';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#001D40',
      border: '1px solid rgba(0, 209, 255, 0.45)',
      borderRadius: '8px',
      padding: '8px 12px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
      fontSize: '12px',
      minWidth: '130px'
    }}>
      <div style={{ color: '#00D1FF', fontWeight: 800, marginBottom: '6px', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '3px' }}>
        {label}
      </div>
      {payload.map((item, idx) => {
        let dotColor = item.color || item.fill || item.stroke;
        if (dotColor === '#002D62') dotColor = '#00D1FF';
        if (dotColor === '#64748b') dotColor = '#94a3b8';
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', margin: '3px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 6px ${dotColor}` }} />
              <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 500 }}>
                {item.name}:
              </span>
            </div>
            <strong style={{ color: '#ffffff', fontSize: '12px', fontWeight: 800 }}>
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

const PIE_COLORS = ['#00D1FF', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#dc2626'];

export default function Analytics({ user }) {
  const sessionUser = getStoredSession()?.user;
  const currentUser = user || sessionUser;

  const [technicians, setTechnicians] = useState([]);
  const [selectedTechId, setSelectedTechId] = useState(null);
  const [ticketType, setTicketType] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today,
    };
  });

  // 1. Cargar la lista de técnicos accesibles según jerarquía desde el backend
  useEffect(() => {
    setLoading(true);
    apiRequest('/analytics/technicians')
      .then((techList) => {
        const list = Array.isArray(techList) ? techList : [];
        setTechnicians(list);
        if (list.length > 0) {
          // Si tiene más de 1 técnico accesible, permitir ver todos por defecto o individual
          if (list.length > 1) {
            setSelectedTechId('all');
          } else {
            const isMe = list.find(t => Number(t.id) === Number(currentUser?.id));
            setSelectedTechId(isMe ? String(isMe.id) : String(list[0].id));
          }
        }
      })
      .catch((err) => {
        setError(err.message || 'Error cargando técnicos autorizados.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser?.id]);

  // 2. Cargar los indicadores del técnico seleccionado (o todos)
  useEffect(() => {
    if (!selectedTechId) return;

    setLoadingMetrics(true);
    setError(null);
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...(ticketType && ticketType !== 'all' ? { ticketType } : {})
    }).toString();

    apiRequest(`/analytics/technician/${selectedTechId}?${query}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || 'Error obteniendo métricas del técnico.');
      })
      .finally(() => {
        setLoadingMetrics(false);
      });
  }, [selectedTechId, dateRange, ticketType]);

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      generateAnalyticsExecutiveReport(data, dateRange, currentUser);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Filtrado reactivo de tickets según Tipo de Ticket
  const filteredTickets = useMemo(() => {
    const raw = data?.tickets || [];
    if (!ticketType || ticketType === 'all') return raw;
    return raw.filter(t => (t.ticketType || 'Incidencia') === ticketType);
  }, [data?.tickets, ticketType]);

  // Gráficos complementarios derivados de los tickets del técnico
  const priorityDistribution = useMemo(() => {
    const map = {};
    filteredTickets.forEach(t => {
      const p = t.priority || 'MEDIO';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const statusDistribution = useMemo(() => {
    const map = {};
    filteredTickets.forEach(t => {
      const s = t.status || 'OPEN';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const timelineData = useMemo(() => {
    const map = {};
    filteredTickets.forEach(t => {
      const d = new Date(t.createdAt).toISOString().split('T')[0];
      if (!map[d]) map[d] = { date: d, asignados: 0, resueltos: 0 };
      map[d].asignados++;
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        map[d].resueltos++;
      }
    });
    return Object.keys(map).sort().map(k => map[k]);
  }, [filteredTickets]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#00D1FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem auto'
        }} />
        <p style={{ fontWeight: '600' }}>Cargando Analítica de Desempeño Individual...</p>
      </div>
    );
  }

  const bA = data?.bloqueA || {};
  const bB = data?.bloqueB || {};
  const mtta = bB?.mtta || { p50: 0, p90: 0, avg: 0 };
  const mttr = bB?.mttr || { p50: 0, p90: 0, avg: 0 };
  const ans = bB?.ansCompliance || { response: 100, resolution: 100, global: 100 };
  const tech = data?.technician || technicians.find(t => Number(t.id) === Number(selectedTechId)) || {};

  return (
    <div className="analytics-view-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 🌟 1. HERO HEADER (Exacto a Dashboard) */}
      <div className="dashboard-hero-header" style={{
        background: 'linear-gradient(135deg, #001D40 0%, #002D62 50%, #083b75 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        marginBottom: '1.25rem',
        boxShadow: '0 10px 25px -5px rgba(0, 45, 98, 0.35)',
        border: '1px solid rgba(0, 209, 255, 0.25)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div className="dashboard-hero-icon" style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0, 209, 255, 0.4)',
          fontSize: '1.5rem',
          color: '#001D40',
          flexShrink: 0
        }}>
          📊
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 className="dashboard-hero-title" style={{ fontSize: '1.55rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Analítica de Desempeño
            </h1>
            {selectedTechId === 'all' ? (
              <span style={{
                background: 'rgba(0, 209, 255, 0.15)',
                color: '#00D1FF',
                border: '1px solid rgba(0, 209, 255, 0.35)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                🌐 Todos los Técnicos
              </span>
            ) : tech?.name ? (
              <span style={{
                background: 'rgba(0, 209, 255, 0.15)',
                color: '#00D1FF',
                border: '1px solid rgba(0, 209, 255, 0.35)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>👤</span>
                <span>{tech.name}</span>
                {tech.role && (
                  <span style={{
                    background: '#002D62',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    textTransform: 'uppercase'
                  }}>
                    {tech.role}
                  </span>
                )}
              </span>
            ) : null}
          </div>
          <p className="dashboard-hero-subtitle" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
            Indicadores operativos, métricas de rendimiento y control de Acuerdos de Nivel de Servicio (ANS).
          </p>
        </div>
      </div>

      {/* 🎛️ 2. BARRA DE HERRAMIENTAS & FILTROS (Idéntica a Dashboard) */}
      <div className="dashboard-toolbar-container" style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.15rem 1.5rem',
        marginBottom: '1.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px' }}>
          {/* Rango de Fechas: Desde */}
          <div>
            <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Desde
            </span>
            <input
              type="date"
              className="dashboard-toolbar-input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              style={{
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Rango de Fechas: Hasta */}
          <div>
            <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Hasta
            </span>
            <input
              type="date"
              className="dashboard-toolbar-input"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              style={{
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Tipo de Ticket */}
          <div>
            <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Tipo de Ticket
            </span>
            <select
              className="dashboard-toolbar-select"
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              style={{
                padding: '7px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '220px'
              }}
            >
              <option value="all">Todos (Incidencias & Solicitudes)</option>
              <option value="Incidencia">Incidencias</option>
              <option value="Solicitud">Solicitudes</option>
            </select>
          </div>

          {/* Técnico */}
          <div>
            <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Técnico
            </span>
            <select
              className="dashboard-toolbar-select"
              value={selectedTechId || ''}
              disabled={technicians.length <= 1}
              onChange={(e) => setSelectedTechId(e.target.value)}
              style={{
                padding: '7px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: technicians.length <= 1 ? 'not-allowed' : 'pointer',
                minWidth: '220px',
                opacity: technicians.length <= 1 ? 0.85 : 1
              }}
            >
              {technicians.length > 1 && (
                <option value="all">Todos los Técnicos</option>
              )}
              {technicians.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  👤 {t.name} ({t.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón Exportar PDF en la misma fila */}
        <div>
          <button
            type="button"
            className="dashboard-export-btn"
            onClick={handleExportPdf}
            disabled={isExporting || loadingMetrics}
            style={{
              background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
              color: '#001D40',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: (isExporting || loadingMetrics) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 209, 255, 0.35)',
              transition: 'transform 0.15s ease',
              height: '36px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => !isExporting && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => !isExporting && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isExporting ? 'Generando PDF...' : '📄 Exportar Informe (PDF)'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loadingMetrics && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
          Actualizando métricas de {tech.name}...
        </div>
      )}

      {/* BLOQUE A — CONTEOS OPERATIVOS DEL TÉCNICO */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bloque A — Conteos Operativos del Técnico
          </span>
          <span style={{ height: '1px', flex: 1, background: '#e2e8f0' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          {/* Indicador 1: Tickets Asignados */}
          <StatCard
            title="Tickets Asignados"
            value={bA.assigned ?? 0}
            subtitle="Carga total recibida"
            iconType="tickets"
            color="#2563eb"
          />

          {/* Indicador 2: Tickets Resueltos */}
          <StatCard
            title="Tickets Resueltos"
            value={bA.resolved ?? 0}
            subtitle="Resueltos & Cerrados"
            iconType="check"
            color="#10b981"
          />

          {/* Indicador 3: Tickets Programados */}
          <StatCard
            title="Tickets Programados"
            value={bA.scheduled ?? 0}
            subtitle="Visitas o agenda"
            iconType="monitor"
            color="#6366f1"
          />

          {/* Indicador 4: Tickets No Resueltos */}
          <StatCard
            title="Tickets No Resueltos"
            value={bA.unresolved ?? 0}
            subtitle="Activos en gestión"
            iconType="clock"
            color="#f59e0b"
          />

          {/* Indicador 5: Tickets Tardíos */}
          <StatCard
            title="Tickets Tardíos"
            value={bA.overdue ?? 0}
            subtitle="Fuera de límite ANS"
            iconType="alert"
            color="#dc2626"
            badge={bA.overdue > 0 ? 'Vencido' : 'Al Día'}
          />
        </div>
      </div>

      {/* BLOQUE B — DESEMPEÑO Y CUMPLIMIENTO ANS DEL TÉCNICO */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bloque B — Velocidad de Atención & Acuerdos de Nivel de Servicio (ANS)
          </span>
          <span style={{ height: '1px', flex: 1, background: '#e2e8f0' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          {/* Indicador 6: MTTA */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #0284c7',
            borderRadius: '10px',
            padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                MTTA (Tiempo Primera Respuesta)
              </span>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: '#001D40' }}>
                {mtta.p50 ?? 0} min
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>Mediana (P50)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px' }}>
              <span>P90: <strong>{mtta.p90 ?? 0} min</strong></span>
              <span>Promedio: <strong>{mtta.avg ?? 0} min</strong></span>
            </div>
          </div>

          {/* Indicador 7: MTTR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #0d9488',
            borderRadius: '10px',
            padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                MTTR (Tiempo Medio de Resolución)
              </span>
              <span style={{ fontSize: '1.1rem' }}>⏱️</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: '#001D40' }}>
                {mttr.p50 ?? 0} hrs
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600 }}>Mediana (P50)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px' }}>
              <span>P90: <strong>{mttr.p90 ?? 0} hrs</strong></span>
              <span>Promedio: <strong>{mttr.avg ?? 0} hrs</strong></span>
            </div>
          </div>

          {/* Indicador 8: Cumplimiento ANS */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${ans.global >= 90 ? '#16a34a' : '#dc2626'}`,
            borderRadius: '10px',
            padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Cumplimiento ANS Individual
              </span>
              <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <strong style={{ fontSize: '1.6rem', fontWeight: 800, color: ans.global >= 90 ? '#16a34a' : '#dc2626' }}>
                {ans.global ?? 100}%
              </strong>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: ans.global >= 95 ? '#dcfce7' : (ans.global >= 80 ? '#fef9c3' : '#fee2e2'),
                color: ans.global >= 95 ? '#166534' : (ans.global >= 80 ? '#854d0e' : '#991b1b')
              }}>
                {ans.global >= 95 ? 'Cumplimiento Óptimo' : (ans.global >= 80 ? 'Aceptable' : 'Riesgo Crítico')}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px' }}>
              <span>Respuesta: <strong>{ans.response ?? 100}%</strong></span>
              <span>Solución: <strong>{ans.resolution ?? 100}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICOS COMPLEMENTARIOS DEL TÉCNICO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Evolución Diaria del Técnico */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#002D62' }}>
            📈 Actividad del Técnico en el Período
          </h3>
          <div style={{ height: '220px', width: '100%' }}>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorAsignados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResueltos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="asignados" name="Asignados" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAsignados)" />
                  <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResueltos)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.85rem' }}>
                Sin actividad registrada en este rango de fechas.
              </div>
            )}
          </div>
        </div>

        {/* Casos por Prioridad del Técnico */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#002D62' }}>
            🎯 Casos por Prioridad
          </h3>
          <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {priorityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin tickets asignados en el período.</div>
            )}
          </div>
        </div>

        {/* Casos por Estado del Técnico */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#002D62' }}>
            📊 Casos por Estado
          </h3>
          <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin tickets en este período.</div>
            )}
          </div>
        </div>
      </div>

      {/* LISTADO DE TICKETS DEL TÉCNICO */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#002D62' }}>
            📋 Tickets del Técnico ({filteredTickets.length})
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Mostrando casos correspondientes a los filtros seleccionados
          </span>
        </div>

        {(!filteredTickets || filteredTickets.length === 0) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            No hay tickets asignados para los criterios seleccionados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>ID</th>
                  <th style={{ padding: '10px 12px' }}>Título</th>
                  <th style={{ padding: '10px 12px' }}>Tipo</th>
                  <th style={{ padding: '10px 12px' }}>Prioridad</th>
                  <th style={{ padding: '10px 12px' }}>Estado</th>
                  <th style={{ padding: '10px 12px' }}>Acuerdo ANS</th>
                  <th style={{ padding: '10px 12px' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#002D62' }}>#{t.id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{t.title}</td>
                    <td style={{ padding: '10px 12px' }}>{t.ticketType || 'Incidencia'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: t.priority === 'ALTO' || t.priority === 'URGENTE' ? '#fee2e2' : '#f1f5f9',
                        color: t.priority === 'ALTO' || t.priority === 'URGENTE' ? '#b91c1c' : '#475569'
                      }}>
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: t.status === 'RESOLVED' || t.status === 'CLOSED' ? '#dcfce7' : '#e0f2fe',
                        color: t.status === 'RESOLVED' || t.status === 'CLOSED' ? '#15803d' : '#0369a1'
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <AnsBadge ticket={t} />
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
