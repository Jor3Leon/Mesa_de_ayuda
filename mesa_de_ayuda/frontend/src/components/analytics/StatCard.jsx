import React from 'react';

const CARD_ICONS = {
  tickets: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M9 9h6M9 15h6" />
    </svg>
  ),
  clock: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  monitor: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  time: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 14 10" />
    </svg>
  ),
  alert: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export default function StatCard({ 
  title, 
  value, 
  subtitle,
  badge,
  trend, 
  iconType = 'tickets', 
  color = '#3b82f6', 
  sparkline 
}) {
  const isPositive = trend > 0;
  const trendColor = isPositive ? '#22c55e' : trend < 0 ? '#ef4444' : '#64748b';
  
  const generatePath = (data) => {
    if (!data || data.length < 2) return "M0 12 L 100 12";
    const max = Math.max(...data) || 1;
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 24;
    
    return data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const sparkPath = generatePath(sparkline);

  return (
    <div 
      className="stat-card analytics-stat-card"
      style={{
        '--card-accent': color,
        borderLeft: `4px solid ${color}`,
        background: '#ffffff',
        borderRadius: '14px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* Header row */}
      <div className="analytics-stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <span className="analytics-stat-title" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            {title}
          </span>
          {badge && (
            <span style={{
              marginLeft: '6px',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '4px',
              background: `${color}18`,
              color: color
            }}>
              {badge}
            </span>
          )}
        </div>
        <div 
          className="analytics-stat-icon"
          style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '8px', 
            background: `${color}14`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          {CARD_ICONS[iconType] || CARD_ICONS.tickets}
        </div>
      </div>

      {/* Value & Subtitle */}
      <div>
        <h3 
          className="analytics-stat-value"
          style={{ color: '#0f172a', fontSize: '1.85rem', fontWeight: 900, margin: '0 0 0.25rem 0', lineHeight: 1.1 }}
        >
          {value}
        </h3>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Footer row */}
      <div className="analytics-stat-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f8fafc' }}>
        {trend !== undefined && trend !== null ? (
          <span 
            className="analytics-stat-trend"
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: trendColor,
              background: `${trendColor}12`,
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            {isPositive ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% vs anterior
          </span>
        ) : (
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Estabilidad operativa</span>
        )}

        {/* Mini Sparkline */}
        {sparkline && (
          <div className="analytics-stat-sparkline" style={{ width: '70px', height: '20px' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" fill="none">
              <path
                d={sparkPath}
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

