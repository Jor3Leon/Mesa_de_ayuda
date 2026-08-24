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
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

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
    
    return { total, online, windows, linux, macos, warning };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = (a.hostname || '').toLowerCase().includes(search.toLowerCase()) || 
                           (a.ipAddress || '').includes(search) ||
                           (a.serialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                           (a.customer?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'ALL' || a.osType === filterType;
      return matchesSearch && matchesType;
    });
  }, [assets, search, filterType]);

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
      <section className="hero-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p className="eyebrow" style={{ color: 'var(--color-primary)', letterSpacing: '0.1em' }}>Estrategia de Activos & Infraestructura</p>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b' }}>CMDB Operacional 360°</h2>
          <p className="muted-text" style={{ maxWidth: '650px', fontSize: '1.05rem' }}>
            Monitoreo en tiempo real de la salud del parque informático, inventario de hardware y software, y gestión de mantenimientos preventivos y correctivos.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginTop: '1.2rem' }}>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🖥️</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
              <div className="muted-text" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Activos</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '2rem' }}>🟢</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.online}</div>
              <div className="muted-text" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>En Línea</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.warning}</div>
              <div className="muted-text" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>En Riesgo / Offline</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🌐</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.windows}W / {stats.linux}L</div>
              <div className="muted-text" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Windows / Linux</div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="feedback error" style={{ margin: '1rem 0' }}>{error}</div>}

      <div className={`cmdb-content-grid ${selectedAsset ? 'has-selected' : ''}`}>
        
        {/* Tabla de Activos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card-premium" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: '280px' }}>
              <input 
                type="text" 
                placeholder="Buscar por hostname, IP, serial o usuario..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: '12px', padding: '0.8rem 1.2rem', border: '1.5px solid #e2e8f0', width: '100%' }}
              />
            </div>
            <div className="field" style={{ minWidth: '160px' }}>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ borderRadius: '12px', padding: '0.8rem', width: '100%' }}>
                <option value="ALL">Todos los Sistemas</option>
                <option value="Windows">Windows</option>
                <option value="Linux">Linux Core</option>
                <option value="macOS">macOS</option>
              </select>
            </div>
          </div>

          <article className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Inventario de Dispositivos</h3>
              <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>{filteredAssets.length} equipos registrados</span>
            </div>
            
            <div className="table-shell">
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
                        onClick={() => setSelectedAsset(asset)}
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
          <aside className="card-premium animate-fade-in" style={{ padding: 0, position: 'sticky', top: '1.5rem', height: 'fit-content', border: '1.5px solid var(--color-primary)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
            
            {/* Header Vista 360 */}
            <div style={{ padding: '1.2rem 1.5rem', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)', borderBottom: '1px solid var(--color-border)' }}>
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
                <button className="btn-icon" onClick={() => setSelectedAsset(null)} title="Cerrar panel">✕</button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.3rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              
              {/* Tarjeta de Identidad del Equipo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '2.5rem', background: '#fff', padding: '0.5rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  {selectedAsset.osType === 'Linux' ? '🐧' : selectedAsset.osType === 'macOS' ? '🍎' : '💻'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', background: '#fff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">👤 Usuario Sesión:</span>
                    <span style={{ fontWeight: 600 }}>{selectedAsset.assignedUser || 'Usuario Local'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">🏷️ Serial / Tag:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selectedAsset.serialNumber || '---'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">🏢 Fabricante/Board:</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', fontSize: '0.8rem' }}>{selectedAsset.motherboard || selectedAsset.brand || '---'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">🌐 IP Local:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedAsset.ipAddress || '---'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">💻 Sistema:</span>
                    <span style={{ fontWeight: 600 }}>{selectedAsset.osType} ({selectedAsset.osVersion || '---'})</span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción Unificados */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                
                {/* 1. Software Instalado */}
                {softwareList.length > 0 && (
                  <button 
                    type="button"
                    className="btn secondary full"
                    style={{ 
                      padding: '0.85rem 1rem', 
                      fontSize: '0.92rem', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem',
                      borderRadius: '12px',
                      width: '100%',
                      cursor: 'pointer',
                      background: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      color: '#1e293b'
                    }}
                    onClick={() => { setSoftwareSearch(''); setIsSoftwareModalOpen(true); }}
                  >
                    <span>📦</span> Ver Software Instalado ({softwareList.length})
                  </button>
                )}

                {/* 2. Remitir a Mantenimiento */}
                <button 
                  type="button"
                  className="btn primary full"
                  style={{ 
                    padding: '0.85rem 1rem', 
                    fontSize: '0.92rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem',
                    borderRadius: '12px',
                    width: '100%',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                    color: '#fff',
                    border: 'none'
                  }}
                  onClick={() => openMaintenanceModal(selectedAsset, 'Mantenimiento Preventivo')}
                >
                  <span>🛠️</span> Remitir a Mantenimiento
                </button>

                {/* 3. Generar Reporte / Ficha Técnica */}
                <button 
                  type="button"
                  className="btn secondary full" 
                  style={{ 
                    padding: '0.85rem 1rem', 
                    fontSize: '0.92rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem',
                    borderRadius: '12px',
                    width: '100%',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    color: '#fff',
                    border: 'none'
                  }}
                  onClick={() => generateAssetReport(selectedAsset)}
                >
                  <span>📄</span> Generar Ficha Técnica (PDF)
                </button>

              </div>

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
