import React, { useMemo } from 'react';
import { getSlaInfo } from '../../lib/sla-utils';

export default function SlaBadge({ ticket }) {
  const sla = useMemo(() => getSlaInfo(ticket), [ticket]);

  if (!sla) return null;

  const getColor = () => {
    if (sla.percentage >= 100) return '#e53e3e'; // Red
    if (sla.percentage >= 80) return '#dd6b20';  // Orange
    if (sla.percentage >= 50) return '#d69e2e';  // Yellow
    return '#38a169'; // Green
  };

  return (
    <div className="sla-badge-container" style={{ width: '100%', maxWidth: '150px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, color: getColor() }}>{sla.percentage}%</span>
        <span style={{ color: '#718096' }}>{sla.remainingText}</span>
      </div>
      <div style={{ 
        height: '6px', 
        width: '100%', 
        backgroundColor: '#edf2f7', 
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          height: '100%', 
          width: `${sla.percentage}%`, 
          backgroundColor: getColor(),
          transition: 'width 0.5s ease-in-out'
        }} />
      </div>
    </div>
  );
}
