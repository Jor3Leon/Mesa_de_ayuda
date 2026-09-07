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
          // Si el usuario actual está en la lista de técnicos, seleccionarlo por defecto
          const isMe = list.find(t => Number(t.id) === Number(currentUser?.id));
          setSelectedTechId(isMe ? isMe.id : list[0].id);
        }
      })
      .catch((err) => {
        setError(err.message || 'Error cargando técnicos autorizados.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser?.id]);

  // 2. Cargar los 8 indicadores del técnico seleccionado
  useEffect(() => {
    if (!selectedTechId) return;

    setLoadingMetrics(true);
    setError(null);
    const query = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
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
  }, [selectedTechId, dateRange]);

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

  // Gráficos complementarios derivados de los tickets del técnico
  const priorityDistribution = useMemo(() => {
    const map = {};
    (data?.tickets || []).forEach(t => {
      const p = t.priority || 'MEDIO';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data?.tickets]);

  const statusDistribution = useMemo(() => {
    const map = {};
    (data?.tickets || []).forEach(t => {
      const s = t.status || 'OPEN';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data?.tickets]);

  const timelineData = useMemo(() => {
    const map = {};
    (data?.tickets || []).forEach(t => {
      const d = new Date(t.createdAt).toISOString().split('T')[0];
      if (!map[d]) map[d] = { date: d, asignados: 0, resueltos: 0 };
      map[d].asignados++;
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        map[d].resueltos++;
      }
    });
    return Object.keys(map).sort().map(k => map[k]);
  }, [data?.tickets]);

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
      
      {/* HEADER PRINCIPAL */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.2rem 1.5rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#001D40', letterSpacing: '-0.02em' }}>
              Analítica de Desempeño Individual
            </h1>
            {tech.name && (
              <span style={{
                background: 'linear-gradient(135deg, rgba(0, 45, 98, 0.08) 0%, rgba(0, 209, 255, 0.15) 100%)',
                color: '#002D62',
                border: '1px solid rgba(0, 209, 255, 0.4)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>👤</span>
                <span>Desempeño de: <strong>{tech.name}</strong></span>
                <span style={{
                  background: '#002D62',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}>
                  {tech.role}
                </span>
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: '#64748b' }}>
            Indicadores operativos y de calidad según Acuerdos de Nivel de Servicio (ANS).
          </p>
        </div>

        {/* CONTROLES: SELECTOR DE TÉCNICO + FECHAS + EXPORTAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* SELECTOR DE TÉCNICO (Solo visible si tiene subordinados o más de 1 técnico autorizado) */}
          {technicians.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Técnico Supervisado
              </label>
              <select
                value={selectedTechId || ''}
                onChange={(e) => setSelectedTechId(Number(e.target.value))}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '220px'
                }}
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.role})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#334155',
              fontWeight: 600
            }}>
              <span>🔒 Vista Personal:</span>
              <span>{tech.name || currentUser?.name}</span>
            </div>
          )}

          {/* RANGO DE FECHAS */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Desde
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Hasta
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* BOTÓN EXPORTAR PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting || loadingMetrics}
            style={{
              alignSelf: 'flex-end',
              background: 'linear-gradient(135deg, #00D1FF 0%, #0099ff 100%)',
              color: '#001D40',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 209, 255, 0.3)',
              transition: 'transform 0.15s ease',
              height: '35px'
            }}
          >
            {isExporting ? 'Generando...' : '📑 Exportar Informe (PDF)'}
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
            📋 Tickets Asignados al Técnico ({data?.tickets?.length || 0})
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Mostrando casos asignados en el rango seleccionado
          </span>
        </div>

        {(!data?.tickets || data.tickets.length === 0) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            El técnico no tiene tickets asignados en las fechas seleccionadas.
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
                {data.tickets.map((t) => (
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
