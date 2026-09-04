import React, { useState, useMemo } from 'react';

const initialPatches = [
  { id: 'KB5034765', name: 'Security Update for Windows 11 (CVE-2026-1102)', severity: 'CRITICAL', status: 'Pendiente', target: 'PC-ADMIN-01', releaseDate: '2026-08-15' },
  { id: 'KB5034441', name: 'Cumulative Update for .NET Framework 4.8.1', severity: 'NORMAL', status: 'Pendiente', target: 'SRV-DATA-01', releaseDate: '2026-08-18' },
  { id: 'Chrome-128', name: 'Google Chrome Zero-Day Security Fix', severity: 'CRITICAL', status: 'Programado', target: 'Flota General (45 PCs)', releaseDate: '2026-08-22' },
  { id: 'UBUNTU-SEC-44', name: 'OpenSSL Kernel Patch for Database Nodes', severity: 'HIGH', status: 'Aplicado', target: 'SRV-PROD-DB', releaseDate: '2026-08-25' },
];

export default function Patches() {
  const [patches, setPatches] = useState(initialPatches);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    severity: 'CRITICAL',
    target: 'Flota General (45 PCs)',
    status: 'Pendiente',
  });

  const handleDeploy = (id) => {
    setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Desplegando...' } : p)));
    setTimeout(() => {
      setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Aplicado' } : p)));
      setFeedback(`Parche ${id} desplegado y verificado exitosamente en el endpoint.`);
    }, 1500);
  };

  const handleAddPatch = (e) => {
    e.preventDefault();
    const newPatch = {
      ...form,
      releaseDate: new Date().toISOString().split('T')[0],
    };
    setPatches((prev) => [newPatch, ...prev]);
    setShowModal(false);
    setForm({ id: '', name: '', severity: 'CRITICAL', target: 'Flota General (45 PCs)', status: 'Pendiente' });
    setFeedback(`Parche ${newPatch.id} programado para despliegue.`);
  };

  const filteredPatches = useMemo(() => {
    return patches.filter((p) => {
      const matchesSeverity = filterSeverity === 'ALL' || p.severity === filterSeverity;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.target.toLowerCase().includes(q);
      return matchesSeverity && matchesSearch;
    });
  }, [patches, filterSeverity, search]);

  const criticalCount = patches.filter((p) => p.severity === 'CRITICAL' && p.status !== 'Aplicado').length;
  const scheduledCount = patches.filter((p) => p.status === 'Programado').length;
  const appliedCount = patches.filter((p) => p.status === 'Aplicado').length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO BANNER INSTITUCIONAL YOPAL */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #001D40 0%, #002D62 50%, #003A7A 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(0, 45, 98, 0.35)',
          border: '1px solid rgba(0, 209, 255, 0.25)',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 209, 255, 0.4)',
              color: '#ffffff',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Gestión de Parches & Seguridad (Hardening)
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Orquestación de actualizaciones críticas de seguridad, KB de Microsoft y remediación de vulnerabilidades.
            </p>
          </div>
        </div>
      </div>

      {/* 📊 ENTERPRISE KPI METRICS GRID */}
      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
          gap: '0.65rem',
          marginBottom: '1.25rem',
        }}
      >
        {/* KPI 1: Críticos */}
        <div
          className="stat-card"
          style={{
            background: criticalCount > 0 ? '#fff5f5' : '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: criticalCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderLeft: '3.5px solid #dc2626',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: criticalCount > 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Críticos Pendientes
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⚠️</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: criticalCount > 0 ? '#dc2626' : '#059669', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {criticalCount}
            </strong>
            <span style={{ fontSize: '0.67rem', color: criticalCount > 0 ? '#dc2626' : '#059669', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              {criticalCount > 0 ? 'Acción inmediata' : 'Al día'}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Parches */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #2563eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total Paquetes KB
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>🛡️</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {patches.length}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#2563eb', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              En catálogo
            </span>
          </div>
        </div>

        {/* KPI 3: Programados */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #d97706',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Programados
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⏳</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {scheduledCount}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#d97706', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              En ventana
            </span>
          </div>
        </div>

        {/* KPI 4: Aplicados */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #059669',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.15rem',
            minHeight: '58px',
            boxSizing: 'border-box',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Desplegados
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>✅</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {appliedCount}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#059669', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Aplicados OK
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
          ✅ {feedback}
        </div>
      )}

      {/* 🧭 SEGMENTED NAVIGATION & CONTROLS */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Severity Segmented Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            background: '#f1f5f9',
            padding: '0.35rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setFilterSeverity('ALL')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: filterSeverity === 'ALL' ? '#ffffff' : 'transparent',
              color: filterSeverity === 'ALL' ? '#0f172a' : '#64748b',
              fontWeight: filterSeverity === 'ALL' ? '700' : '500',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: filterSeverity === 'ALL' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Todos ({patches.length})
          </button>
          {['CRITICAL', 'HIGH', 'NORMAL'].map((sev) => {
            const count = patches.filter((p) => p.severity === sev).length;
            const isSelected = filterSeverity === sev;
            const label = sev === 'CRITICAL' ? '🚨 Críticos' : sev === 'HIGH' ? '⚠️ Altos' : '🛡️ Normales';
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Live Search & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', maxWidth: '540px', minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por KB, descripción o equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.85rem',
                color: '#1e293b',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#002D62',
              color: '#ffffff',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.82rem',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 45, 98, 0.25)',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Programar Despliegue
          </button>
        </div>
      </div>

      {/* 📦 ENTERPRISE PATCHES TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Identificador KB</th>
                <th style={{ padding: '1rem 1.25rem' }}>Descripción del Parche</th>
                <th style={{ padding: '1rem 1.25rem' }}>Severidad</th>
                <th style={{ padding: '1rem 1.25rem' }}>Objetivo / Flota</th>
                <th style={{ padding: '1rem 1.25rem' }}>Estado</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatches.map((patch) => {
                const isCritical = patch.severity === 'CRITICAL';
                const isHigh = patch.severity === 'HIGH';
                const isApplied = patch.status === 'Aplicado';
                const isDeploying = patch.status === 'Desplegando...';

                return (
                  <tr
                    key={patch.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#0f172a',
                          background: '#f1f5f9',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {patch.id}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9rem' }}>
                        {patch.name}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Liberado: {patch.releaseDate}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          background: isCritical ? '#fee2e2' : isHigh ? '#fef3c7' : '#f1f5f9',
                          color: isCritical ? '#991b1b' : isHigh ? '#92400e' : '#475569',
                          border: `1px solid ${isCritical ? '#fecaca' : isHigh ? '#fde68a' : '#cbd5e1'}`,
                        }}
                      >
                        {patch.severity}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: '500' }}>
                      💻 {patch.target}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          background: isApplied ? '#ecfdf5' : isDeploying ? '#eff6ff' : '#fffbeb',
                          color: isApplied ? '#047857' : isDeploying ? '#1e40af' : '#b45309',
                          border: `1px solid ${isApplied ? '#a7f3d0' : isDeploying ? '#bfdbfe' : '#fde68a'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isApplied ? '#10b981' : isDeploying ? '#3b82f6' : '#f59e0b',
                          }}
                        />
                        {patch.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      {isApplied ? (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '700' }}>
                          ✓ Verificado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeploy(patch.id)}
                          disabled={isDeploying}
                          style={{
                            background: isDeploying ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.45rem 0.9rem',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: isDeploying ? 'not-allowed' : 'pointer',
                            boxShadow: isDeploying ? 'none' : '0 2px 6px rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          {isDeploying ? 'Desplegando...' : '🚀 Desplegar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪟 FLOATING MODAL WITH BACKDROP BLUR */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  🛡️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                    Programar Despliegue de Parche
                  </h3>
                  <small style={{ color: '#64748b' }}>Actualización remota de seguridad RMM</small>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontWeight: '700',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Identificador KB *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="KB5048892"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      background: '#f8fafc',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Severidad *
                  </label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      background: '#f8fafc',
                      outline: 'none',
                    }}
                  >
                    <option value="CRITICAL">🚨 Crítico</option>
                    <option value="HIGH">⚠️ Alto</option>
                    <option value="NORMAL">🛡️ Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Nombre / Descripción del Parche *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Security Update for Windows Kernel"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Objetivo de Despliegue *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Flota General (45 PCs) o PC-ADMIN-01"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                  }}
                >
                  Programar Parche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
