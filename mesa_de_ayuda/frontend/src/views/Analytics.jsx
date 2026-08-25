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
    // Remove empty values
    Object.keys(params).forEach(key => !params[key] && delete params[key]);
    
    const query = new URLSearchParams(params).toString();
    apiRequest(`/analytics/dashboard?${query}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  if (loading && !data) return (
    <div style={{
      padding: '80px 40px',
      textAlign: 'center',
      color: '#94a3b8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div className="spinner"></div>
      <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Cargando inteligencia operativa...</p>
    </div>
  );

  if (error) return <div className="feedback error">{error}</div>;
  if (!data) return null;

  // Transform data for charts
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
    <div className="analytics-page view-container animate-fade-in">
      {/* ─── Header Section ─── */}
      <div className="analytics-header-section">
        <div className="analytics-header-info">
          <h1 className="analytics-title">
            Analítica Operacional
          </h1>
          <p className="analytics-subtitle muted-text">
            Esta vista consolida datos reales de tickets, activos y clientes para
            priorizar carga, capacidad y salud del servicio.
          </p>
        </div>

        <AnalyticsFilters filters={filters} onChange={setFilters} />
      </div>

      {/* ─── KPI Cards Row ─── */}
      <div className="analytics-kpi-grid">
        <StatCard
          title="Total Tickets"
          value={(data?.summary?.totalTickets || 0).toLocaleString()}
          trend={trends.totalTickets || 0}
          sparkline={sparklines.totalTickets || []}
          iconType="tickets"
          color="#3b82f6"
        />
        <StatCard
          title="Abiertos"
          value={data?.summary?.openTickets || 0}
          trend={trends.openTickets || 0}
          sparkline={sparklines.openTickets || []}
          iconType="clock"
          color="#ef4444"
        />
        <StatCard
          title="Cumplimiento SLA"
          value={`${data?.summary?.slaCompliance || 0}%`}
          trend={0}
          iconType="check"
          color="#22c55e"
        />
        <StatCard
          title="Salud de Activos"
          value={`${assetHealth || 0}%`}
          trend={0}
          iconType="monitor"
          color="#3b82f6"
        />
      </div>

      {/* ─── Middle Row: Heatmap + Workload ─── */}
      <div className="analytics-charts-grid">
        <HeatmapChart recentActivity={data.recentActivity} />
        <SimpleBarChart
          title="Carga por Técnico (Tickets Activos)"
          data={workloadData}
          color="#3b82f6"
        />
      </div>

      {/* ─── Bottom Row: Priority + Status Donuts ─── */}
      <div className="analytics-charts-grid">
        <SimplePieChart
          title="Distribución por Prioridad"
          data={priorityData}
          colorScheme="priority"
        />
        <SimplePieChart
          title="Estado de Tickets"
          data={statusData}
          colorScheme="status"
        />
      </div>
    </div>
  );
}
