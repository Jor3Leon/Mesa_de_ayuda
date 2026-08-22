import React from 'react';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getHeatColor(intensity) {
  if (intensity === 0) return '#f1f5f9';
  if (intensity <= 0.2) return '#dbeafe';
  if (intensity <= 0.4) return '#93c5fd';
  if (intensity <= 0.6) return '#60a5fa';
  if (intensity <= 0.8) return '#3b82f6';
  return '#1d4ed8';
}

export default function HeatmapChart({ recentActivity = [], title = 'Mapa de Calor de Actividad' }) {
  // Generate 4 weeks x 7 days = 28 cells
  const WEEKS = 4;
  const DAYS = 7;

  // Build day counts from real activity
  const now = new Date();
  const dayCounts = {};
  for (let i = 0; i < WEEKS * DAYS; i++) {
    dayCounts[i] = 0;
  }

  if (recentActivity && recentActivity.length > 0) {
    recentActivity.forEach(a => {
      const d = new Date(a.createdAt);
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < WEEKS * DAYS) {
        dayCounts[diffDays] = (dayCounts[diffDays] || 0) + 1;
      }
    });
  }

  const countsArray = Object.values(dayCounts);
  const maxCount = Math.max(...countsArray, 1);
  const totalActivity = countsArray.reduce((a, b) => a + b, 0);

  const cells = [];
  // Reverse loop to show most recent at the end (standard heatmap flow)
  for (let i = (WEEKS * DAYS) - 1; i >= 0; i--) {
    const count = dayCounts[i] || 0;
    const intensity = count / maxCount;
    cells.push({ intensity, count, dayIndex: i });
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <h4 style={{
          margin: 0,
          fontSize: '0.9375rem',
          color: '#1e293b',
          fontWeight: 700,
        }}>{title}</h4>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#3b82f6' }}>{totalActivity}</div>
          <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Eventos 28d</div>
        </div>
      </div>

      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        marginBottom: '8px',
      }}>
        {DAY_LABELS.map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: '0.6875rem',
            color: '#94a3b8',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        flex: 1,
      }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            title={`${cell.count} tickets`}
            style={{
              aspectRatio: '1/1',
              background: getHeatColor(cell.intensity),
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: cell.intensity > 0.6 ? 'white' : '#64748b',
              opacity: cell.count === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              e.currentTarget.style.zIndex = '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.zIndex = '1';
            }}
          >
            {cell.count > 0 && cell.count}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        gap: '8px',
        paddingTop: '16px',
        borderTop: '1px solid #f1f5f9'
      }}>
        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map(lvl => (
          <div key={lvl} style={{
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            background: getHeatColor(lvl)
          }} />
        ))}
        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>Más</span>
      </div>
    </div>
  );
}
