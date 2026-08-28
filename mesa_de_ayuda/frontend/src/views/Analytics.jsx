import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import StatCard from '../components/analytics/StatCard';
import SimpleBarChart from '../components/analytics/SimpleBarChart';
import SimplePieChart from '../components/analytics/SimplePieChart';
import HeatmapChart from '../components/analytics/HeatmapChart';
import AnalyticsFilters from '../components/analytics/AnalyticsFilters';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      department: 'all',
      viewMode: 'global',
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today,
    };
  });

  useEffect(() => {
    setLoading(true);
    const params = { ...filters };
    Object.keys(params).forEach(key => !params[key] && delete params[key]);
    
    const query = new URLSearchParams(params).toString();
    apiRequest(`/analytics/dashboard?${query}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  if (loading && !data) return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem auto'
      }} />
      <p style={{ fontWeight: '600' }}>Cargando Business Intelligence & Analítica...</p>
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

  const priorityData = (data?.ticketsByPriority || []).map(p => ({
    label: p.priority,
    value: p._count?.id || 0
  }));

  const statusData = (data?.ticketsByStatus || []).map(s => ({
    label: s.status,
    value: s._count?.id || 0
  }));

  const workloadData = (data?.techWorkload || []).map(t => ({
    label: `${t.name?.split(' ')[0] || 'Técnico'} (${t.count || 0})`,
    value: t.count || 0
  }));

  const assetHealth = data?.summary?.totalAssets > 0
    ? Math.round((data.summary.onlineAssets / data.summary.totalAssets) * 100)
    : 0;

  const trends = data?.summary?.trends || {};
  const sparklines = data?.summary?.sparklines || {};

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
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
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            fontSize: '1.25rem'
          }}>
            📊
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Analítica Operacional & BI
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                ITIL Metrics
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Indicadores de carga técnica, cumplimiento de acuerdos ANS y salud del parque tecnológico.
            </p>
          </div>
        </div>

        <AnalyticsFilters filters={filters} onChange={setFilters} />
      </div>

      {/* 📊 KPI CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        <StatCard
          title="Total Tickets"
          value={(data?.summary?.totalTickets || 0).toLocaleString()}
          trend={trends.totalTickets || 0}
          sparkline={sparklines.totalTickets || []}
          iconType="tickets"
          color="#3b82f6"
        />
        <StatCard
          title="Incidentes Abiertos"
          value={data?.summary?.openTickets || 0}
          trend={trends.openTickets || 0}
          sparkline={sparklines.openTickets || []}
          iconType="clock"
          color="#ef4444"
        />
        <StatCard
          title="Cumplimiento ANS"
          value={`${data?.summary?.slaCompliance || 0}%`}
          trend={0}
          iconType="check"
          color="#10b981"
        />
        <StatCard
          title="Disponibilidad Hardware"
          value={`${assetHealth || 0}%`}
          trend={0}
          iconType="monitor"
          color="#6366f1"
        />
      </div>

      {/* 📈 HEATMAP & WORKLOAD */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.75rem'
      }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <HeatmapChart recentActivity={data.recentActivity} />
        </div>
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <SimpleBarChart
            title="Carga de Trabajo por Técnico"
            data={workloadData}
            color="#2563eb"
          />
        </div>
      </div>

      {/* 🍩 PRIORITY & STATUS DONUTS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem'
      }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <SimplePieChart
            title="Distribución por Prioridad"
            data={priorityData}
            colorScheme="priority"
          />
        </div>
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <SimplePieChart
            title="Distribución por Estado Operativo"
            data={statusData}
            colorScheme="status"
          />
        </div>
      </div>
    </div>
  );
}
