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
      className="stat-card analytics-stat-card"
      style={{
        '--card-accent': color,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Header row: title + icon */}
      <div className="analytics-stat-header">
        <span className="analytics-stat-title">
          {title}
        </span>
        <div 
          className="analytics-stat-icon"
          style={{ background: `${color}14` }}
        >
          {CARD_ICONS[iconType] || CARD_ICONS.tickets}
        </div>
      </div>

      {/* Value */}
      <h3 
        className="analytics-stat-value"
        style={{ color }}
      >
        {value}
      </h3>

      {/* Footer row: Trend + Mini Sparkline */}
      <div className="analytics-stat-footer">
        {trend !== undefined && trend !== null && (
          <span 
            className="analytics-stat-trend"
            style={{
              color: trendColor,
              background: `${trendColor}12`,
            }}
          >
            {isPositive ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}

        {/* Dynamic Sparkline */}
        <div className="analytics-stat-sparkline">
          <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" fill="none">
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
