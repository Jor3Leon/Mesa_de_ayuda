import React, { useMemo } from 'react';
import { getAnsInfo } from '../../lib/ans-utils';

export default function AnsBadge({ ticket }) {
  const ans = useMemo(() => getAnsInfo(ticket), [ticket]);

  if (!ans) return null;

  const getColor = () => {
    if (ans.percentage >= 100) return '#e53e3e'; // Red
    if (ans.percentage >= 80) return '#dd6b20';  // Orange
    if (ans.percentage >= 50) return '#d69e2e';  // Yellow
    return '#38a169'; // Green
  };

  return (
    <div className="ans-badge-container" style={{ width: '100%', maxWidth: '150px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, color: getColor() }}>{ans.percentage}%</span>
        <span style={{ color: '#718096' }}>{ans.remainingText}</span>
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
          width: `${ans.percentage}%`, 
          backgroundColor: getColor(),
          transition: 'width 0.5s ease-in-out'
        }} />
      </div>
    </div>
  );
}
