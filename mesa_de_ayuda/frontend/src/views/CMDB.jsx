import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { generateAssetReport } from '../lib/reports';

function parseStorage(storageSummary) {
  if (!storageSummary) return null;
  const match = storageSummary.match(/([\d.]+)\s*GB.*?([\d.]+)\s*GB\s*libre/i);
  if (match) {
    const total = parseFloat(match[1]);
    const free = parseFloat(match[2]);
    const used = Math.max(0, parseFloat((total - free).toFixed(1)));
    const usedPercent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));
    const freePercent = 100 - usedPercent;
    return { total, free, used, usedPercent, freePercent, text: storageSummary };
  }
  return { text: storageSummary };
}

function parseRam(ramSummary) {
  if (!ramSummary) return null;
  const match = ramSummary.match(/([\d.]+)\s*GB.*?([\d.]+)\s*GB\s*libre/i);
  if (match) {
    const total = parseFloat(match[1]);
    const free = parseFloat(match[2]);
    const used = Math.max(0, parseFloat((total - free).toFixed(1)));
    const usedPercent = Math.min(100, Math.max(0, Math.round((used / total) * 100)));
    return { total, free, used, usedPercent, text: ramSummary };
  }
  return { text: ramSummary };
}

function parseSoftware(softwareData) {
  if (!softwareData) return [];
  if (Array.isArray(softwareData)) return softwareData;
  try {
    const parsed = JSON.parse(softwareData);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    if (typeof softwareData === 'string' && softwareData.includes('\n')) {
      return softwareData.split('\n').filter(Boolean).map(s => ({ name: s.trim() }));
    }
  }
  return [];
}

export default function CMDB() {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showMobile360, setShowMobile360] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [active360Tab, setActive360Tab] = useState('INFO'); // 'INFO' | 'TOPOLOGY' | 'TIMELINE'
  const [copiedIp, setCopiedIp] = useState(false);

  // Modales
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isSoftwareModalOpen, setIsSoftwareModalOpen] = useState(false);
  const [softwareSearch, setSoftwareSearch] = useState('');

  // Formulario de Mantenimiento
  const [maintType, setMaintType] = useState('Mantenimiento Preventivo');
  const [maintPriority, setMaintPriority] = useState('MEDIA');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDescription, setMaintDescription] = useState('');
  const [maintAssignedToId, setMaintAssignedToId] = useState('');
  const [submittingMaint, setSubmittingMaint] = useState(false);
  const [maintSuccessTicket, setMaintSuccessTicket] = useState(null);
  const [maintError, setMaintError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    Promise.all([
      apiRequest('/assets'),
      apiRequest('/users').catch(() => [])
    ])
      .then(([assetsRes, usersRes]) => {
        if (!ignore) {
          setAssets(Array.isArray(assetsRes) ? assetsRes : []);
          setUsers(Array.isArray(usersRes) ? usersRes : []);
          setLoading(false);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(requestError.message);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = assets.length;
    const online = assets.filter(a => a.status === 'ONLINE').length;
    const windows = assets.filter(a => a.osType === 'Windows').length;
    const linux = assets.filter(a => a.osType === 'Linux').length;
    const macos = assets.filter(a => a.osType === 'macOS').length;
    const warning = assets.filter(a => a.status === 'WARNING' || a.status === 'OFFLINE').length;
    
    // Métricas de Salud y Cumplimiento
    const healthScore = total > 0 ? Math.round((online / total) * 100) : 100;
    const withAgent = assets.filter(a => a.agentVersion && a.agentVersion !== '1.0.0').length;
    const securityScore = total > 0 ? Math.round((withAgent / total) * 100) : 100;
    const storageRiskCount = assets.filter(a => {
      const s = parseStorage(a.storageSummary);
      return s?.freePercent !== undefined && s.freePercent < 15;
    }).length;
    
    return { total, online, windows, linux, macos, warning, healthScore, securityScore, storageRiskCount, withAgent };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = (a.hostname || '').toLowerCase().includes(search.toLowerCase()) || 
                           (a.ipAddress || '').includes(search) ||
                           (a.serialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                           (a.customer?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'ALL' || a.osType === filterType;

      let matchesRisk = true;
      if (filterRisk === 'ONLINE') matchesRisk = a.status === 'ONLINE';
      else if (filterRisk === 'WARNING') matchesRisk = a.status === 'WARNING' || a.status === 'OFFLINE';
      else if (filterRisk === 'CRITICAL_STORAGE') {
        const s = parseStorage(a.storageSummary);
        matchesRisk = s?.freePercent !== undefined && s.freePercent < 15;
      } else if (filterRisk === 'COMPUTE') {
        const type = (a.deviceType || '').toLowerCase();
        matchesRisk = ['computo', 'escritorio', 'all in one', 'portatil', 'desktop', 'aio', 'laptop'].some(k => type.includes(k));
      } else if (filterRisk === 'NETWORK') {
        const type = (a.deviceType || '').toLowerCase();
        matchesRisk = ['switch', 'router', 'access point', 'firewall', 'nas', 'ap', 'wifi', 'red', 'servidor'].some(k => type.includes(k));
      }

      return matchesSearch && matchesType && matchesRisk;
    });
  }, [assets, search, filterType, filterRisk]);

  const handleCopyIp = (ipAddress) => {
    if (!ipAddress) return;
    navigator.clipboard.writeText(ipAddress);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const storageData = useMemo(() => {
    return selectedAsset ? parseStorage(selectedAsset.storageSummary) : null;
  }, [selectedAsset]);

  const ramData = useMemo(() => {
    return selectedAsset ? parseRam(selectedAsset.ramSummary) : null;
  }, [selectedAsset]);

  const softwareList = useMemo(() => {
    return selectedAsset ? parseSoftware(selectedAsset.installedSoftware) : [];
  }, [selectedAsset]);

  const filteredSoftware = useMemo(() => {
    if (!softwareSearch.trim()) return softwareList;
    return softwareList.filter(s => 
      (s.name || '').toLowerCase().includes(softwareSearch.toLowerCase()) ||
      (s.publisher || '').toLowerCase().includes(softwareSearch.toLowerCase())
    );
  }, [softwareList, softwareSearch]);

  const openMaintenanceModal = (asset, type = 'Mantenimiento Preventivo') => {
    setMaintType(type);
    setMaintPriority('MEDIA');
    setMaintTitle(`[${type.toUpperCase()}] ${asset.hostname}`);
    setMaintDescription(
`Remisión a ${type} para el equipo ${asset.hostname}.

DATOS DEL ACTIVO:
• Serial / Service Tag: ${asset.serialNumber || '---'}
• Marca y Modelo: ${asset.brand || ''} ${asset.model || ''}
• Procesador (CPU): ${asset.cpuModel || '---'}
• Memoria RAM: ${asset.ramSummary || '---'}
• Almacenamiento: ${asset.storageSummary || '---'}
• Usuario Asignado: ${asset.assignedUser || '---'}
• Dirección IP / Red: ${asset.ipAddress || '---'}

OBSERVACIONES / ACTIVIDADES A REALIZAR:
- `
    );
    setMaintAssignedToId('');
    setMaintSuccessTicket(null);
    setMaintError('');
    setIsMaintenanceModalOpen(true);
  };

  const handleCreateMaintenanceTicket = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSubmittingMaint(true);
    setMaintError('');

    try {
      const payload = {
        title: maintTitle.trim() || `[${maintType.toUpperCase()}] ${selectedAsset.hostname}`,
        description: maintDescription.trim(),
        priority: maintPriority,
        ticketType: maintType,
        category: 'Hardware / Equipos',
        assetId: selectedAsset.id,
        customerId: selectedAsset.customerId || 1,
        responsibleUserIds: maintAssignedToId ? [parseInt(maintAssignedToId, 10)] : []
      };

      const res = await apiRequest('/tickets', {
        method: 'POST',
        body: payload
      });

      setMaintSuccessTicket(res);
    } catch (err) {
      setMaintError(err.message || 'No se pudo crear el ticket de mantenimiento.');
    } finally {
      setSubmittingMaint(false);
    }
  };

  return (
    <div className="view-container">
      <section className="hero-panel glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <p className="eyebrow">Estrategia de Activos & Infraestructura</p>
          <h2>CMDB Operacional 360°</h2>
          <p className="muted-text">
            Monitoreo en tiempo real de la salud del parque informático, inventario de hardware y software, y gestión de mantenimientos preventivos y correctivos.
          </p>
        </div>
        
        <div className="cmdb-stats-grid">
          <div className="card-premium cmdb-stat-box">
            <div className="cmdb-stat-icon">🖥️</div>
            <div>
              <div className="cmdb-stat-val">{stats.total}</div>
              <div className="muted-text cmdb-stat-lbl">Total Activos</div>
            </div>
          </div>
          <div className="card-premium cmdb-stat-box" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div className="cmdb-stat-icon">🟢</div>
            <div>
              <div className="cmdb-stat-val">{stats.online} <small style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>({stats.healthScore}%)</small></div>
              <div className="muted-text cmdb-stat-lbl">En Línea (Salud)</div>
            </div>
          </div>
          <div className="card-premium cmdb-stat-box" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="cmdb-stat-icon">⚠️</div>
            <div>
              <div className="cmdb-stat-val">{stats.warning}</div>
              <div className="muted-text cmdb-stat-lbl">En Riesgo / Offline</div>
            </div>
          </div>
          <div className="card-premium cmdb-stat-box" style={{ borderLeft: '4px solid #0284c7' }}>
            <div className="cmdb-stat-icon">🛡️</div>
            <div>
              <div className="cmdb-stat-val">{stats.securityScore}%</div>
              <div className="muted-text cmdb-stat-lbl">Cobertura Endpoint</div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="feedback error" style={{ margin: '1rem 0' }}>{error}</div>}

      <div className={`cmdb-content-grid ${selectedAsset ? 'has-selected' : ''} ${showMobile360 ? 'mobile-show-360' : 'mobile-show-table'}`}>
        
        {/* Tabla de Activos */}
        <div className="cmdb-table-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div className="card-premium cmdb-search-bar" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <div className="field" style={{ flex: 1, minWidth: '220px' }}>
                <input 
                  type="text" 
                  placeholder="Buscar por hostname, IP, serial o usuario..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ borderRadius: '12px', padding: '0.75rem 1.1rem', border: '1.5px solid #e2e8f0', width: '100%' }}
                />
              </div>
              <div className="field" style={{ minWidth: '150px' }}>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ borderRadius: '12px', padding: '0.75rem', width: '100%' }}>
                  <option value="ALL">Todos los Sistemas</option>
                  <option value="Windows">Windows</option>
                  <option value="Linux">Linux Core</option>
                  <option value="macOS">macOS</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="cmdb-quick-chips">
              <button 
                type="button" 
                className={`chip ${filterRisk === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterRisk('ALL')}
              >
                Todos ({assets.length})
              </button>
              <button 
                type="button" 
                className={`chip ${filterRisk === 'ONLINE' ? 'active' : ''}`}
                onClick={() => setFilterRisk('ONLINE')}
              >
                🟢 En Línea ({stats.online})
              </button>
              <button 
                type="button" 
                className={`chip ${filterRisk === 'WARNING' ? 'active' : ''}`}
                onClick={() => setFilterRisk('WARNING')}
              >
                ⚠️ En Riesgo ({stats.warning})
              </button>
              {stats.storageRiskCount > 0 && (
                <button 
                  type="button" 
                  className={`chip danger ${filterRisk === 'CRITICAL_STORAGE' ? 'active' : ''}`}
                  onClick={() => setFilterRisk('CRITICAL_STORAGE')}
                >
                  💾 Disco Crítico (&lt;15%) ({stats.storageRiskCount})
                </button>
              )}
              <button 
                type="button" 
                className={`chip ${filterRisk === 'COMPUTE' ? 'active' : ''}`}
                onClick={() => setFilterRisk('COMPUTE')}
              >
                💻 Cómputo
              </button>
              <button 
                type="button" 
                className={`chip ${filterRisk === 'NETWORK' ? 'active' : ''}`}
                onClick={() => setFilterRisk('NETWORK')}
              >
                🌐 Servidores & Red
              </button>
            </div>
          </div>

          <article className="card-premium cmdb-table-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="cmdb-table-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Inventario de Dispositivos</h3>
              <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>{filteredAssets.length} equipos registrados</span>
            </div>
            
            <div className="table-shell cmdb-table-shell">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}><div className="loader"></div></div>
              ) : filteredAssets.length === 0 ? (
                <div className="empty-state" style={{ padding: '4rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                  <p>No se encontraron activos con los criterios actuales.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '1.5rem' }}>Identificador</th>
                      <th>Entidad / Usuario</th>
                      <th>Hardware & Almacenamiento</th>
                      <th>Sistema Operativo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr 
                        key={asset.id} 
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowMobile360(true);
                        }}
                        style={{ cursor: 'pointer', transition: 'background 0.2s', background: selectedAsset?.id === asset.id ? 'rgba(15, 157, 58, 0.08)' : 'transparent' }}
                        className={selectedAsset?.id === asset.id ? 'asset-row-active' : ''}
                      >
                        <td style={{ paddingLeft: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: asset.status === 'ONLINE' ? '#ecfdf5' : '#fff7ed', display: 'grid', placeItems: 'center', fontSize: '1.3rem' }}>
                              {asset.osType === 'Linux' ? '🐧' : asset.osType === 'macOS' ? '🍎' : '💻'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{asset.hostname}</div>
                              <div className="muted-text" style={{ fontSize: '0.75rem' }}>SN: {asset.serialNumber || '---'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{asset.customer?.name || 'Interno'}</div>
                          <div className="muted-text" style={{ fontSize: '0.75rem' }}>👤 {asset.assignedUser || 'Sin usuario'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {asset.deviceType || 'Equipo'} • {asset.ramSummary?.split('(')[0] || 'RAM N/A'}
                          </div>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>
                            {asset.cpuModel ? asset.cpuModel.substring(0, 35) + (asset.cpuModel.length > 35 ? '...' : '') : 'CPU N/A'}
                          </div>
                        </td>
                        <td>
                          <span className="badge info" style={{ fontSize: '0.7rem' }}>{asset.osType}</span>
                          <div className="muted-text" style={{ fontSize: '0.7rem', marginTop: '2px' }}>IP: {asset.ipAddress}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="status-dot" style={{ background: asset.status === 'ONLINE' ? 'var(--color-primary)' : '#f59e0b', width: '8px', height: '8px' }}></div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{asset.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>
        </div>

        {/* Panel Lateral: Vista 360° Activo Mejorada */}
        {selectedAsset && (
          <aside className="card-premium animate-fade-in cmdb-360-panel" style={{ padding: 0, position: 'sticky', top: '1.5rem', height: 'fit-content', border: '1.5px solid var(--color-primary)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
            <button 
              type="button" 
              className="cmdb-mobile-back-btn" 
              onClick={() => setShowMobile360(false)}
            >
              ← Volver al inventario de CMDB
            </button>
            
            {/* Header Vista 360 */}
            <div className="cmdb-360-header" style={{ padding: '1.2rem 1.5rem', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🌐</span>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Vista 360° Activo</h3>
                  </div>
                  <p className="muted-text" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                    ID Interno: <strong>ASSET-{selectedAsset.id.toString().padStart(5, '0')}</strong>
                  </p>
                </div>
                <button className="btn-icon" onClick={() => { setSelectedAsset(null); setShowMobile360(false); }} title="Cerrar panel">✕</button>
              </div>

              {/* Sub-tabs Vista 360 */}
              <div className="cmdb-360-tabs" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.85rem' }}>
                <button 
                  type="button" 
                  className={`tab ${active360Tab === 'INFO' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('INFO')}
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  📊 Resumen
                </button>
                <button 
                  type="button" 
                  className={`tab ${active360Tab === 'TOPOLOGY' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('TOPOLOGY')}
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  🌐 Topología
                </button>
                <button 
                  type="button" 
                  className={`tab ${active360Tab === 'TIMELINE' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('TIMELINE')}
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  ⏱️ Historial
                </button>
              </div>
            </div>

            <div style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
              
              {/* Tarjeta de Identidad del Equipo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.9rem 1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.2rem', background: '#fff', padding: '0.4rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  {selectedAsset.osType === 'Linux' ? '🐧' : selectedAsset.osType === 'macOS' ? '🍎' : '💻'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedAsset.hostname}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span className="badge success" style={{ fontSize: '0.65rem' }}>{selectedAsset.status === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}</span>
                    {selectedAsset.deviceType && (
                      <span className="badge neutral" style={{ fontSize: '0.65rem' }}>{selectedAsset.deviceType}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón rápido Copiar IP */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn-ghost" 
                  onClick={() => handleCopyIp(selectedAsset.ipAddress)}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer' }}
                >
                  <span>📋</span> {copiedIp ? '¡IP Copiada!' : `Copiar IP (${selectedAsset.ipAddress || 'Sin IP'})`}
                </button>
              </div>

              {active360Tab === 'INFO' && (
                <>
                  {/* Métricas de Salud y Rendimiento */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.8rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>📊</span> Métricas de Salud y Rendimiento
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      
                      {/* Barra de Almacenamiento */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.9rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600 }}>💾 Almacenamiento</span>
                          {storageData?.total ? (
                            <span style={{ color: storageData.freePercent < 15 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                              {storageData.free} GB libres ({storageData.freePercent}%)
                            </span>
                          ) : (
                            <span className="muted-text">{selectedAsset.storageSummary || 'N/A'}</span>
                          )}
                        </div>
                        {storageData?.usedPercent !== undefined && (
                          <div>
                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  width: `${storageData.usedPercent}%`, 
                                  height: '100%', 
                                  background: storageData.freePercent < 15 ? '#ef4444' : storageData.freePercent < 30 ? '#f59e0b' : '#10b981',
                                  transition: 'width 0.5s ease'
                                }} 
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                              <span>Usado: {storageData.used} GB</span>
                              <span>Total: {storageData.total} GB</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Memoria RAM */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.9rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600 }}>⚡ Memoria RAM</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                            {selectedAsset.ramSummary || '---'}
                          </span>
                        </div>
                        {ramData?.usedPercent !== undefined && (
                          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${ramData.usedPercent}%`, 
                                height: '100%', 
                                background: '#0284c7',
                                transition: 'width 0.5s ease'
                              }} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Procesador CPU */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.9rem', borderRadius: '12px' }}>
                        <div className="muted-text" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Procesador (CPU)</div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginTop: '2px' }}>
                          {selectedAsset.cpuModel || 'Procesador estándar'}
                        </div>
                      </div>

                      {/* Seguridad & Antivirus */}
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.9rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ fontSize: '1.8rem' }}>🛡️</div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Protección Endpoint</div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#14532d' }}>
                            {selectedAsset.agentVersion && selectedAsset.agentVersion !== '1.0.0' && selectedAsset.agentVersion !== '2.0.0' 
                              ? selectedAsset.agentVersion 
                              : 'Microsoft Defender Antivirus'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#15803d' }}>
                            Último reporte: {selectedAsset.lastSeenAt ? new Date(selectedAsset.lastSeenAt).toLocaleString() : 'Reciente'}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Ficha Técnica y Red */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.8rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>⚙️</span> Ficha Técnica & Red
                    </h4>
                    <div className="cmdb-info-card">
                      <div className="cmdb-info-row">
                        <span className="muted-text">👤 Usuario Sesión:</span>
                        <span className="cmdb-info-val">{selectedAsset.assignedUser || 'Usuario Local'}</span>
                      </div>
                      <div className="cmdb-info-row">
                        <span className="muted-text">🏷️ Serial / Tag:</span>
                        <span className="cmdb-info-val highlight">{selectedAsset.serialNumber || '---'}</span>
                      </div>
                      <div className="cmdb-info-row">
                        <span className="muted-text">🏢 Fabricante/Board:</span>
                        <span className="cmdb-info-val">{selectedAsset.motherboard || selectedAsset.brand || '---'}</span>
                      </div>
                      <div className="cmdb-info-row">
                        <span className="muted-text">🌐 IP Local:</span>
                        <span className="cmdb-info-val mono">{selectedAsset.ipAddress || '---'}</span>
                      </div>
                      <div className="cmdb-info-row">
                        <span className="muted-text">💻 Sistema:</span>
                        <span className="cmdb-info-val">{selectedAsset.osType} ({selectedAsset.osVersion || '---'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción Unificados */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                    {softwareList.length > 0 && (
                      <button 
                        type="button"
                        className="btn secondary full"
                        style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', fontWeight: 700, borderRadius: '12px', cursor: 'pointer', background: '#f1f5f9', border: '1.5px solid #cbd5e1', color: '#1e293b' }}
                        onClick={() => { setSoftwareSearch(''); setIsSoftwareModalOpen(true); }}
                      >
                        <span>📦</span> Ver Software Instalado ({softwareList.length})
                      </button>
                    )}

                    <button 
                      type="button"
                      className="btn primary full"
                      style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', fontWeight: 700, borderRadius: '12px', cursor: 'pointer', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', color: '#fff', border: 'none' }}
                      onClick={() => openMaintenanceModal(selectedAsset, 'Mantenimiento Preventivo')}
                    >
                      <span>🛠️</span> Remitir a Mantenimiento
                    </button>

                    <button 
                      type="button"
                      className="btn secondary full" 
                      style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', fontWeight: 700, borderRadius: '12px', cursor: 'pointer', background: '#fff', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
                      onClick={() => generateAssetReport(selectedAsset)}
                    >
                      <span>📄</span> Generar Ficha Técnica (PDF/Imprimir)
                    </button>
                  </div>
                </>
              )}

              {active360Tab === 'TOPOLOGY' && (
                <div className="cmdb-topology-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🌐 Mapa de Topología & Cadena de Red
                  </div>
                  
                  <div className="cmdb-topology-tree">
                    {/* Nodo Red */}
                    <div className="cmdb-tree-node network">
                      <span className="tree-icon">🌐</span>
                      <div>
                        <strong>Subred / Gateway Local</strong>
                        <div className="muted-text" style={{ fontSize: '0.72rem' }}>IP: {selectedAsset.ipAddress || '192.168.1.1'}</div>
                      </div>
                      <span className="badge success" style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>ACTIVO</span>
                    </div>

                    <div className="tree-connector-line"></div>

                    {/* Nodo Hostname */}
                    <div className="cmdb-tree-node main">
                      <span className="tree-icon">{selectedAsset.osType === 'Linux' ? '🐧' : selectedAsset.osType === 'macOS' ? '🍎' : '💻'}</span>
                      <div>
                        <strong>{selectedAsset.hostname}</strong>
                        <div className="muted-text" style={{ fontSize: '0.72rem' }}>{selectedAsset.brand || 'Marca'} {selectedAsset.model || ''}</div>
                      </div>
                      <span className={`badge ${selectedAsset.status === 'ONLINE' ? 'success' : 'warning'}`} style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{selectedAsset.status}</span>
                    </div>

                    <div className="tree-connector-line"></div>

                    {/* Hijos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px dashed #0284c7' }}>
                      <div className="cmdb-tree-node child">
                        <span className="tree-icon">👤</span>
                        <div>
                          <strong>Usuario Sesión</strong>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>{selectedAsset.assignedUser || 'Usuario Local'}</div>
                        </div>
                      </div>
                      <div className="cmdb-tree-node child">
                        <span className="tree-icon">🛡️</span>
                        <div>
                          <strong>Protección Endpoint</strong>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>{selectedAsset.agentVersion || 'Antivirus OK'}</div>
                        </div>
                      </div>
                      <div className="cmdb-tree-node child">
                        <span className="tree-icon">📦</span>
                        <div>
                          <strong>Software Instalado</strong>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>{softwareList.length} aplicaciones activas</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {active360Tab === 'TIMELINE' && (
                <div className="cmdb-timeline-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.85rem' }}>
                    ⏱️ Trazabilidad & Auditoría de Eventos
                  </div>
                  <div className="cmdb-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', marginTop: '5px' }}></div>
                      <div>
                        <strong style={{ fontSize: '0.82rem' }}>Último Reporte de Agente RMM</strong>
                        <div className="muted-text" style={{ fontSize: '0.72rem' }}>{selectedAsset.lastSeenAt ? new Date(selectedAsset.lastSeenAt).toLocaleString() : 'Reciente'}</div>
                        <span className="badge success" style={{ fontSize: '0.62rem', marginTop: '3px' }}>Sincronización Correcta</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', marginTop: '5px' }}></div>
                      <div>
                        <strong style={{ fontSize: '0.82rem' }}>Inspección de Almacenamiento & RAM</strong>
                        <div className="muted-text" style={{ fontSize: '0.72rem' }}>RAM: {selectedAsset.ramSummary || '---'} | Disco: {selectedAsset.storageSummary || '---'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b', marginTop: '5px' }}></div>
                      <div>
                        <strong style={{ fontSize: '0.82rem' }}>Ficha Registrada en CMDB</strong>
                        <div className="muted-text" style={{ fontSize: '0.72rem' }}>Serial: {selectedAsset.serialNumber || '---'} | IP: {selectedAsset.ipAddress || '---'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Modal: Remisión a Mantenimiento con Generación Automática de Ticket */}
      {isMaintenanceModalOpen && selectedAsset && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="modal-card animate-scale-in" style={{ background: '#fff', borderRadius: '18px', maxWidth: '600px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            {/* Header del Modal */}
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '1.8rem' }}>🛠️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Remisión a Mantenimiento</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Activo: <strong>{selectedAsset.hostname}</strong> (SN: {selectedAsset.serialNumber || '---'})</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMaintenanceModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {maintSuccessTicket ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', margin: '0 0 0.5rem 0' }}>
                  ¡Ticket de Mantenimiento Creado!
                </h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                  Se ha registrado el ticket <strong>#{maintSuccessTicket.id}</strong> ({maintSuccessTicket.title}) y se ha vinculado exitosamente al equipo <strong>{selectedAsset.hostname}</strong>.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    className="btn secondary"
                    onClick={() => setIsMaintenanceModalOpen(false)}
                  >
                    Cerrar
                  </button>
                  <Link 
                    to="/tickets" 
                    className="btn primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    Ver en Mesa de Tickets →
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateMaintenanceTicket} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {maintError && (
                  <div className="feedback error" style={{ margin: 0 }}>{maintError}</div>
                )}

                {/* Tipo de Mantenimiento */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                    Tipo de Mantenimiento:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMaintType('Mantenimiento Preventivo');
                        setMaintTitle(`[MANTENIMIENTO PREVENTIVO] ${selectedAsset.hostname}`);
                      }}
                      style={{
                        padding: '0.8rem',
                        borderRadius: '12px',
                        border: maintType === 'Mantenimiento Preventivo' ? '2px solid #10b981' : '1px solid #cbd5e1',
                        background: maintType === 'Mantenimiento Preventivo' ? '#ecfdf5' : '#f8fafc',
                        color: maintType === 'Mantenimiento Preventivo' ? '#065f46' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>🟢</span> Preventivo
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMaintType('Mantenimiento Correctivo');
                        setMaintTitle(`[MANTENIMIENTO CORRECTIVO] ${selectedAsset.hostname}`);
                      }}
                      style={{
                        padding: '0.8rem',
                        borderRadius: '12px',
                        border: maintType === 'Mantenimiento Correctivo' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                        background: maintType === 'Mantenimiento Correctivo' ? '#fef2f2' : '#f8fafc',
                        color: maintType === 'Mantenimiento Correctivo' ? '#991b1b' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>🔴</span> Correctivo
                    </button>
                  </div>
                </div>

                {/* Prioridad y Técnico Responsable */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="field">
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Prioridad:</label>
                    <select 
                      value={maintPriority} 
                      onChange={e => setMaintPriority(e.target.value)}
                      style={{ borderRadius: '10px', padding: '0.7rem', width: '100%', marginTop: '4px' }}
                    >
                      <option value="BAJA">Baja</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Crítica / Urgente</option>
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Asignar Técnico:</label>
                    <select 
                      value={maintAssignedToId} 
                      onChange={e => setMaintAssignedToId(e.target.value)}
                      style={{ borderRadius: '10px', padding: '0.7rem', width: '100%', marginTop: '4px' }}
                    >
                      <option value="">Por Asignar (General)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Título del Ticket */}
                <div className="field">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Título / Asunto del Ticket:</label>
                  <input 
                    type="text" 
                    value={maintTitle} 
                    onChange={e => setMaintTitle(e.target.value)}
                    required
                    style={{ borderRadius: '10px', padding: '0.7rem', width: '100%', marginTop: '4px', fontWeight: 600 }}
                  />
                </div>

                {/* Descripción / Tareas de Mantenimiento */}
                <div className="field">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Descripción y Ficha Técnica del Mantenimiento:</label>
                  <textarea 
                    rows={6} 
                    value={maintDescription} 
                    onChange={e => setMaintDescription(e.target.value)}
                    required
                    style={{ borderRadius: '10px', padding: '0.8rem', width: '100%', marginTop: '4px', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Botones de Envío */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={() => setIsMaintenanceModalOpen(false)}
                    disabled={submittingMaint}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary" 
                    disabled={submittingMaint}
                    style={{ minWidth: '180px' }}
                  >
                    {submittingMaint ? 'Creando Ticket...' : 'Generar Ticket de Soporte'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* Modal: Explorador de Software Instalado */}
      {isSoftwareModalOpen && selectedAsset && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="modal-card animate-scale-in" style={{ background: '#fff', borderRadius: '18px', maxWidth: '650px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ padding: '1.2rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>📦 Software Instalado</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedAsset.hostname} • {softwareList.length} aplicaciones detectadas</p>
              </div>
              <button 
                onClick={() => setIsSoftwareModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <input 
                type="text"
                placeholder="Filtrar aplicaciones por nombre o proveedor..."
                value={softwareSearch}
                onChange={e => setSoftwareSearch(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {filteredSoftware.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No se encontraron aplicaciones coincidentes.
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0' }}>Aplicación</th>
                      <th style={{ padding: '0.5rem 0' }}>Versión</th>
                      <th style={{ padding: '0.5rem 0' }}>Fabricante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSoftware.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: '#1e293b' }}>{s.name}</td>
                        <td style={{ padding: '0.5rem 0', color: '#64748b' }}>{s.version || '---'}</td>
                        <td style={{ padding: '0.5rem 0', color: '#64748b', fontSize: '0.75rem' }}>{s.publisher || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setIsSoftwareModalOpen(false)}>
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
