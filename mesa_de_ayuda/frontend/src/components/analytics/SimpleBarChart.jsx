import React from 'react';

export default function SimpleBarChart({ data, title, color = '#3b82f6' }) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="card analytics-chart-card">
      <h4 className="analytics-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Tickets Activos</span>
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {data.map((item, index) => (
          <div 
            key={index} 
            className="bar-row"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              transition: 'transform 0.2s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.querySelector('.bar-fill').style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.querySelector('.bar-fill').style.filter = 'none';
            }}
          >
            {/* Label */}
            <span 
              className="analytics-bar-label"
              title={item.label}
              style={{
                fontSize: '0.8125rem',
                color: '#475569',
                fontWeight: 600,
                minWidth: '85px',
                maxWidth: '130px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {item.label}
            </span>

            {/* Bar container */}
            <div style={{
              flex: 1,
              height: '10px',
              background: '#f1f5f9',
              borderRadius: '5px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div 
                className="bar-fill"
                style={{
                  height: '100%',
                  width: `${(item.value / max) * 100}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  borderRadius: '5px',
                  transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  minWidth: '4px',
                  boxShadow: `0 2px 4px ${color}30`
                }} 
              />
            </div>

            {/* Value */}
            <span style={{
              fontSize: '0.8125rem',
              fontWeight: 800,
              color: '#1e293b',
              minWidth: '24px',
              textAlign: 'right',
            }}>
              {item.value}
            </span>
          </div>
        ))}
        {data.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', padding: '40px 0' }}>
            No hay técnicos activos en este rango
          </div>
        )}
      </div>
    </div>
  );
}
