import React from 'react';

const DONUT_COLORS = {
  priority: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  status: ['#1e40af', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
};

export default function SimplePieChart({ data, title, colorScheme = 'priority' }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = DONUT_COLORS[colorScheme] || DONUT_COLORS.priority;

  // Calculate SVG donut segments
  const segments = [];
  let accumulatedPercent = 0;

  data.forEach((item, index) => {
    const percent = total > 0 ? (item.value / total) * 100 : 0;
    const strokeDasharray = `${percent} ${100 - percent}`;
    const strokeDashoffset = -(accumulatedPercent);
    accumulatedPercent += percent;

    segments.push({
      ...item,
      percent,
      strokeDasharray,
      strokeDashoffset,
      color: colors[index % colors.length],
    });
  });

  return (
    <div className="card analytics-chart-card">
      <h4 className="analytics-card-title">{title}</h4>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        flex: 1,
        minWidth: 0,
      }}>
        {/* Donut chart */}
        <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke={seg.color}
                strokeWidth={4}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                style={{ 
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.05))'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.strokeWidth = '6';
                  e.currentTarget.style.filter = 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.1))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.strokeWidth = '4';
                  e.currentTarget.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.05))';
                }}
              />
            ))}
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1, letterSpacing: '-0.02em', margin: '2px 0' }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 500 }}>Tickets</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px', flex: 1 }}>
          {segments.map((seg, i) => {
            const pct = Math.round(seg.percent);
            return (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  transition: 'background 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: seg.color,
                    flexShrink: 0,
                  }} />
                  <span style={{ color: '#475569', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {seg.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>{seg.value}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
