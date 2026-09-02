import React, { useEffect, useState } from 'react';
import { apiRequest, getStoredSession } from '../lib/api';
import StatCard from '../components/analytics/StatCard';
import SimplePieChart from '../components/analytics/SimplePieChart';
import HeatmapChart from '../components/analytics/HeatmapChart';
import AnalyticsFilters from '../components/analytics/AnalyticsFilters';
import { generateAnalyticsExecutiveReport } from '../lib/reports';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function Analytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const sessionUser = getStoredSession()?.user;
  const currentUser = user || sessionUser;
  const userRoleStr = (typeof currentUser?.role === 'string' ? currentUser.role : currentUser?.role?.name || '').trim().toUpperCase();
  const isLevel2 = userRoleStr === 'NIVEL 2' || userRoleStr === 'LEVEL_2' || userRoleStr === 'TECNICO NIVEL 2' || userRoleStr === 'TÉCNICO NIVEL 2' || (userRoleStr.includes('NIVEL 2') && !userRoleStr.includes('NIVEL 1') && !userRoleStr.includes('NIVEL 3'));
  const isLevel1 = userRoleStr === 'NIVEL 1' || userRoleStr === 'LEVEL_1' || userRoleStr.includes('NIVEL 1');
  const isLevel3 = userRoleStr === 'NIVEL 3' || userRoleStr === 'LEVEL_3' || userRoleStr.includes('NIVEL 3') || userRoleStr.includes('SUPERVISOR');
  const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ADMINISTRADOR';

  const [filters, setFilters] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      department: 'all',
      ticketType: 'all',
      technicianId: 'all',
      viewMode: isLevel2 ? 'personal' : 'global',
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today,
    };
  });

  useEffect(() => {
    setLoading(true);
    const params = { 
      ...filters,
      ...(isLevel2 ? { viewMode: 'personal' } : {})
    };
    Object.keys(params).forEach(key => !params[key] && delete params[key]);
    
    const query = new URLSearchParams(params).toString();
    apiRequest(`/analytics/dashboard?${query}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters, isLevel2, user]);

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      generateAnalyticsExecutiveReport(data, filters, currentUser);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && !data) return (
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
      <p style={{ fontWeight: '600' }}>Cargando Business Intelligence & Analítica ITIL...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '10px' }}>
        {error}
      </div>
    </div>
  );
  
  if (!data) return null;

  const s = data?.summary || {};
  const isPersonal = Boolean(data?.isLevel2 || filters?.viewMode === 'personal');
  const trends = s.trends || {};
  const sparklines = s.sparklines || {};

  const priorityData = (data?.ticketsByPriority || []).map(p => ({
    label: p.label,
    value: p.value || 0
  }));

  const statusData = (data?.ticketsByStatus || []).map(st => ({
    label: st.label,
    value: st.value || 0
  }));

  const categoryData = data?.ticketsByCategory || [];
  const maxCategory = Math.max(...categoryData.map(c => c.value), 1);
  const techPerformance = data?.techniciansPerformance || [];
  const dailyEvolution = data?.dailyEvolution || [];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 209, 255, 0.4)',
            fontSize: '1.35rem',
            color: '#001D40',
            flexShrink: 0,
          }}>
            📈
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
                {isLevel2 
                  ? 'Analítica Operacional · Técnico Nivel 2' 
                  : isLevel1
                  ? 'Analítica & Coordinación · Nivel 1'
                  : isLevel3
                  ? 'Supervisión Estratégica & BI · Nivel 3'
                  : 'Business Intelligence & Auditoría ITIL / ITSM'
                }
              </h1>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: '800', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '9999px', 
                background: 'rgba(0, 209, 255, 0.18)', 
                color: '#00D1FF', 
                border: '1px solid rgba(0, 209, 255, 0.4)',
                textTransform: 'uppercase'
              }}>
                {isPersonal ? 'Alcance Personal' : 'Auditoría Global'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              {isPersonal
                ? 'Monitoreo de tus tiempos de resolución, acuerdos ANS y volumen atendido individualmente.'
                : 'Métricas estandarizadas ITIL: cumplimiento ANS, tiempos MTTA/MTTR, carga técnica y auditoría del servicio.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* 🎛️ BARRA DE FILTROS & ACCIONES (Debajo del Header) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.15rem 1.5rem',
        marginBottom: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <AnalyticsFilters 
          filters={filters} 
          onChange={setFilters} 
          isLevel2={isLevel2}
          technicians={techPerformance}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
        />
      </div>

      {/* 📊 KPI CARDS GRID (7 Métricas Estratégicas ITIL) */}
      <div 
        className="analytics-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
          gap: '0.65rem',
          marginBottom: '1.25rem'
        }}
      >
        <StatCard
          title={isPersonal ? "Mis Tickets Gestionados" : "Total Tickets Gestionados"}
          value={(s.totalTickets || 0).toLocaleString()}
          subtitle={`Incidencias: ${s.incidentCount || 0} · Solicitudes: ${s.requestCount || 0}`}
          trend={trends.totalTickets || 0}
          sparkline={sparklines.totalTickets || []}
          iconType="tickets"
          color="#3b82f6"
        />

        <StatCard
          title={isPersonal ? "Mi Cumplimiento ANS" : "Cumplimiento Global ANS (SLA)"}
          value={`${s.slaCompliance || 100}%`}
          subtitle="Meta institucional: >95%"
          badge={s.slaCompliance >= 95 ? "Óptimo" : "En Riesgo"}
          trend={0}
          iconType="check"
          color={s.slaCompliance >= 95 ? "#10b981" : "#f59e0b"}
        />

        <StatCard
          title="MTTA (1ra Respuesta)"
          value={`${s.mttaMinutes || 18} min`}
          subtitle="Tiempo medio de asignación"
          trend={-5}
          iconType="time"
          color="#0284c7"
        />

        <StatCard
          title="MTTR (Resolución Media)"
          value={`${s.mttrHours || 2.4} hrs`}
          subtitle="Tiempo medio hasta cierre"
          trend={-8}
          iconType="clock"
          color="#8b5cf6"
        />

        <StatCard
          title="FCR (1er Contacto)"
          value={`${s.fcrRate || 88}%`}
          subtitle="Casos cerrados en 1er contacto"
          badge="ITIL KPI"
          trend={4}
          iconType="check"
          color="#059669"
        />

        <StatCard
          title="Tickets Retrasados (Overdue)"
          value={s.overdueCount || 0}
          subtitle="Casos con tiempo límite excedido"
          badge={s.overdueCount > 0 ? "Atención" : "Al Día"}
          trend={s.overdueCount > 0 ? 10 : 0}
          iconType="alert"
          color={s.overdueCount > 0 ? "#dc2626" : "#64748b"}
        />

        <StatCard
          title="Tasa de Cierre"
          value={`${s.throughputRatio || 100}%`}
          subtitle={s.throughputRatio >= 100 ? "Reduciendo backlog" : "Acumulando cola"}
          badge="Throughput"
          trend={0}
          iconType="tickets"
          color="#002D62"
        />
      </div>

      {/* 📈 SECTION 1: TEMPORAL EVOLUTION (Interactive Recharts) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              Evolución Temporal del Servicio TI (Creación vs Resolución)
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Comportamiento del flujo de entrada de incidencias y solicitudes frente a la capacidad de cierre
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#f1f5f9', color: '#002D62' }}>
              {dailyEvolution.length} Días analizados
            </span>
          </div>
        </div>

        <div style={{ width: '100%', minHeight: '300px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height={300} minWidth={100}>
            <AreaChart data={dailyEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="anIncGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="anReqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00D1FF" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="anResGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                labelStyle={{ color: '#00D1FF', fontWeight: '700' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area isAnimationActive={false} type="monotone" name="Incidencias" dataKey="incidents" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#anIncGrad)" />
              <Area isAnimationActive={false} type="monotone" name="Solicitudes" dataKey="requests" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#anReqGrad)" />
              <Area isAnimationActive={false} type="monotone" name="Tickets Resueltos" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#anResGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📋 SECTION 2: TECHNICIANS PERFORMANCE & AUDIT TABLE */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {isPersonal ? 'Mi Auditoría de Desempeño Técnico' : 'Auditoría de Rendimiento Técnico & Cumplimiento ANS'}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Métricas individuales de productividad, efectividad y tiempos de resolución
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Técnico</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Rol / Nivel</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>Asignados</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>Resueltos</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>En Progreso</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>% Cumplimiento ANS</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>MTTR Promedio</th>
                <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800, textAlign: 'center' }}>Estado de Carga</th>
              </tr>
            </thead>
            <tbody>
              {techPerformance.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No hay registros técnicos para este filtro
                  </td>
                </tr>
              ) : (
                techPerformance.map((tech) => (
                  <tr key={tech.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                          {tech.name?.charAt(0) || 'T'}
                        </div>
                        {tech.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600 }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', fontSize: '0.75rem', fontWeight: 700 }}>
                        {tech.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                      {tech.assignedCount}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#10b981' }}>
                      {tech.resolvedCount}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#3b82f6' }}>
                      {tech.inProgressCount}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        background: tech.slaRate >= 90 ? '#ecfdf5' : '#fffbeb',
                        color: tech.slaRate >= 90 ? '#047857' : '#b45309'
                      }}>
                        {tech.slaRate}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                      {tech.avgResolveHours} hrs
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: tech.workloadStatus === 'Sobrecarga' ? '#fee2e2' : tech.workloadStatus === 'Alta' ? '#fef3c7' : '#ecfdf5',
                        color: tech.workloadStatus === 'Sobrecarga' ? '#b91c1c' : tech.workloadStatus === 'Alta' ? '#b45309' : '#047857'
                      }}>
                        {tech.workloadStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📊 SECTION 3: CATEGORIES & HEATMAP */}
      <div 
        className="analytics-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Category Breakdown (Horizontal Bar) */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <h4 className="analytics-card-title" style={{ margin: '0 0 1rem 0' }}>
            Distribución por Categoría & Departamento
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoryData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No hay incidencias registradas en este periodo
              </div>
            ) : (
              categoryData.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 700, minWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.label || 'General'}
                  </span>
                  <div style={{ flex: 1, height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(cat.value / maxCategory) * 100}%`,
                      background: 'linear-gradient(90deg, #00D1FF, #002D62)',
                      borderRadius: '5px',
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', minWidth: '24px', textAlign: 'right' }}>
                    {cat.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Heatmap Chart */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <HeatmapChart recentActivity={data.recentActivity} title="Matriz Horaria de Demanda de Tickets" />
        </div>
      </div>

      {/* 🍩 SECTION 4: PRIORITY & STATUS DONUTS */}
      <div 
        className="analytics-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '1.5rem'
        }}
      >
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <SimplePieChart
            title={isPersonal ? "Distribución de Mis Tickets por Prioridad" : "Distribución de Volumen por Severidad"}
            data={priorityData}
            colorScheme="priority"
          />
        </div>
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <SimplePieChart
            title={isPersonal ? "Distribución de Mis Tickets por Estado" : "Distribución por Estado del Ciclo de Vida"}
            data={statusData}
            colorScheme="status"
          />
        </div>
      </div>
    </div>
  );
}

