import React from 'react';

const CARD_ICONS = {
  tickets: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M9 9h6M9 15h6" />
    </svg>
  ),
  clock: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  monitor: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
};

export default function StatCard({ title, value, trend, iconType = 'tickets', color = '#3b82f6', sparkline }) {
  const isPositive = trend > 0;
  const trendColor = isPositive ? '#22c55e' : trend < 0 ? '#ef4444' : '#64748b';
  
  // Generate dynamic sparkline path
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
      className="stat-card"
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      {/* Header row: title + icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#64748b',
          letterSpacing: '0.01em',
        }}>
          {title}
        </span>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `${color}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {CARD_ICONS[iconType] || CARD_ICONS.tickets}
        </div>
      </div>

      {/* Value */}
      <h3 style={{
        fontSize: '2.25rem',
        fontWeight: 800,
        color: color,
        margin: 0,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </h3>

      {/* Footer row: Trend + Mini Sparkline */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '4px'
      }}>
        {trend !== undefined && trend !== null && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: trendColor,
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: `${trendColor}10`,
            padding: '2px 8px',
            borderRadius: '12px',
          }}>
            {isPositive ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}

        {/* Dynamic Sparkline */}
        <div style={{ width: '60px', height: '24px' }}>
          <svg width="60" height="24" viewBox="0 0 100 24" fill="none">
            <path
              d={sparkPath}
              stroke={trendColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: `drop-shadow(0 2px 4px ${trendColor}40)`
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
