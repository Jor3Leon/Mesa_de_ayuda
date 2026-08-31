import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const initialData = {
  global: {
    openTickets: 0,
    criticalTickets: 0,
    totalAssets: 0,
    onlineAssets: 0,
    offlineAssets: 0,
    warningAssets: 0,
    unassignedTickets: 0,
    healthScore: 100,
    ticketsByPriority: {},
    ticketsByStatus: {},
    slaRiskCount: 0,
    longOfflineAssets: 0,
  },
  personal: {
    myTickets: 0,
    myTasks: 0,
  },
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

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ADMINISTRADOR';
  const isTechnician = isAdmin || user?.role?.toUpperCase() === 'TECNICO' || user?.role?.toUpperCase() === 'TECHNICIAN' || user?.role?.toUpperCase() === 'LEVEL_1' || user?.role?.toUpperCase() === 'LEVEL_2' || user?.role?.toUpperCase() === 'LEVEL_3';
  const isStandardUser = user?.role === 'USUARIO ESTANDAR';

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        const [dashboardData, assetsData] = await Promise.all([
          apiRequest('/dashboard/data'),
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
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem auto'
        }} />
        <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Cargando consola de control y telemetría...</p>
      </div>
    );
  }

  const global = data?.global || initialData.global;
  const personal = data?.personal || initialData.personal;
  const activities = data?.recentActivities || [];
  const chart = data?.chartData || [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO OPERATIONAL PANEL */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: 'rgba(0, 209, 255, 0.18)',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              color: '#00D1FF'
            }}>
              ITSM & RMM Operations
            </span>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>• Centro de Monitoreo Activo</span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.5 }}>
            {isAdmin 
              ? `El parque tecnológico cuenta con ${global.totalAssets || 0} activos y ${global.openTickets || 0} incidentes en gestión.`
              : `Tienes ${personal.myTickets || 0} tickets asignados y ${personal.myTasks || 0} tareas pendientes en tu flujo operativo.`
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
              RMM & Telemetría Conectado
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
                ⚠️ {global.criticalTickets} Tickets Críticos
              </div>
            )}

            {global.slaRiskCount > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px'
              }}>
                ⏱️ {global.slaRiskCount} SLA en Riesgo
              </div>
            )}
          </div>
        </div>

        {/* Global Health Score Badge */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            minWidth: '130px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Salud Infraestructura
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: '900',
              color: (global.healthScore || 0) > 85 ? '#34d399' : '#fbbf24',
              marginTop: '0.25rem'
            }}>
              {global.healthScore || 0}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {global.onlineAssets} de {global.totalAssets} online
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            minWidth: '130px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumplimiento ANS
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: '900',
              color: '#60a5fa',
              marginTop: '0.25rem'
            }}>
              98.4%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Tiempo promedio: 1.2h
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

      {/* 📊 BENTO KPI CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1 */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {isStandardUser ? 'Mis Solicitudes' : 'Mis Tickets Asignados'}
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              👤
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
            {personal.myTickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: '600', marginTop: '0.5rem' }}>
            {isStandardUser ? 'Ver solicitudes creadas →' : 'Gestionar mi bandeja de trabajo →'}
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => navigate('/tickets?priority=CRITICAL')}
          style={{
            background: (global.criticalTickets || 0) > 0 ? '#fff5f5' : '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: (global.criticalTickets || 0) > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: (global.criticalTickets || 0) > 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>
              Tickets Críticos
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🚨
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: (global.criticalTickets || 0) > 0 ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
            {global.criticalTickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: (global.criticalTickets || 0) > 0 ? '#dc2626' : '#64748b', fontWeight: '600', marginTop: '0.5rem' }}>
            {(global.criticalTickets || 0) > 0 ? 'Requiere atención urgente inmediata →' : 'Sin emergencias críticas activas'}
          </div>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => navigate('/tickets?assigned=none')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Tickets Sin Asignar
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📥
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
            {global.unassignedTickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: '600', marginTop: '0.5rem' }}>
            Asignar a técnicos disponibles →
          </div>
        </div>

        {/* Card 4 */}
        <div 
          onClick={() => navigate('/assets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              Dispositivos RMM
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              💻
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
            {global.onlineAssets || 0} / {global.totalAssets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600', marginTop: '0.5rem' }}>
            Inventario & Monitoreo TI →
          </div>
        </div>
      </div>

      {/* 📈 MAIN SECTION: CHARTS & INFRASTRUCTURE MONITOR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.75rem'
      }}>
        {/* CHART: TICKET TREND */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                Tendencia de Incidentes & Requerimientos
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Volumen de tickets ingresados en los últimos 7 días
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
              En tiempo real
            </span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#002D62" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ color: '#00D1FF', fontWeight: '700' }}
                />
                <Area type="monotone" dataKey="tickets" stroke="#002D62" strokeWidth={3} fillOpacity={1} fill="url(#ticketGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PRIORITY & INFRASTRUCTURE STATUS */}
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
              Distribución por Severidad
            </h3>
            <p style={{ margin: '0.2rem 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Proporción de tickets abiertos según nivel de impacto
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { key: 'CRITICAL', label: 'Crítico / Emergencia', color: '#dc2626', bg: '#fee2e2' },
                { key: 'HIGH', label: 'Alta Prioridad', color: '#ea580c', bg: '#ffedd5' },
                { key: 'MEDIUM', label: 'Media Prioridad', color: '#2563eb', bg: '#dbeafe' },
                { key: 'LOW', label: 'Baja Prioridad', color: '#059669', bg: '#d1fae5' },
              ].map(({ key, label, color, bg }) => {
                const count = global.ticketsByPriority?.[key] || 0;
                const total = global.openTickets || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
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
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>¿Deseas emitir un reporte operacional?</span>
            <button
              onClick={() => navigate('/analytics')}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver Analytics →
            </button>
          </div>
        </div>
      </div>

      {/* 🕒 BOTTOM ROW: RECENT ACTIVITIES & TELEMETRY SYNCS */}
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
            Actividad Reciente del Service Desk
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No hay actividades registradas recientemente.
              </div>
            ) : (
              activities.slice(0, 5).map((act, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' }}>
                    {act.user?.charAt(0) || 'S'}
                  </div>
                  <div style={{ flex: '1', fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{act.user}</strong>{' '}
                      <span style={{ color: '#64748b' }}>{act.action} en</span>{' '}
                      <strong style={{ color: '#2563eb' }}>{act.ticket?.title || 'Ticket'}</strong>
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

        {/* TELEMETRY AGENTS RECENTLY SEEN */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Telemetría RMM de Endpoints
            </h3>
            <button
              onClick={() => navigate('/assets')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver todos ({global.totalAssets}) →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No hay activos con telemetría reciente.
              </div>
            ) : (
              recentAssets.slice(0, 5).map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => navigate(`/assets?search=${asset.hostname}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>
                      {asset.deviceType?.includes('Impresora') ? '🖨️' : asset.deviceType?.includes('Portátil') ? '💻' : '🖥️'}
                    </span>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }}>
                        {asset.hostname}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        📍 {asset.location || 'Sede Principal'} {asset.ipAddress && `• ${asset.ipAddress}`}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: asset.status === 'ONLINE' ? '#ecfdf5' : '#fee2e2',
                    color: asset.status === 'ONLINE' ? '#047857' : '#b91c1c'
                  }}>
                    {asset.status === 'ONLINE' ? '🟢 En línea' : '🔴 Desconectado'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
