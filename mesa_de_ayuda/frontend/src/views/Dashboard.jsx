import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { generateDashboardReport } from '../lib/reports';
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

const initialData = {
  global: {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    criticalTickets: 0,
    incidentCount: 0,
    requestCount: 0,
    overdueTickets: 0,
    slaRiskCount: 0,
    slaCompliance: 100,
    totalAssets: 0,
    onlineAssets: 0,
    offlineAssets: 0,
    warningAssets: 0,
    criticalAssetsCount: 0,
    unassignedTickets: 0,
    healthScore: 100,
    ticketsByPriority: {},
    ticketsByStatus: {},
    topProblemAssets: []
  },
  personal: {
    myTickets: 0,
    myTasks: 0,
  },
  isLevel2: false,
  isLevel1: false,
  isLevel3: false,
  isAdmin: false,
  canSwitchView: true,
  viewMode: 'global',
  recentActivities: [],
  chartData: [],
};

const formatTime = (dateStr) => {
  if (!dateStr) return '--:--';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [recentAssets, setRecentAssets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('global'); // 'global' | 'personal'

  const userRoleStr = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').trim().toUpperCase();
  const isLevel2 = userRoleStr === 'NIVEL 2' || userRoleStr === 'LEVEL_2' || userRoleStr === 'TECNICO NIVEL 2' || userRoleStr === 'TÉCNICO NIVEL 2' || (userRoleStr.includes('NIVEL 2') && !userRoleStr.includes('NIVEL 1') && !userRoleStr.includes('NIVEL 3'));
  const isLevel1 = userRoleStr === 'NIVEL 1' || userRoleStr === 'LEVEL_1' || userRoleStr.includes('NIVEL 1');
  const isLevel3 = userRoleStr === 'NIVEL 3' || userRoleStr === 'LEVEL_3' || userRoleStr.includes('NIVEL 3') || userRoleStr.includes('SUPERVISOR');
  const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ADMINISTRADOR';
  const isStandardUser = userRoleStr === 'USUARIO ESTANDAR' || userRoleStr === 'STANDARD_USER';

  const canSwitchView = !isLevel2 && !isStandardUser;

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        const effectiveViewMode = isLevel2 || isStandardUser ? 'personal' : viewMode;
        const [dashboardData, assetsData] = await Promise.all([
          apiRequest(`/dashboard/data?viewMode=${effectiveViewMode}`),
          apiRequest('/assets/recent').catch(() => [])
        ]);

        if (!ignore) {
          setData(dashboardData);
          setRecentAssets(Array.isArray(assetsData) ? assetsData : []);
          setLoading(false);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [user, viewMode]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#00D1FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem auto'
        }} />
        <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Cargando consola de comando ITIL/ITSM y telemetría...</p>
      </div>
    );
  }

  const global = data?.global || initialData.global;
  const personal = data?.personal || initialData.personal;
  const activities = data?.recentActivities || [];
  const chart = data?.chartData || [];
  const isPersonalScope = isLevel2 || isStandardUser || viewMode === 'personal';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO OPERATIONAL PANEL (Midnight Blue Suite) */}
      <div style={{
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
        gap: '1.5rem'
      }}>
        <div style={{ flex: '1', minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: 'rgba(0, 209, 255, 0.18)',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              color: '#00D1FF',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              {isLevel2 
                ? '🔧 Service Desk · Técnico Nivel 2' 
                : isLevel1
                ? '📋 Coordinación Service Desk · Nivel 1'
                : isLevel3
                ? '🛡️ Supervisión Service Desk · Nivel 3'
                : 'Centro de Comando ITSM & RMM'
              }
            </span>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              {isPersonalScope ? '• Consola Personal Operativa' : '• Monitoreo Operacional Global 360°'}
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', maxWidth: '650px', lineHeight: 1.5 }}>
            {isPersonalScope
              ? `Tienes ${personal.myTickets || global.openTickets || 0} tickets asignados y ${personal.myTasks || global.inProgressTickets || 0} casos en progreso en tu bandeja individual.`
              : `Operación global en tiempo real: ${global.openTickets || 0} tickets en gestión, ${global.criticalTickets || 0} críticos y ${global.onlineAssets || 0} activos RMM monitoreados.`
            }
          </p>

          {/* Quick status chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.75rem',
              fontWeight: '600',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
              {isPersonalScope ? 'Métricas Personales Activas' : 'RMM & Service Desk en Vivo'}
            </div>

            {global.criticalTickets > 0 && (
              <div 
                onClick={() => navigate('/tickets?priority=CRITICAL')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  cursor: 'pointer'
                }}
              >
                🚨 {global.criticalTickets} {isPersonalScope ? 'Mis Incidentes Críticos' : 'Incidentes Críticos'}
              </div>
            )}

            {global.overdueTickets > 0 && (
              <div 
                onClick={() => navigate('/tickets')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  cursor: 'pointer'
                }}
              >
                ⏱️ {global.overdueTickets} {isPersonalScope ? 'Mis Tickets Vencidos' : 'Fuera de ANS / Vencidos'}
              </div>
            )}
          </div>
        </div>

        {/* Global/Personal Controls & Health Badge */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Switcher View (for Admin, N1, N3) */}
          {canSwitchView && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px',
              borderRadius: '10px',
              display: 'flex',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('global')}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: viewMode === 'global' ? '#00D1FF' : 'transparent',
                  color: viewMode === 'global' ? '#001D40' : '#cbd5e1'
                }}
              >
                🌐 Global
              </button>
              <button
                type="button"
                onClick={() => setViewMode('personal')}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: viewMode === 'personal' ? '#00D1FF' : 'transparent',
                  color: viewMode === 'personal' ? '#001D40' : '#cbd5e1'
                }}
              >
                👤 Mi Bandeja
              </button>
            </div>
          )}

          {/* Export Shift Report Button */}
          <button
            type="button"
            onClick={() => generateDashboardReport(data, user, viewMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #00D1FF 0%, #0099ff 100%)',
              color: '#001D40',
              border: 'none',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 209, 255, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            📄 Exportar Turno (PDF)
          </button>

          {/* SLA Badge */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '0.85rem 1.25rem',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            minWidth: '120px'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#00D1FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumplimiento ANS
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: '900',
              color: (global.slaCompliance || 100) >= 90 ? '#34d399' : '#fbbf24',
              marginTop: '0.15rem'
            }}>
              {global.slaCompliance || 100}%
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
              Meta institucional: &gt;95%
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* 📊 BENTO KPI GRID (6 Cards Clave ITIL/ITSM) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1: Active Workload */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            borderLeft: '4px solid #3b82f6',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              {isPersonalScope ? 'Mis Tickets Activos' : 'Tickets Activos en Gestión'}
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              📥
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', lineHeight: 1.2 }}>
            {global.openTickets || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚡ {global.inProgressTickets || 0} en atención activa</span>
            <span>Ver todos →</span>
          </div>
        </div>

        {/* Card 2: Incidents (Fallas) */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            borderLeft: '4px solid #ef4444',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' }}>
              {isPersonalScope ? 'Mis Incidentes (Fallas)' : 'Incidentes (Averías)'}
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              🔥
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ef4444', lineHeight: 1.2 }}>
            {global.incidentCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '0.4rem' }}>
            Afectación a la continuidad operativa
          </div>
        </div>

        {/* Card 3: Requests (Requerimientos) */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            borderLeft: '4px solid #00D1FF',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>
              {isPersonalScope ? 'Mis Requerimientos' : 'Requerimientos (Peticiones)'}
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              📋
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0369a1', lineHeight: 1.2 }}>
            {global.requestCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '0.4rem' }}>
            Solicitudes de servicio y accesos
          </div>
        </div>

        {/* Card 4: Critical & Emergencies */}
        <div 
          onClick={() => navigate('/tickets?priority=CRITICAL')}
          style={{
            background: (global.criticalTickets || 0) > 0 ? '#fff5f5' : '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: (global.criticalTickets || 0) > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            borderLeft: '4px solid #dc2626',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: (global.criticalTickets || 0) > 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>
              {isPersonalScope ? 'Mis Casos Críticos' : 'Incidentes Críticos'}
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              🚨
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: (global.criticalTickets || 0) > 0 ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
            {global.criticalTickets || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: (global.criticalTickets || 0) > 0 ? '#dc2626' : '#64748b', fontWeight: '700', marginTop: '0.4rem' }}>
            {(global.criticalTickets || 0) > 0 ? 'Prioridad P1 Inmediata →' : 'Sin emergencias críticas activas'}
          </div>
        </div>

        {/* Card 5: SLA Overdue / In Risk */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: (global.overdueTickets || 0) > 0 ? '#fffbeb' : '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: (global.overdueTickets || 0) > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            borderLeft: '4px solid #f59e0b',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: (global.overdueTickets || 0) > 0 ? '#d97706' : '#64748b', textTransform: 'uppercase' }}>
              {isPersonalScope ? 'Mis Tickets Fuera de SLA' : 'Tickets Vencidos (SLA)'}
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              ⏱️
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: (global.overdueTickets || 0) > 0 ? '#d97706' : '#0f172a', lineHeight: 1.2 }}>
            {global.overdueTickets || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: (global.overdueTickets || 0) > 0 ? '#d97706' : '#64748b', fontWeight: '700', marginTop: '0.4rem' }}>
            {(global.overdueTickets || 0) > 0 ? 'Tiempo límite excedido →' : 'Todos en tiempo objetivo'}
          </div>
        </div>

        {/* Card 6: RMM Assets & Health */}
        <div 
          onClick={() => navigate('/assets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            borderLeft: '4px solid #10b981',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>
              Salud Parque RMM
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              💻
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', lineHeight: 1.2 }}>
            {global.onlineAssets || 0} <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: '600' }}>/ {global.totalAssets || 0}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.4rem' }}>
            {global.healthScore || 100}% de disponibilidad en red →
          </div>
        </div>
      </div>

      {/* 📈 SECTION 2: INTERACTIVE CHARTS & SEVERITY MATRIX */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.75rem'
      }}>
        {/* CHART: TICKET TREND (Incidents vs Requests vs Resolved) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                {isPersonalScope ? 'Evolución de Mis Casos (Últimos 14 Días)' : 'Tendencia Operativa: Incidentes vs Requerimientos (14 Días)'}
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Comparativa diaria de volumen ingresado frente a tickets resueltos
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#f1f5f9', color: '#002D62' }}>
              En tiempo real
            </span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="requestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00D1FF" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ color: '#00D1FF', fontWeight: '700' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" name="Incidentes" dataKey="incidents" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#incidentGrad)" />
                <Area type="monotone" name="Requerimientos" dataKey="requests" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#requestGrad)" />
                <Area type="monotone" name="Resueltos" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#resolvedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SEVERITY & STATUS MATRIX */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              {isPersonalScope ? 'Distribución de Mis Tickets por Severidad' : 'Distribución Operativa por Severidad'}
            </h3>
            <p style={{ margin: '0.2rem 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Volumen y porcentaje según nivel de impacto técnico
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { key: 'CRITICAL', label: 'Crítico / Emergencia', color: '#dc2626' },
                { key: 'HIGH', label: 'Alta Prioridad', color: '#ea580c' },
                { key: 'MEDIUM', label: 'Media Prioridad', color: '#2563eb' },
                { key: 'LOW', label: 'Baja Prioridad', color: '#059669' },
              ].map(({ key, label, color }) => {
                const count = global.ticketsByPriority?.[key] || 0;
                const total = global.openTickets || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#334155' }}>{label}</span>
                      <span style={{ color }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>¿Deseas auditoría detallada de ANS?</span>
            <button
              onClick={() => navigate('/analytics')}
              style={{ background: '#002D62', border: 'none', color: '#ffffff', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Ver Módulo de Analítica →
            </button>
          </div>
        </div>
      </div>

      {/* 🕒 SECTION 3: RECENT ACTIVITIES & PROBLEM ASSETS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* RECENT ACTIVITIES */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            {isPersonalScope ? 'Mi Actividad Reciente en el Service Desk' : 'Timeline Operativo en Tiempo Real'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No hay actividades registradas recientemente.
              </div>
            ) : (
              activities.slice(0, 6).map((act, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0 }}>
                    {act.user?.charAt(0) || 'S'}
                  </div>
                  <div style={{ flex: '1', fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{act.user}</strong>{' '}
                      <span style={{ color: '#64748b' }}>{act.action} en</span>{' '}
                      <strong style={{ color: '#2563eb' }}>{act.ticket?.title || `Ticket #${act.ticketId}`}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatTime(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TOP PROBLEM ASSETS & TELEMETRY */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Activos con Mayor Frecuencia de Incidentes
            </h3>
            <button
              onClick={() => navigate('/assets')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Ver Inventario ({global.totalAssets}) →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(!global.topProblemAssets || global.topProblemAssets.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No hay activos con incidentes críticos acumulados.
              </div>
            ) : (
              global.topProblemAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => navigate(`/assets?search=${asset.hostname}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {asset.deviceType?.includes('Impresora') ? '🖨️' : asset.deviceType?.includes('Portátil') ? '💻' : '🖥️'}
                    </span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.875rem', color: '#0f172a' }}>
                        {asset.hostname}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        📍 {asset.location || 'Sede Principal'} {asset.ipAddress && `• ${asset.ipAddress}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: asset.activeTickets > 0 ? '#fee2e2' : '#ecfdf5',
                      color: asset.activeTickets > 0 ? '#b91c1c' : '#047857'
                    }}>
                      {asset.activeTickets > 0 ? `⚠️ ${asset.activeTickets} tickets` : '🟢 Estable'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
