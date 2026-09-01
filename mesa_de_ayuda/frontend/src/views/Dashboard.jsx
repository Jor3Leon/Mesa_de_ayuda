import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { generateDashboardReport } from '../lib/reports';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const initialData = {
  kpis: {
    totalTickets: 0,
    assignedTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    pendingTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    criticalTickets: 0,
    incidentCount: 0,
    requestCount: 0,
    overdueTickets: 0,
    unassignedTickets: 0,
    slaCompliance: 100
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
  technicians: [],
  techniciansWorkload: [],
  rmmVelocity: {
    mttaMinutes: 18,
    mttrHours: 2.4,
    fcrRate: 88,
    throughputRatio: 100
  },
  ticketAging: [],
  urgentTicketsRadar: [],
  yearlyTrend: [],
  thirtyDaysTrend: [],
  monthlyStatusDistribution: [],
  topCategories: [],
  topRequestTypes: [],
  topDependencias: [],
  topOficinas: [],
  topEntities: [],
  severityDistribution: [],
  ticketsByPriority: {},
  ticketsByStatus: {}
};

const PIE_COLORS = ['#00D1FF', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [trendRange, setTrendRange] = useState('30d'); // '30d' | '12m'
  const [yearlyMetric, setYearlyMetric] = useState('creationVsResolution'); // 'creationVsResolution' | 'incidentsVsRequests'
  const [structureTab, setStructureTab] = useState('dependencias'); // 'dependencias' | 'oficinas'
  const [selectedSeverity, setSelectedSeverity] = useState(null);

  const userRoleStr = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').trim().toUpperCase();
  const isLevel2 = userRoleStr === 'NIVEL 2' || userRoleStr === 'LEVEL_2' || userRoleStr === 'TECNICO NIVEL 2' || userRoleStr === 'TÉCNICO NIVEL 2' || (userRoleStr.includes('NIVEL 2') && !userRoleStr.includes('NIVEL 1') && !userRoleStr.includes('NIVEL 3'));
  const isLevel1 = userRoleStr === 'NIVEL 1' || userRoleStr === 'LEVEL_1' || userRoleStr.includes('NIVEL 1');
  const isLevel3 = userRoleStr === 'NIVEL 3' || userRoleStr === 'LEVEL_3' || userRoleStr.includes('NIVEL 3') || userRoleStr.includes('SUPERVISOR');
  const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ADMINISTRADOR';
  const isStandardUser = userRoleStr === 'USUARIO ESTANDAR' || userRoleStr === 'STANDARD_USER';

  const [filters, setFilters] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      unifiedScope: isLevel2 || isStandardUser ? 'personal' : 'global',
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today
    };
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams();
        
        // Resolve unifiedScope into viewMode and technicianId
        const scope = isLevel2 || isStandardUser ? 'personal' : filters.unifiedScope;
        if (scope === 'personal') {
          queryParams.set('viewMode', 'personal');
        } else if (scope === 'global' || !scope) {
          queryParams.set('viewMode', 'global');
        } else {
          // Specific technician ID selected
          queryParams.set('viewMode', 'global');
          queryParams.set('technicianId', scope);
        }

        if (filters.startDate) queryParams.set('startDate', filters.startDate);
        if (filters.endDate) queryParams.set('endDate', filters.endDate);

        const dashboardData = await apiRequest(`/dashboard/data?${queryParams.toString()}`);

        if (!ignore) {
          setData(dashboardData);
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
  }, [user, filters]);

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const activeViewMode = filters.unifiedScope === 'personal' || isLevel2 ? 'personal' : 'global';
      generateDashboardReport(data, user, activeViewMode);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeverityClick = (priorityKey) => {
    setSelectedSeverity(prev => prev === priorityKey ? null : priorityKey);
    navigate(`/tickets?priority=${priorityKey}`);
  };

  if (loading && !data.yearlyTrend.length) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: '42px',
          height: '42px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#00D1FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem auto'
        }} />
        <p style={{ fontWeight: '700', fontSize: '1rem', color: '#001D40' }}>
          Cargando Power BI Business Intelligence de Tickets & PQRSF...
        </p>
      </div>
    );
  }

  const k = data?.kpis || initialData.kpis;
  const isPersonalScope = isLevel2 || isStandardUser || filters.unifiedScope === 'personal';
  const techniciansList = data?.technicians || [];
  const yearlyTrend = data?.yearlyTrend || [];
  const thirtyDaysTrend = data?.thirtyDaysTrend || [];
  const monthlyStatus = data?.monthlyStatusDistribution || [];
  const topCategories = data?.topCategories || [];
  const topRequestTypes = data?.topRequestTypes || [];
  const topDependencias = data?.topDependencias || [];
  const topOficinas = data?.topOficinas || [];
  const severityList = data?.severityDistribution || [];
  const rmmVelocity = data?.rmmVelocity || { mttaMinutes: 18, mttrHours: 2.4, fcrRate: 88, throughputRatio: 100 };
  const ticketAging = data?.ticketAging || [];
  const techniciansWorkload = data?.techniciansWorkload || [];
  const urgentTicketsRadar = data?.urgentTicketsRadar || [];

  const currentStructureList = structureTab === 'dependencias' ? topDependencias : topOficinas;
  const maxCategoryCount = Math.max(...topCategories.map(c => c.count), 1);
  const maxStructureCount = Math.max(...currentStructureList.map(s => s.count), 1);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 1. HERO HEADER (Limpio y libre de controles internos) */}
      <div style={{
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
        <div style={{
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
          ⚡
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.55rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              {isLevel2 
                ? 'Panel de Control de Tickets · Técnico Nivel 2' 
                : isLevel1
                ? 'Centro de Gestión & Coordinación de Tickets · Nivel 1'
                : isLevel3
                ? 'Supervisión de Casos & Acuerdos ANS · Nivel 3'
                : 'Centro de Inteligencia & Gestión de Tickets (Power BI)'
              }
            </h1>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: '800', 
              padding: '0.2rem 0.65rem', 
              borderRadius: '9999px', 
              background: 'rgba(0, 209, 255, 0.18)', 
              color: '#00D1FF', 
              border: '1px solid rgba(0, 209, 255, 0.4)',
              textTransform: 'uppercase'
            }}>
              {isPersonalScope ? '👤 Mis Tickets' : '🌐 Vista Global'}
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
            {isPersonalScope 
              ? 'Control individual de tickets asignados, tiempos de respuesta y estados de atención.'
              : 'Métricas, estadísticas, tendencias anuales, distribución de severidad y control de acuerdos ANS.'
            }
          </p>
        </div>
      </div>

      {/* 🎛️ 2. BARRA DE HERRAMIENTAS & FILTROS UNIFICADA (Debajo del Header) */}
      <div style={{
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
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Desde
            </span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
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
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Hasta
            </span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
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

          {/* Filtro Unificado de Búsqueda (Alcance & Técnico) */}
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Alcance / Técnico Asignado
            </span>
            <select
              value={isLevel2 ? 'personal' : filters.unifiedScope}
              disabled={isLevel2}
              onChange={(e) => handleFilterChange('unifiedScope', e.target.value)}
              style={{
                padding: '7px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: isLevel2 ? 'not-allowed' : 'pointer',
                minWidth: '220px',
                opacity: isLevel2 ? 0.85 : 1
              }}
            >
              {isLevel2 ? (
                <option value="personal">👤 Mis Tickets (Técnico Nivel 2)</option>
              ) : (
                <>
                  <optgroup label="Vistas de Alcance">
                    <option value="global">🌐 Todos (Vista Global)</option>
                    <option value="personal">👤 Mis Tickets (Mi Bandeja)</option>
                  </optgroup>
                  {techniciansList.length > 0 && (
                    <optgroup label="Técnicos & Soporte">
                      {techniciansList.map(t => (
                        <option key={t.id} value={String(t.id)}>
                          👤 {t.name} ({t.role})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Botón Exportar PDF en la misma fila */}
        <div>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            style={{
              background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
              color: '#001D40',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: isExporting ? 'not-allowed' : 'pointer',
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

      {/* 📊 3. POWER BI KPI CARDS GRID (8 Indicadores Clave de Tickets) */}
      <div 
        className="dashboard-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '1.15rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Total Tickets */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #3b82f6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Total Tickets
            </span>
            <span style={{ fontSize: '1.15rem' }}>📑</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {k.totalTickets.toLocaleString()}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Incidencias: <strong style={{ color: '#ef4444' }}>{k.incidentCount}</strong> · Solicitudes: <strong style={{ color: '#002D62' }}>{k.requestCount}</strong>
          </p>
        </div>

        {/* Tickets Desfasados / Retrasados */}
        <div 
          onClick={() => navigate('/tickets?overdue=true')}
          style={{
            background: k.overdueTickets > 0 ? '#fff5f5' : '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: k.overdueTickets > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderLeft: '4px solid #dc2626',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
              Tickets Desfasados
            </span>
            <span style={{ fontSize: '1.15rem' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#dc2626', lineHeight: 1.1 }}>
            {k.overdueTickets}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: k.overdueTickets > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
            {k.overdueTickets > 0 ? 'Tiempo SLA excedido' : 'Todos al día'}
          </p>
        </div>

        {/* Tickets Asignados */}
        <div 
          onClick={() => navigate('/tickets')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #00D1FF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 209, 255, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Tickets Asignados
            </span>
            <span style={{ fontSize: '1.15rem' }}>👤</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#002D62', lineHeight: 1.1 }}>
            {k.assignedTickets}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            En manos de un técnico
          </p>
        </div>

        {/* Tickets Planificados / En Progreso */}
        <div 
          onClick={() => navigate('/tickets?status=IN_PROGRESS')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #8b5cf6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              En Progreso / Planif.
            </span>
            <span style={{ fontSize: '1.15rem' }}>⚡</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#8b5cf6', lineHeight: 1.1 }}>
            {k.inProgressTickets}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Trabajo en ejecución
          </p>
        </div>

        {/* Tickets Pendientes / En Espera */}
        <div 
          onClick={() => navigate('/tickets?status=PENDING')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #f59e0b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Pendientes / En Espera
            </span>
            <span style={{ fontSize: '1.15rem' }}>⏳</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#d97706', lineHeight: 1.1 }}>
            {k.pendingTickets}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Respuesta de usuario/terceros
          </p>
        </div>

        {/* Tickets Resueltos */}
        <div 
          onClick={() => navigate('/tickets?status=RESOLVED')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Tickets Resueltos
            </span>
            <span style={{ fontSize: '1.15rem' }}>✅</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>
            {k.resolvedTickets}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Solución aplicada
          </p>
        </div>

        {/* Tickets Cerrados */}
        <div 
          onClick={() => navigate('/tickets?status=CLOSED')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #64748b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(100, 116, 139, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Tickets Cerrados
            </span>
            <span style={{ fontSize: '1.15rem' }}>🔒</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#475569', lineHeight: 1.1 }}>
            {k.closedTickets}
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Conformidad final
          </p>
        </div>

        {/* Cumplimiento ANS */}
        <div 
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #059669',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Cumplimiento ANS
            </span>
            <span style={{ fontSize: '1.15rem' }}>🎯</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
            {k.slaCompliance}%
          </div>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
            Meta institucional: &gt;95%
          </p>
        </div>
      </div>

      {/* 📈 POWER BI CHARTS ROW 1: EVOLUCIÓN ANUAL & TENDENCIAS */}
      <div 
        className="dashboard-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Chart 1: Evolución de Casos en el Último Año (12 Meses) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Evolución de Casos en el Último Año (12 Meses)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Comparativo mensual del volumen de tickets ingresados y resueltos
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setYearlyMetric('creationVsResolution')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: yearlyMetric === 'creationVsResolution' ? '#002D62' : 'transparent',
                  color: yearlyMetric === 'creationVsResolution' ? '#ffffff' : '#475569'
                }}
              >
                Creados vs Resueltos
              </button>
              <button
                type="button"
                onClick={() => setYearlyMetric('incidentsVsRequests')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: yearlyMetric === 'incidentsVsRequests' ? '#002D62' : 'transparent',
                  color: yearlyMetric === 'incidentsVsRequests' ? '#ffffff' : '#475569'
                }}
              >
                Incidencias vs Solicitudes
              </button>
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="yearCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00D1FF" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="yearResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="yearIncGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="shortMonth" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ color: '#00D1FF', fontWeight: '700' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                {yearlyMetric === 'creationVsResolution' ? (
                  <>
                    <Area type="monotone" name="Casos Creados" dataKey="created" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#yearCreatedGrad)" />
                    <Area type="monotone" name="Casos Resueltos" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#yearResolvedGrad)" />
                  </>
                ) : (
                  <>
                    <Area type="monotone" name="Incidencias" dataKey="incidents" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#yearIncGrad)" />
                    <Area type="monotone" name="Solicitudes" dataKey="requests" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#yearCreatedGrad)" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Tendencia Operativa (Incidencias vs Solicitudes con Selector 30d vs 12m) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Tendencia Operativa: Incidencias vs Solicitudes
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Flujo comparativo según el tipo de ticket (Incidencia o Solicitud)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setTrendRange('30d')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: trendRange === '30d' ? '#00D1FF' : 'transparent',
                  color: trendRange === '30d' ? '#001D40' : '#475569'
                }}
              >
                Últimos 30 Días
              </button>
              <button
                type="button"
                onClick={() => setTrendRange('12m')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: trendRange === '12m' ? '#00D1FF' : 'transparent',
                  color: trendRange === '12m' ? '#001D40' : '#475569'
                }}
              >
                Mes a Mes (12M)
              </button>
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={trendRange === '30d' ? thirtyDaysTrend : yearlyTrend} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendIncGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="trendReqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002D62" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#002D62" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey={trendRange === '30d' ? 'name' : 'shortMonth'} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ color: '#00D1FF', fontWeight: '700' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" name="Incidencias" dataKey="incidents" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#trendIncGrad)" />
                <Area type="monotone" name="Solicitudes" dataKey="requests" stroke="#002D62" strokeWidth={2.5} fillOpacity={1} fill="url(#trendReqGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 📊 POWER BI CHARTS ROW 2: CICLO DE VIDA MENSUAL & MATRIZ DE ENVEJECIMIENTO (AGING RMM) */}
      <div 
        className="dashboard-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Chart 3: Estado de Casos por Mes (Stacked Bar Chart) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Estado de Casos por Mes (Distribución del Ciclo de Vida)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Composición mensual de tickets nuevos, en progreso, pendientes y cerrados
              </p>
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="shortMonth" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ color: '#00D1FF', fontWeight: '700' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="new" name="Nuevos / Abiertos" stackId="a" fill="#00D1FF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inProgress" name="En Progreso" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="pending" name="En Espera" stackId="a" fill="#f59e0b" />
                <Bar dataKey="resolved" name="Resueltos" stackId="a" fill="#10b981" />
                <Bar dataKey="closed" name="Cerrados" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: Matriz de Envejecimiento del Backlog (Ticket Aging Matrix RMM) */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Matriz de Antigüedad del Backlog (Aging)
              </h3>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#eff6ff', color: '#002D62', padding: '3px 8px', borderRadius: '6px' }}>
                Telemetría RMM
              </span>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Distribución de casos activos según el tiempo transcurrido desde su radicación
            </p>

            {/* Segmented Multi-Bar Progress */}
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', marginBottom: '1.25rem' }}>
              {ticketAging.map((tier, i) => (
                <div 
                  key={i} 
                  style={{ 
                    width: `${tier.percent}%`, 
                    background: tier.color, 
                    transition: 'width 0.6s ease' 
                  }} 
                  title={`${tier.label}: ${tier.count} tickets (${tier.percent}%)`}
                />
              ))}
            </div>

            {/* Aging Tiers List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ticketAging.map((tier, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tier.color }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{tier.label}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({tier.desc})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                      {tier.count} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>({tier.percent}%)</span>
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 800, 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      background: tier.key === 'more15d' && tier.count > 0 ? '#fee2e2' : '#f1f5f9',
                      color: tier.key === 'more15d' && tier.count > 0 ? '#dc2626' : '#475569'
                    }}>
                      {tier.statusBadge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ticketAging.find(t => t.key === 'more15d')?.count > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>
                Hay <strong>{ticketAging.find(t => t.key === 'more15d')?.count} ticket(s)</strong> con más de 15 días en espera de resolución.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 👥 POWER BI CHARTS ROW 3: PULSO DE TÉCNICOS & RADAR DE ATENCIÓN INMEDIATA */}
      <div 
        className="dashboard-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Card: Pulso y Carga de Trabajo del Equipo Técnico */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Pulso y Carga del Equipo Técnico
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#eff6ff', color: '#002D62', padding: '3px 8px', borderRadius: '6px' }}>
              Capacidad en Vivo
            </span>
          </div>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Monitoreo en tiempo real de la distribución de tickets activos y productividad por técnico
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {techniciansWorkload.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No hay técnicos registrados o activos
              </div>
            ) : (
              techniciansWorkload.map((tech) => (
                <div 
                  key={tech.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #002D62 0%, #00D1FF 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {tech.name?.charAt(0)?.toUpperCase() || 'T'}
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
                        {tech.name}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                        {tech.activeCount} activos · {tech.inProgressCount} en progreso · {tech.resolvedCount} resueltos
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: tech.loadColor === '#dc2626' ? '#fee2e2' : tech.loadColor === '#f59e0b' ? '#fef3c7' : '#ecfdf5',
                      color: tech.loadColor
                    }}>
                      {tech.loadStatus}
                    </span>
                    {!isLevel2 && (
                      <button
                        type="button"
                        onClick={() => handleFilterChange('unifiedScope', String(tech.id))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#002D62',
                          cursor: 'pointer'
                        }}
                        title="Auditar técnico en Dashboard"
                      >
                        Filtrar 🔍
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card: Radar de Atención Inmediata (Casos Críticos en Cola Activa) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Radar de Atención Inmediata (Casos Críticos)
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '6px' }}>
              Acción RMM
            </span>
          </div>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Tickets abiertos de máxima prioridad o sin técnico asignado que requieren intervención
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {urgentTicketsRadar.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#10b981', background: '#f0fdf4', borderRadius: '10px', border: '1px dashed #bbf7d0' }}>
                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.3rem' }}>🎉</span>
                <strong style={{ fontSize: '0.9rem' }}>¡Cola Crítica Despejada!</strong>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#15803d' }}>
                  No hay tickets críticos ni casos prioritarios desatendidos en este momento.
                </p>
              </div>
            ) : (
              urgentTicketsRadar.map((ticket) => {
                const isIncidencia = ticket.ticketType === 'Incidencia';
                const isCritical = ['CRITICAL', 'EMERGENCY', 'CRITICA', 'URGENTE'].includes(ticket.priority);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets?search=${ticket.id}`)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${isCritical ? '#dc2626' : '#ea580c'}`,
                      borderTop: '1px solid #f1f5f9',
                      borderRight: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#002D62' }}>#{ticket.id}</span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: isIncidencia ? '#fee2e2' : '#eff6ff',
                          color: isIncidencia ? '#ef4444' : '#2563eb'
                        }}>
                          {isIncidencia ? '🚨 Incidencia' : '📋 Solicitud'}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: isCritical ? '#dc2626' : '#ea580c',
                          color: '#fff'
                        }}>
                          {ticket.priority}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.title}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: ticket.assignedTo === 'Sin Asignar' ? '#dc2626' : '#002D62' }}>
                        👤 {ticket.assignedTo}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Hace {ticket.elapsedHours}h
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 📊 POWER BI CHARTS ROW 4: SEVERIDAD FUNCIONAL & CATEGORÍAS */}
      <div 
        className="dashboard-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Chart 4: Distribución Operativa por Severidad (100% Funcional e Interactiva) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Distribución Operativa por Severidad
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Haz clic en cualquier nivel para filtrar tickets activos en la plataforma
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#002D62', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
              Interactiva ⚡
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '1rem' }}>
            {severityList.map((sev) => {
              const isSelected = selectedSeverity === sev.priority;
              return (
                <div
                  key={sev.priority}
                  onClick={() => handleSeverityClick(sev.priority)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${sev.color}` : '1px solid #e2e8f0',
                    background: isSelected ? `${sev.color}10` : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.borderColor = sev.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.borderColor = isSelected ? sev.color : '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: sev.color }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        {sev.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: sev.color }}>
                      {sev.count} casos ({sev.percent}%)
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${sev.percent}%`,
                      height: '100%',
                      background: sev.color,
                      borderRadius: '4px',
                      transition: 'width 0.6s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 5: Principales Categorías de los Casos */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            Principales Categorías de Casos
          </h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Áreas de mayor demanda y recurrencia técnica
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCategories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No hay categorías registradas
              </div>
            ) : (
              topCategories.map((cat, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{cat.label}</span>
                    <span style={{ fontWeight: 800, color: '#002D62' }}>{cat.count} ({cat.percent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(cat.count / maxCategoryCount) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #00D1FF, #002D62)',
                      borderRadius: '4px',
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 📊 POWER BI CHARTS ROW 5: TIPOS DE TICKET Y CASOS POR DEPENDENCIAS & OFICINAS */}
      <div 
        className="dashboard-chart-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Chart 6: Principales Tipos de Solicitud por Caso (Donut Chart) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            Tipos de Ticket (Incidencias vs Solicitudes)
          </h3>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Distribución de casos según su clasificación institucional
          </p>

          <div style={{ height: '230px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topRequestTypes}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {topRequestTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#001D40', border: '1px solid rgba(0, 209, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Principales Casos por Dependencias & Oficinas */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Casos por Dependencias & Oficinas
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Demanda de tickets por áreas y espacios institucionales
              </p>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setStructureTab('dependencias')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: structureTab === 'dependencias' ? '#002D62' : 'transparent',
                  color: structureTab === 'dependencias' ? '#ffffff' : '#475569'
                }}
              >
                📁 Dependencias
              </button>
              <button
                type="button"
                onClick={() => setStructureTab('oficinas')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: structureTab === 'oficinas' ? '#002D62' : 'transparent',
                  color: structureTab === 'oficinas' ? '#ffffff' : '#475569'
                }}
              >
                🚪 Oficinas
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '0.75rem' }}>
            {currentStructureList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No hay {structureTab === 'dependencias' ? 'dependencias' : 'oficinas'} con tickets registrados
              </div>
            ) : (
              currentStructureList.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8125rem', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        {structureTab === 'dependencias' ? '📁 ' : '🚪 '}
                        {item.name || item.label}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>
                        {structureTab === 'dependencias' ? (item.sedeName || 'Sede Principal') : `${item.depName || 'Área'} · ${item.sedeName || 'Sede'}`}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {item.count} {item.count === 1 ? 'ticket' : 'tickets'} ({item.percent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(item.count / maxStructureCount) * 100}%`,
                      height: '100%',
                      background: structureTab === 'dependencias'
                        ? 'linear-gradient(90deg, #38bdf8, #0284c7)'
                        : 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                      borderRadius: '4px',
                      transition: 'width 0.8s ease'
                    }} />
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
