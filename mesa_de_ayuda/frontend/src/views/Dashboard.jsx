import { useEffect, useState, useMemo } from 'react';
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
  Legend,
  LabelList
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
  sedesHierarchy: [],
  topDependencias: [],
  topOficinas: [],
  topEntities: [],
  severityDistribution: [],
  ticketsByPriority: {},
  ticketsByStatus: {}
};

const PIE_COLORS = ['#00D1FF', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const CALLOUT_PIE_COLORS = ['#0284c7', '#00D1FF', '#00c5a2', '#3b82f6', '#6366f1', '#f59e0b', '#10b981', '#0ea5e9'];

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

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [trendRange, setTrendRange] = useState('30d'); // '30d' | '12m'
  const [yearlyMetric, setYearlyMetric] = useState('creationVsResolution'); // 'creationVsResolution' | 'incidentsVsRequests'
  const [selectedSedeId, setSelectedSedeId] = useState(null);
  const [selectedDepId, setSelectedDepId] = useState(null);
  const [selectedOficinaId, setSelectedOficinaId] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState(null);

  const userRoleStr = (typeof user?.role === 'string' ? user.role : user?.role?.name || '').trim().toUpperCase();
  const isLevel2 = userRoleStr === 'NIVEL 2' || userRoleStr === 'LEVEL_2' || userRoleStr === 'TECNICO NIVEL 2' || userRoleStr === 'TÉCNICO NIVEL 2' || (userRoleStr.includes('NIVEL 2') && !userRoleStr.includes('NIVEL 1') && !userRoleStr.includes('NIVEL 3'));
  const isLevel1 = userRoleStr === 'NIVEL 1' || userRoleStr === 'LEVEL_1' || userRoleStr.includes('NIVEL 1');
  const isLevel3 = userRoleStr === 'NIVEL 3' || userRoleStr === 'LEVEL_3' || userRoleStr.includes('NIVEL 3') || userRoleStr.includes('SUPERVISOR');
  const isAdmin = userRoleStr === 'ADMIN' || userRoleStr === 'ADMINISTRADOR';
  const isStandardUser = userRoleStr === 'USUARIO ESTANDAR' || userRoleStr === 'STANDARD_USER';

  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${currentYear}-${mm}-${dd}`;

    return {
      unifiedScope: isLevel2 || isStandardUser ? 'personal' : 'global',
      startDate: startOfYear,
      endDate: today
    };
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const techniciansList = useMemo(() => {
    const raw = data?.technicians || [];
    return raw.filter((t) => {
      const role = (t.role || '').toUpperCase();
      // Excluir usuarios estándar
      if (role.includes('ESTANDAR') || role.includes('ESTÁNDAR') || role.includes('STANDARD')) return false;
      // Solo incluir roles evaluables: Administrador, Nivel 1, Nivel 2, Nivel 3
      return (
        role.includes('ADMIN') ||
        role.includes('1') ||
        role.includes('2') ||
        role.includes('3') ||
        role.includes('TECNICO') ||
        role.includes('TÉCNICO')
      );
    });
  }, [data?.technicians]);

  // Jerarquía Completa para la tarjeta "Casos por Ubicación"
  const sedesHierarchy = useMemo(() => {
    return data?.sedesHierarchy || [];
  }, [data?.sedesHierarchy]);

  // Sede activa: SÓLO si el usuario seleccionó una sede específica en el filtro
  const activeSede = useMemo(() => {
    if (!sedesHierarchy.length || !selectedSedeId || selectedSedeId === 'ALL') return null;
    return sedesHierarchy.find(s => String(s.id) === String(selectedSedeId)) || null;
  }, [sedesHierarchy, selectedSedeId]);

  // Todas las dependencias consolidadas
  const allDependencias = useMemo(() => {
    return sedesHierarchy.flatMap(s => s.dependencias || []);
  }, [sedesHierarchy]);

  // Dependencias disponibles según la Sede (si es "Todas", se muestran todas)
  const availableDependencias = useMemo(() => {
    return activeSede ? (activeSede.dependencias || []) : allDependencias;
  }, [activeSede, allDependencias]);

  // Dependencia activa: SÓLO si el usuario seleccionó una dependencia específica
  const activeDep = useMemo(() => {
    if (!availableDependencias.length || !selectedDepId || selectedDepId === 'ALL') return null;
    return availableDependencias.find(d => String(d.id) === String(selectedDepId)) || null;
  }, [availableDependencias, selectedDepId]);

  // Todas las oficinas según las dependencias disponibles
  const allOficinas = useMemo(() => {
    return availableDependencias.flatMap(d => d.oficinas || []);
  }, [availableDependencias]);

  // Oficinas disponibles según la Dependencia seleccionada
  const availableOficinas = useMemo(() => {
    return activeDep ? (activeDep.oficinas || []) : allOficinas;
  }, [activeDep, allOficinas]);

  const filteredOficinas = useMemo(() => {
    if (!availableOficinas.length) return [];
    if (selectedOficinaId != null && selectedOficinaId !== 'ALL' && selectedOficinaId !== '') {
      return availableOficinas.filter(o => String(o.id) === String(selectedOficinaId));
    }
    return availableOficinas;
  }, [availableOficinas, selectedOficinaId]);

  // Preparar datos para el Donut Chart de Dependencias
  const pieDependencias = useMemo(() => {
    if (!availableDependencias.length) return [];
    const total = availableDependencias.reduce((sum, d) => sum + (Number(d?.count) || 0), 0);
    if (total > 0) {
      // Priorizar dependencias con tickets para que las etiquetas quepan limpias y legibles
      const withTickets = availableDependencias.filter(d => (Number(d?.count) || 0) > 0);
      const targetList = withTickets.length > 0 ? withTickets : availableDependencias;
      return targetList.map((d) => {
        const count = Number(d?.count) || 0;
        return {
          ...d,
          value: count > 0 ? count : 0.05,
          realCount: count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0
        };
      });
    }
    return availableDependencias.map((d) => ({
      ...d,
      value: 1,
      realCount: 0,
      pct: 0
    }));
  }, [availableDependencias]);

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

  const maxCategoryCount = Math.max(...topCategories.map(c => c.count), 1);
  const maxStructureCount = Math.max(...topDependencias.map(s => s.count), 1);

  return (
    <div className="dashboard-view-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 1. HERO HEADER (Limpio y libre de controles internos) */}
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
          ⚡
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 className="dashboard-hero-title" style={{ fontSize: '1.55rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Dashboard
            </h1>
          </div>
          <p className="dashboard-hero-subtitle" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
            {isPersonalScope 
              ? 'Control individual de tickets asignados, tiempos de respuesta y estados de atención.'
              : 'Métricas, estadísticas, tendencias anuales, distribución de severidad y control de acuerdos ANS.'
            }
          </p>
        </div>
      </div>

      {/* 🎛️ 2. BARRA DE HERRAMIENTAS & FILTROS UNIFICADA (Debajo del Header) */}
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
            <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Hasta
            </span>
            <input
              type="date"
              className="dashboard-toolbar-input"
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
            <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Alcance / Técnico Asignado
            </span>
            <select
              className="dashboard-toolbar-select"
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
            className="dashboard-export-btn"
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))',
          gap: '0.65rem',
          marginBottom: '1.25rem'
        }}
      >
        {/* Total Tickets */}
        <div 
          onClick={() => navigate('/tickets')}
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #3b82f6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(59, 130, 246, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total Tickets
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>📑</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.totalTickets.toLocaleString()}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Inc: <strong style={{ color: '#ef4444' }}>{k.incidentCount}</strong> · Sol: <strong style={{ color: '#002D62' }}>{k.requestCount}</strong>
            </span>
          </div>
        </div>

        {/* Tickets Desfasados / Retrasados */}
        <div 
          onClick={() => navigate('/tickets?overdue=true')}
          className="stat-card"
          style={{
            background: k.overdueTickets > 0 ? '#fff5f5' : '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: k.overdueTickets > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderLeft: '3.5px solid #dc2626',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(220, 38, 38, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Desfasados
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⚠️</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.overdueTickets}
            </strong>
            <span style={{ fontSize: '0.67rem', color: k.overdueTickets > 0 ? '#b91c1c' : '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              {k.overdueTickets > 0 ? 'SLA excedido' : 'Al día'}
            </span>
          </div>
        </div>

        {/* Tickets Asignados */}
        <div 
          onClick={() => navigate('/tickets')}
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #0284c7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(2, 132, 199, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Asignados
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>👤</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#002D62', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.assignedTickets}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Con técnico
            </span>
          </div>
        </div>

        {/* Tickets Planificados / En Progreso */}
        <div 
          onClick={() => navigate('/tickets?status=IN_PROGRESS')}
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #8b5cf6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(139, 92, 246, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              En Progreso
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⚡</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.inProgressTickets}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              En atención
            </span>
          </div>
        </div>

        {/* Tickets Pendientes / En Espera */}
        <div 
          onClick={() => navigate('/tickets?status=PENDING')}
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #f59e0b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(245, 158, 11, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              En Espera
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⏳</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.pendingTickets}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Respuesta ext.
            </span>
          </div>
        </div>

        {/* Tickets Resueltos */}
        <div 
          onClick={() => navigate('/tickets?status=RESOLVED')}
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #10b981',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(16, 185, 129, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Resueltos
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>✅</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.resolvedTickets}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Solucionados
            </span>
          </div>
        </div>

        {/* Tickets Cerrados */}
        <div 
          onClick={() => navigate('/tickets?status=CLOSED')}
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #64748b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px -3px rgba(100, 116, 139, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Cerrados
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>🔒</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#475569', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.closedTickets}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Conformidad
            </span>
          </div>
        </div>

        {/* Cumplimiento ANS */}
        <div 
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #059669',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Cumplimiento ANS
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>🎯</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {k.slaCompliance}%
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Meta: &gt;95%
            </span>
          </div>
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

          <div style={{ width: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height={280} minWidth={100}>
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
                <XAxis dataKey="shortMonth" stroke="#94a3b8" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                {yearlyMetric === 'creationVsResolution' ? (
                  <>
                    <Area isAnimationActive={false} type="monotone" name="Casos Creados" dataKey="created" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#yearCreatedGrad)" />
                    <Area isAnimationActive={false} type="monotone" name="Casos Resueltos" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#yearResolvedGrad)" />
                  </>
                ) : (
                  <>
                    <Area isAnimationActive={false} type="monotone" name="Incidencias" dataKey="incidents" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#yearIncGrad)" />
                    <Area isAnimationActive={false} type="monotone" name="Solicitudes" dataKey="requests" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#yearCreatedGrad)" />
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

          <div style={{ width: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height={280} minWidth={100}>
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
                    <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#00D1FF" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey={trendRange === '30d' ? 'name' : 'shortMonth'} stroke="#94a3b8" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area isAnimationActive={false} type="monotone" name="Incidencias" dataKey="incidents" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#trendIncGrad)" />
                <Area isAnimationActive={false} type="monotone" name="Solicitudes" dataKey="requests" stroke="#00D1FF" strokeWidth={2.5} fillOpacity={1} fill="url(#trendReqGrad)" />
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

          <div style={{ width: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height={280} minWidth={100}>
              <BarChart data={monthlyStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="shortMonth" stroke="#94a3b8" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar isAnimationActive={false} dataKey="new" name="Nuevos / Abiertos" stackId="a" fill="#00D1FF" radius={[0, 0, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="inProgress" name="En Progreso" stackId="a" fill="#8b5cf6" />
                <Bar isAnimationActive={false} dataKey="pending" name="En Espera" stackId="a" fill="#f59e0b" />
                <Bar isAnimationActive={false} dataKey="resolved" name="Resueltos" stackId="a" fill="#10b981" />
                <Bar isAnimationActive={false} dataKey="closed" name="Cerrados" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
                          {tech.name}
                        </span>
                        {tech.role && (
                          <span style={{ fontSize: '0.66rem', color: '#002D62', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {typeof tech.role === 'string' ? tech.role : tech.role?.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px', fontSize: '0.72rem', color: '#475569' }}>
                        <span><strong>{tech.assignedCount ?? (tech.unresolvedCount != null && tech.resolvedCount != null ? tech.unresolvedCount + tech.resolvedCount : tech.activeCount ?? 0)}</strong> asignados</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ color: (tech.unresolvedCount ?? tech.activeCount ?? 0) > 0 ? '#dc2626' : '#475569' }}>
                          <strong>{tech.unresolvedCount ?? tech.activeCount ?? 0}</strong> sin resolver
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ color: (tech.inProgressCount || 0) > 0 ? '#7c3aed' : '#475569' }}>
                          <strong>{tech.inProgressCount ?? 0}</strong> en progreso
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ color: (tech.pendingCount || 0) > 0 ? '#d97706' : '#475569' }}>
                          <strong>{tech.pendingCount ?? 0}</strong> en espera
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: (tech.unresolvedCount ?? tech.activeCount ?? 0) === 0 ? '#ecfdf5' : '#fef2f2',
                      color: (tech.unresolvedCount ?? tech.activeCount ?? 0) === 0 ? '#059669' : '#dc2626',
                      border: (tech.unresolvedCount ?? tech.activeCount ?? 0) === 0 ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: (tech.unresolvedCount ?? tech.activeCount ?? 0) === 0 ? '#10b981' : '#ef4444' }} />
                      {(tech.unresolvedCount ?? tech.activeCount ?? 0) === 0 ? 'Disponible' : 'No Disponible'}
                    </span>
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

          <div style={{ width: '100%', minHeight: '230px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height={230} minWidth={100}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
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
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 📍 SECCIÓN: CASOS POR UBICACIÓN (CON FILTROS DINÁMICOS SUPERIORES Y GRÁFICAS PLANAS SIMÉTRICAS) */}
      <div 
        className="dashboard-chart-card" 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
          marginTop: '1.5rem'
        }}
      >
        {/* Encabezado Principal de la Tarjeta con Filtros Dinámicos */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: '20px',
          flexWrap: 'nowrap'
        }}>
          <div style={{ flex: '1 1 auto', minWidth: '220px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Casos por Ubicación
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Filtra dinámicamente por Sede, Dependencia y Oficina en tiempo real.
            </p>
          </div>

          {/* Barra de Filtros Dinámicos (Fija en posición, sin desplazamientos) */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            flexShrink: 0,
            flexWrap: 'nowrap'
          }}>
            {/* Filtro 1: Sede */}
            <div>
              <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Sede
              </span>
              <select
                id="filter-sede-select"
                className="dashboard-toolbar-select"
                value={selectedSedeId || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setSelectedSedeId(val);
                  setSelectedDepId(null);
                  setSelectedOficinaId(null);
                }}
                style={{
                  padding: '7px 12px',
                  border: selectedSedeId ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '160px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Todas</option>
                {sedesHierarchy.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 2: Dependencia */}
            <div>
              <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Dependencia
              </span>
              <select
                id="filter-dep-select"
                className="dashboard-toolbar-select"
                value={selectedDepId || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setSelectedDepId(val);
                  setSelectedOficinaId(null);
                }}
                style={{
                  padding: '7px 12px',
                  border: selectedDepId ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '180px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Todas</option>
                {availableDependencias.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 3: Oficina */}
            <div>
              <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Oficina
              </span>
              <select
                id="filter-ofi-select"
                className="dashboard-toolbar-select"
                value={selectedOficinaId || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setSelectedOficinaId(val);
                }}
                style={{
                  padding: '7px 12px',
                  border: selectedOficinaId ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '170px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Todas</option>
                {availableOficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Las 3 Gráficas Planas y Simétricas en Paralelo (Sede, Dependencia, Oficina) */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.25rem',
            alignItems: 'stretch'
          }}
        >
          {/* ============================================================ */}
          {/* GRÁFICA 1: SEDE (Horizontal Bar Chart Plana y Simétrica)     */}
          {/* ============================================================ */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            minHeight: '360px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                  🏛️
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                    SEDE
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {sedesHierarchy.length} {sedesHierarchy.length === 1 ? 'sede registrada' : 'sedes registradas'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: activeSede ? '#0284c7' : '#64748b', fontWeight: 700, background: activeSede ? '#eff6ff' : '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
                {activeSede ? activeSede.name : 'Todas las sedes'}
              </span>
            </div>

            {sedesHierarchy.length === 0 ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Sin sedes registradas
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={sedesHierarchy}
                    margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
                    barSize={14}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} domain={[0, (dataMax) => (Number.isFinite(dataMax) ? Math.max(dataMax + 1, 2) : 2)]} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#475569"
                      fontSize={11}
                      width={110}
                      tick={({ x, y, payload }) => {
                        const isSelected = activeSede && payload.value === activeSede.name;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={-8}
                              y={4}
                              textAnchor="end"
                              fill={isSelected ? '#0284c7' : '#334155'}
                              fontWeight={isSelected ? 800 : 600}
                              fontSize={11}
                            >
                              {payload.value.length > 14 ? `${payload.value.slice(0, 13)}…` : payload.value}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="count" name="Tickets" radius={[0, 8, 8, 0]}>
                      {sedesHierarchy.map((entry, index) => {
                        const isSelected = activeSede && entry.id === activeSede.id;
                        return (
                          <Cell
                            key={`cell-sede-${index}`}
                            fill={isSelected ? '#00D1FF' : '#0284c7'}
                            stroke={isSelected ? '#002D62' : '#0369a1'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        );
                      })}
                      <LabelList 
                        dataKey="count" 
                        position="right" 
                        fill="#475569" 
                        fontSize={10} 
                        fontWeight={700}
                        formatter={(val) => `${val} ${val === 1 ? 'ticket' : 'tickets'}`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
              <span>Total en sedes:</span>
              <strong style={{ color: '#0f172a' }}>{sedesHierarchy.reduce((s, x) => s + (Number(x.count) || 0), 0)} tickets</strong>
            </div>
          </div>

          {/* ============================================================ */}
          {/* GRÁFICA 2: DEPENDENCIA (Donut Chart - Dona con innerRadius)  */}
          {/* ============================================================ */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            minHeight: '360px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: activeSede ? '#eff6ff' : '#f8fafc', color: activeSede ? '#1d4ed8' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                  📁
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                    DEPENDENCIA
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {availableDependencias.length} {availableDependencias.length === 1 ? 'dependencia' : 'dependencias'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: activeDep ? '#0284c7' : (activeSede ? '#0369a1' : '#64748b'), fontWeight: 700, background: activeSede ? '#eff6ff' : '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
                {activeDep ? activeDep.name : (activeSede ? activeSede.name : 'Todas')}
              </span>
            </div>

            {availableDependencias.length === 0 || pieDependencias.every(p => p.realCount === 0) ? (
              /* Muestra la dona en cero / sin valor (sin mensaje "Gráfica no activada") */
              <div style={{ width: '100%', height: 260, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart margin={{ top: 15, right: 35, bottom: 15, left: 35 }}>
                    <Pie
                      data={[{ name: 'Sin datos', value: 1 }]}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={66}
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    >
                      <Cell fill="#f8fafc" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>0</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>Tickets</div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart margin={{ top: 15, right: 35, bottom: 15, left: 35 }}>
                    <Pie
                      data={pieDependencias}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={66}
                      labelLine={{ stroke: '#64748b', strokeWidth: 1.2 }}
                      label={({ name, pct, x, y, cx }) => {
                        const percentage = pct > 0 ? ` (${pct}%)` : '';
                        const isRight = x > cx;

                        if (name.length <= 18) {
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#1e293b"
                              textAnchor={isRight ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize={9}
                              fontWeight={700}
                            >
                              {`${name}${percentage}`}
                            </text>
                          );
                        }

                        const words = name.split(' ');
                        let l1 = '';
                        let l2 = '';
                        for (let i = 0; i < words.length; i++) {
                          if ((l1 + ' ' + words[i]).trim().length <= 16 && !l2) {
                            l1 = (l1 + ' ' + words[i]).trim();
                          } else {
                            l2 = (l2 + ' ' + words[i]).trim();
                          }
                        }

                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#1e293b"
                            textAnchor={isRight ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={8.5}
                            fontWeight={700}
                          >
                            <tspan x={x} dy="-0.55em">{l1}</tspan>
                            <tspan x={x} dy="1.15em">{`${l2}${percentage}`}</tspan>
                          </text>
                        );
                      }}
                    >
                      {pieDependencias.map((entry, index) => {
                        const isSelected = activeDep && entry.id === activeDep.id;
                        const color = CALLOUT_PIE_COLORS[index % CALLOUT_PIE_COLORS.length];
                        return (
                          <Cell
                            key={`cell-dep-${index}`}
                            fill={color}
                            stroke={isSelected ? '#0f172a' : '#ffffff'}
                            strokeWidth={isSelected ? 3 : 1.5}
                            style={{
                              filter: isSelected ? 'drop-shadow(0px 0px 8px rgba(0,0,0,0.35))' : 'none'
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centro de la dona con el total de tickets de las dependencias */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {availableDependencias.reduce((s, x) => s + (Number(x.count) || 0), 0)}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                    Tickets
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
              <span>Total en dependencias:</span>
              <strong style={{ color: '#0f172a' }}>
                {`${availableDependencias.reduce((s, x) => s + (Number(x.count) || 0), 0)} tickets`}
              </strong>
            </div>
          </div>

          {/* ============================================================ */}
          {/* GRÁFICA 3: OFICINA (Column Chart)                            */}
          {/* ============================================================ */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            minHeight: '360px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: activeDep ? '#f0fdf4' : '#f8fafc', color: activeDep ? '#15803d' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                  🚪
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                    OFICINA
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {filteredOficinas.length} {filteredOficinas.length === 1 ? 'oficina' : 'oficinas'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: selectedOficinaId ? '#0284c7' : (activeDep ? '#15803d' : '#94a3b8'), fontWeight: 700, background: activeDep ? '#f0fdf4' : '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
                {selectedOficinaId ? (availableOficinas.find(o => String(o.id) === String(selectedOficinaId))?.name || 'Oficina') : (activeDep ? activeDep.name : 'Todas')}
              </span>
            </div>

            {filteredOficinas.length === 0 || filteredOficinas.every(o => (Number(o?.count) || 0) === 0) ? (
              /* Gráfica de barras en cero / sin valor (sin mensaje "Gráfica no activada") */
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[{ name: 'Sin datos', count: 0 }]}
                    margin={{ top: 20, right: 15, left: -20, bottom: 25 }}
                    barSize={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      allowDecimals={false}
                      domain={[0, 3]}
                    />
                    <Bar
                      dataKey="count"
                      name="Tickets"
                      fill="#00c5a2"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={filteredOficinas}
                    margin={{ top: 20, right: 15, left: -20, bottom: 25 }}
                    barSize={16}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#475569"
                      fontSize={10}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tick={({ x, y, payload }) => (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={12}
                            textAnchor="end"
                            fill="#475569"
                            fontSize={10}
                            fontWeight={600}
                            transform="rotate(-20)"
                          >
                            {payload.value.length > 14 ? `${payload.value.slice(0, 13)}…` : payload.value}
                          </text>
                        </g>
                      )}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      allowDecimals={false}
                      domain={[0, (dataMax) => (Number.isFinite(dataMax) ? Math.max(dataMax + 1, 3) : 3)]}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Tickets"
                      fill="#00c5a2"
                      radius={[6, 6, 0, 0]}
                    >
                      {filteredOficinas.map((entry, index) => {
                        const isSelected = selectedOficinaId && String(entry.id) === String(selectedOficinaId);
                        return (
                          <Cell 
                            key={`cell-ofi-${index}`} 
                            fill={isSelected ? '#0284c7' : '#00c5a2'} 
                            stroke={isSelected ? '#002D62' : '#059669'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        );
                      })}
                      <LabelList 
                        dataKey="count" 
                        position="top" 
                        fill="#0f172a" 
                        fontSize={10} 
                        fontWeight={700}
                        formatter={(val) => (val > 0 ? val : '')}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
              <span>Total en oficinas:</span>
              <strong style={{ color: '#0f172a' }}>
                {`${filteredOficinas.reduce((sum, o) => sum + (Number(o?.count) || 0), 0)} tickets`}
              </strong>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
