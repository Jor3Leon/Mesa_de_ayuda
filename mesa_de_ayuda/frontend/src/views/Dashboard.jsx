import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Icon, BentoCard } from '../components/dashboard/DashboardComponents';

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

// --- Utilities ---
const formatTime = (dateStr) => {
  if (!dateStr) return '--:--';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Sub-components ---

function StatusPills({ data }) {
  return (
    <div className="hero-status-pills">
      <div className="status-pill" style={{ background: 'rgba(15, 157, 58, 0.1)', borderColor: 'rgba(15, 157, 58, 0.2)', color: 'var(--color-primary)' }}>
        <div className="status-dot" />
        RMM Conectado
      </div>
      {data.global.offlineAssets > 0 && (
        <div className="status-pill" style={{ background: 'rgba(226, 27, 35, 0.1)', borderColor: 'rgba(226, 27, 35, 0.2)', color: 'var(--color-danger)' }}>
          <Icon name="alert" size={14} />
          {data.global.offlineAssets} Equipos Offline
        </div>
      )}
      <div className="status-pill">
        <Icon name="shield" size={14} style={{ color: 'var(--color-primary)' }} />
        Seguridad Ok
      </div>
      {data.global.slaRiskCount > 0 && (
        <div className="status-pill animate-pulse" style={{ background: 'rgba(255, 152, 0, 0.1)', borderColor: 'rgba(255, 152, 0, 0.2)', color: '#ff9800' }}>
          <Icon name="clock" size={14} />
          {data.global.slaRiskCount} SLA en Riesgo
        </div>
      )}
    </div>
  );
}

function PrioritiesWidget({ ticketsByPriority, openTickets }) {
  const colors = {
    CRITICAL: 'var(--color-danger)',
    HIGH: 'var(--color-secondary)',
    MEDIUM: '#2e5aac',
    LOW: 'var(--color-primary)'
  };

  return (
    <div className="priorities-list">
      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(prio => {
        const count = ticketsByPriority?.[prio] || 0;
        const percentage = openTickets > 0 ? (count / openTickets) * 100 : 0;
        
        return (
          <div key={prio} className="priority-row">
            <div className="priority-label-container">
              <span className="priority-name">{prio}</span>
              <span className="muted-text">{count}</span>
            </div>
            <div className="priority-bar-bg">
              <div className="priority-bar-fill" style={{ 
                width: `${percentage}%`, 
                background: colors[prio]
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfraHealthWidget({ data, recentAssets, navigate }) {
  return (
    <div className="infra-status-list">
      <div className="infra-stat-row" onClick={() => navigate('/assets?status=ONLINE')} style={{ cursor: 'pointer' }}>
        <span className="muted-text">Equipos en Línea</span>
        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{data.global.onlineAssets}</span>
      </div>
      <div className="infra-stat-row" onClick={() => navigate('/assets?status=OFFLINE')} style={{ cursor: 'pointer' }}>
        <span className="muted-text">Equipos Offline</span>
        <span style={{ fontWeight: 700, color: data.global.offlineAssets > 0 ? 'var(--color-danger)' : 'inherit' }}>{data.global.offlineAssets}</span>
      </div>
      
      {data.global.longOfflineAssets > 0 && (
        <div className="infra-alert-banner" onClick={() => navigate('/assets?status=OFFLINE')}>
          <Icon name="alert" size={20} style={{ color: 'var(--color-danger)' }} />
          <div style={{ fontSize: '0.8rem' }}>
            <strong style={{ color: 'var(--color-danger)', display: 'block' }}>Alerta de Inactividad</strong>
            <span className="muted-text">{data.global.longOfflineAssets} equipos llevan más de 24h sin conexión.</span>
          </div>
        </div>
      )}

      {recentAssets.length > 0 && (
        <div className="recent-syncs">
          <p className="recent-syncs-title">Últimas Sincronizaciones</p>
          {recentAssets.slice(0, 3).map(asset => (
            <div key={asset.id} className="sync-row" onClick={() => navigate(`/assets?search=${asset.hostname}`)} style={{ cursor: 'pointer' }}>
              <span style={{ fontWeight: 500 }}>{asset.hostname}</span>
              <span className="badge success" style={{ fontSize: '10px' }}>{formatTime(asset.lastSeenAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

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
          apiRequest('/assets/recent')
        ]);

        if (!ignore) {
          setData(dashboardData);
          setRecentAssets(assetsData);
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

  if (loading) return (
    <div className="view-container">
      <div className="loader"></div>
      <p style={{ textAlign: 'center', color: 'var(--color-muted)' }}>Cargando tablero inteligente...</p>
    </div>
  );

  const global = data?.global || initialData.global;
  const personal = data?.personal || initialData.personal;
  const activities = data?.recentActivities || [];
  const chart = data?.chartData || [];

  return (
    <div className="view-container animate-fade-in">
      <header className="hero-panel glass-card">
        <div className="hero-content">
          <p className="eyebrow">Resumen Operativo</p>
          <h2>Hola, {user?.name?.split(' ')[0] || 'Usuario'}</h2>
          <p className="muted-text">
            {isAdmin 
              ? `El sistema reporta ${global.openTickets || 0} tickets activos y ${global.totalAssets || 0} activos bajo monitoreo.`
              : `Tienes ${personal.myTickets || 0} tickets asignados y ${personal.myTasks || 0} tareas pendientes por completar.`
            }
          </p>
          <StatusPills data={{ global, personal }} />
        </div>
        <div className="stat-grid compact-grid">
          <div className="stat-card glass-card" style={{ textAlign: 'center' }}>
            <span>Salud Global</span>
            <strong style={{ color: (global.healthScore || 0) > 90 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {global.healthScore || 0}%
            </strong>
          </div>
          <div className="stat-card glass-card" style={{ textAlign: 'center' }}>
            <span>ANS Mes</span>
            <strong style={{ color: 'var(--color-primary)' }}>98.4%</strong>
          </div>
        </div>
      </header>

      {error && <div className="feedback error">{error}</div>}

      <div className="bento-grid">
        {/* Row 1: Metrics */}
        {(isTechnician || isStandardUser) && (
          <BentoCard 
            title={isStandardUser ? "Mis Solicitudes" : "Mis Tickets"} 
            value={personal.myTickets} 
            icon="user"
            onClick={() => navigate('/tickets')}
            footer={<span style={{ color: 'var(--color-primary)' }}>{isStandardUser ? "Ver mis solicitudes →" : "Gestionar mis asignados →"}</span>}
          />
        )}

        {isStandardUser ? (
          <BentoCard 
            title="Por Calificar" 
            value={personal.myTasks} 
            icon="check"
            style={{ background: 'rgba(15, 157, 58, 0.05)' }}
            onClick={() => navigate('/tickets?status=resolved')}
            footer={<span style={{ color: 'var(--color-success)' }}>Tickets por aprobar →</span>}
          />
        ) : isTechnician && (personal.myTasks || 0) > 0 ? (
          <BentoCard 
            title="Tareas en Curso" 
            value={personal.myTasks} 
            icon="tasks"
            style={{ background: 'rgba(46, 90, 172, 0.05)' }}
            onClick={() => navigate('/tickets?status=in_progress&assigned=me')}
            footer={<span style={{ color: '#2e5aac' }}>Prioridad operativa →</span>}
          />
        ) : (
          <BentoCard 
            title="Tickets Críticos" 
            value={global.criticalTickets} 
            icon="alert"
            className={(global.criticalTickets || 0) > 0 ? "highlight-card-danger" : ""}
            onClick={() => navigate('/tickets?priority=critical')}
            footer={<span>SLA en riesgo: {global.criticalTickets || 0}</span>}
          />
        )}

        <BentoCard 
          title="Tickets Abiertos" 
          value={global.openTickets} 
          icon="tickets"
          onClick={() => navigate('/tickets?status=open')}
          footer={<span>Total en la mesa →</span>}
        />

        {isAdmin ? (
          <BentoCard 
            title="Sin Asignar" 
            value={global.unassignedTickets} 
            icon="alert"
            className={(global.unassignedTickets || 0) > 0 ? "highlight-card-danger" : ""}
            onClick={() => navigate('/tickets?assigned=none')}
            footer={<span style={{ color: (global.unassignedTickets || 0) > 0 ? 'var(--color-danger)' : 'inherit' }}>{(global.unassignedTickets || 0) > 0 ? 'Requiere atención inmediata' : 'Bandeja limpia'} →</span>}
          />
        ) : (
          <BentoCard 
            title="Disponibilidad RMM" 
            value={`${global.onlineAssets || 0}/${global.totalAssets || 0}`} 
            icon="assets"
            onClick={() => navigate('/assets')}
            footer={<span>Infraestructura global</span>}
          />
        )}

        {/* Row 2: Analytics & Activity */}
        <BentoCard title="Volumen de Tickets" icon="chart" className="bento-span-2" onClick={() => navigate('/analytics')}>
          <div style={{ width: '100%', height: 220, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px', boxShadow: 'var(--shadow-premium)' }}
                  itemStyle={{ color: 'var(--color-primary)', fontWeight: 700 }}
                  cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="tickets" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard title="Actividad Reciente" icon="activity" className="bento-span-2 bento-row-2">
          <div className="activity-list" style={{ marginTop: '0.5rem' }}>
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className="activity-item" onClick={() => navigate(`/tickets?ticketId=${act.ticketId}`)} style={{ cursor: 'pointer' }}>
                  <div className="activity-dot" style={{ background: act.action === 'COMMENTED' ? 'var(--color-secondary)' : 'var(--color-primary)' }}></div>
                  <div className="activity-content">
                    <div className="activity-title">
                      <strong>{act.user || 'Sistema'}</strong>
                      <span className="muted-text"> {act.action === 'COMMENTED' ? 'añadió comentario' : 'actualizó ticket'} </span>
                    </div>
                    <span className="activity-link">
                      #{act.ticketId} - {act.ticket?.title || 'Ticket'}
                    </span>
                    <div className="activity-meta">
                      <Icon name="clock" size={10} style={{ display: 'inline', marginRight: '4px' }} />
                      {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : ''} • {formatTime(act.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-text" style={{ padding: '2rem', textAlign: 'center' }}>No hay actividad reciente para mostrar.</p>
            )}
          </div>
        </BentoCard>

        {/* Row 3: Priorities (aligned with Activity feed) */}
        <BentoCard title="Prioridades de Trabajo" icon="priority" className="bento-span-2" onClick={() => navigate('/tickets')}>
          <PrioritiesWidget 
            ticketsByPriority={global.ticketsByPriority} 
            openTickets={global.openTickets} 
          />
        </BentoCard>

        {/* Row 4: Infrastructure & Quick Actions */}
        <BentoCard title="Salud de Infraestructura" icon="shield" className="bento-span-2">
          <InfraHealthWidget 
            data={{ global, personal }} 
            recentAssets={recentAssets || []} 
            navigate={navigate} 
          />
        </BentoCard>

        <BentoCard title="Acciones Rápidas" icon="plus" className="bento-span-2">
          <div className="quick-actions-container">
            <Link to="/tickets" className="quick-action-btn hover-lift">
              <Icon name="plus" size={24} style={{ color: 'var(--color-primary)' }} />
              <span>Nuevo Ticket</span>
            </Link>
            {isAdmin && (
              <Link to="/assets" className="quick-action-btn hover-lift">
                <Icon name="assets" size={24} style={{ color: 'var(--color-secondary)' }} />
                <span>Registrar Activo</span>
              </Link>
            )}
            <Link to="/analytics" className="quick-action-btn hover-lift">
              <Icon name="chart" size={24} style={{ color: '#2e5aac' }} />
              <span>Reportes</span>
            </Link>
            <Link to="/users" className="quick-action-btn hover-lift">
              <Icon name="user" size={24} style={{ color: '#8b5cf6' }} />
              <span>Usuarios</span>
            </Link>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
