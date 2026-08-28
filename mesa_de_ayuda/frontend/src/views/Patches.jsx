import React, { useState } from 'react';

const initialPatches = [
  { id: 'KB5034765', name: 'Security Update for Windows 11 (CVE-2026-1102)', severity: 'CRITICAL', status: 'Pendiente', target: 'PC-ADMIN-01', releaseDate: '2026-08-15' },
  { id: 'KB5034441', name: 'Cumulative Update for .NET Framework 4.8.1', severity: 'NORMAL', status: 'Pendiente', target: 'SRV-DATA-01', releaseDate: '2026-08-18' },
  { id: 'Chrome-128', name: 'Google Chrome Zero-Day Security Fix', severity: 'CRITICAL', status: 'Programado', target: 'Flota General (45 PCs)', releaseDate: '2026-08-22' },
  { id: 'UBUNTU-SEC-44', name: 'OpenSSL Kernel Patch for Database Nodes', severity: 'HIGH', status: 'Aplicado', target: 'SRV-PROD-DB', releaseDate: '2026-08-25' },
];

export default function Patches() {
  const [patches, setPatches] = useState(initialPatches);
  const [feedback, setFeedback] = useState('');

  const handleDeploy = (id) => {
    setPatches(prev => prev.map(p => p.id === id ? { ...p, status: 'Desplegando...' } : p));
    setTimeout(() => {
      setPatches(prev => prev.map(p => p.id === id ? { ...p, status: 'Aplicado' } : p));
      setFeedback(`Parche ${id} desplegado y verificado exitosamente en el endpoint.`);
    }, 1500);
  };

  const criticalCount = patches.filter(p => p.severity === 'CRITICAL' && p.status !== 'Aplicado').length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO CONTROL BAR */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        marginBottom: '1.75rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            fontSize: '1.25rem'
          }}>
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Gestión de Parches & Seguridad (Hardening)
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                RMM Sec v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Orquestación de actualizaciones críticas del sistema operativo y remediación de vulnerabilidades.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Críticos Pendientes</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: criticalCount > 0 ? '#f87171' : '#34d399' }}>{criticalCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Total Parches</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>{patches.length}</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
          ✅ {feedback}
        </div>
      )}

      {/* TABLE CARD */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
          Cola de Despliegue de Seguridad
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Identificador KB</th>
                <th style={{ padding: '0.75rem 1rem' }}>Descripción del Parche</th>
                <th style={{ padding: '0.75rem 1rem' }}>Severidad</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Equipo / Flota Objetivo</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {patches.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#2563eb' }}>
                    {p.id}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: '#0f172a' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      background: p.severity === 'CRITICAL' ? '#fee2e2' : '#eff6ff',
                      color: p.severity === 'CRITICAL' ? '#991b1b' : '#1e40af'
                    }}>
                      {p.severity}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      background: p.status === 'Aplicado' ? '#ecfdf5' : p.status === 'Programado' ? '#fef3c7' : '#f1f5f9',
                      color: p.status === 'Aplicado' ? '#047857' : p.status === 'Programado' ? '#92400e' : '#475569'
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                    💻 {p.target}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    {p.status !== 'Aplicado' ? (
                      <button
                        onClick={() => handleDeploy(p.id)}
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Desplegar →
                      </button>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.8rem' }}>✓ Protegido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
