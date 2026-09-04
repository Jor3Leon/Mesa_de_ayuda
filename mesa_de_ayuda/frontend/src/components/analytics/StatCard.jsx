import React from 'react';

const CARD_ICONS = {
  tickets: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M9 9h6M9 15h6" />
    </svg>
  ),
  clock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  monitor: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  time: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 14 10" />
    </svg>
  ),
  alert: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
}) {
  const isPositive = trend > 0;
  const trendColor = isPositive ? '#22c55e' : trend < 0 ? '#ef4444' : '#64748b';

  return (
    <div 
      className="stat-card analytics-stat-card"
      style={{
        '--card-accent': color,
        borderLeft: `3.5px solid ${color}`,
        background: '#ffffff',
        borderRadius: '10px',
        padding: '0.55rem 0.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '0.12rem',
        minHeight: '54px',
        boxSizing: 'border-box',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
          {badge && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '1px 3px',
              borderRadius: '4px',
              background: `${color}18`,
              color: color,
              whiteSpace: 'nowrap'
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ opacity: 0.85, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {CARD_ICONS[iconType] || CARD_ICONS.tickets}
        </div>
      </div>

      {/* Body row: Value & Subtitle / Trend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
        <strong style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', justifyContent: 'flex-end', flex: 1 }}>
          {trend !== undefined && trend !== null && trend !== 0 && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              color: trendColor,
              background: `${trendColor}14`,
              padding: '1px 3px',
              borderRadius: '3px',
              whiteSpace: 'nowrap'
            }}>
              {isPositive ? '↑' : '↓'}{Math.abs(trend)}%
            </span>
          )}
          {subtitle && (
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
