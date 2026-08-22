import { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';
import { generateAssetReport } from '../lib/reports';

export default function CMDB() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    apiRequest('/assets')
      .then((response) => {
        if (!ignore) {
          setAssets(response);
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
    const warning = assets.filter(a => a.status === 'WARNING' || a.status === 'OFFLINE').length;
    
    return { total, online, windows, linux, warning };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.hostname.toLowerCase().includes(search.toLowerCase()) || 
                           a.ipAddress.includes(search) ||
                           (a.customer?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'ALL' || a.osType === filterType;
      return matchesSearch && matchesType;
    });
  }, [assets, search, filterType]);

  return (
    <div className="view-container">
      <section className="hero-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p className="eyebrow" style={{ color: 'var(--color-primary)', letterSpacing: '0.1em' }}>Estrategia de Activos</p>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b' }}>CMDB Operacional</h2>
          <p className="muted-text" style={{ maxWidth: '600px', fontSize: '1.1rem' }}>
            Visualización avanzada de la topología de red, salud de hardware y trazabilidad de activos críticos para la continuidad del negocio.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🖥️</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
              <div className="muted-text" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Activos</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '2rem' }}>🟢</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.online}</div>
              <div className="muted-text" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>En Línea</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-secondary)' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.warning}</div>
              <div className="muted-text" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>En Riesgo</div>
            </div>
          </div>
          <div className="card-premium" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🐧</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.linux}</div>
              <div className="muted-text" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Linux Core</div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="feedback error" style={{ margin: '1rem 0' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedAsset ? '1fr 400px' : '1fr', gap: '1.5rem', marginTop: '2rem', transition: 'all 0.3s' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card-premium" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: '300px' }}>
              <input 
                type="text" 
                placeholder="Buscar por hostname, IP o entidad..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: '12px', padding: '0.8rem 1.2rem', border: '1.5px solid #e2e8f0' }}
              />
            </div>
            <div className="field" style={{ minWidth: '150px' }}>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ borderRadius: '12px', padding: '0.8rem' }}>
                <option value="ALL">Todos los SO</option>
                <option value="Windows">Windows</option>
                <option value="Linux">Linux Core</option>
                <option value="macOS">macOS</option>
              </select>
            </div>
          </div>

          <article className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Inventario de Infraestructura</h3>
              <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>{filteredAssets.length} resultados</span>
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
                      <th>Entidad Responsable</th>
                      <th>Configuración Hardware</th>
                      <th>Sistema Operativo</th>
                      <th>Estado Operativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr 
                        key={asset.id} 
                        onClick={() => setSelectedAsset(asset)}
                        style={{ cursor: 'pointer', transition: 'background 0.2s', background: selectedAsset?.id === asset.id ? 'rgba(15, 157, 58, 0.05)' : 'transparent' }}
                        className={selectedAsset?.id === asset.id ? 'asset-row-active' : ''}
                      >
                        <td style={{ paddingLeft: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: asset.status === 'ONLINE' ? '#ecfdf5' : '#fff7ed', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                              {asset.osType === 'Linux' ? '🐧' : '💻'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{asset.hostname}</div>
                              <div className="muted-text" style={{ fontSize: '0.75rem' }}>{asset.ipAddress}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.9rem' }}>{asset.customer?.name || 'Interno'}</div>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>SLA: Oro</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            {asset.deviceType || 'Equipo'} / {asset.ramSummary || '---'}
                          </div>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>CPU: {asset.cpuModel || 'Desconocido'}</div>
                        </td>
                        <td>
                          <span className="badge info" style={{ fontSize: '0.7rem' }}>{asset.osType}</span>
                          <div className="muted-text" style={{ fontSize: '0.7rem', marginTop: '2px' }}>v{asset.osVersion}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="status-dot" style={{ background: asset.status === 'ONLINE' ? 'var(--color-primary)' : 'var(--color-secondary)', boxShadow: 'none', width: '8px', height: '8px' }}></div>
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

        {selectedAsset && (
          <aside className="card-premium animate-fade-in" style={{ padding: 0, position: 'sticky', top: '2rem', height: 'fit-content', border: '1.5px solid var(--color-primary)' }}>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Vista 360° Activo</h3>
                  <p className="muted-text" style={{ fontSize: '0.85rem' }}>ID Interno: ASSET-{selectedAsset.id.toString().padStart(5, '0')}</p>
                </div>
                <button className="btn-icon" onClick={() => setSelectedAsset(null)}>✕</button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f1f5f9', padding: '1rem', borderRadius: '14px' }}>
                <div style={{ fontSize: '2.5rem' }}>{selectedAsset.osType === 'Linux' ? '🐧' : '💻'}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedAsset.hostname}</div>
                  <div className="badge success" style={{ fontSize: '0.65rem' }}>CERTIFICADO ISO 27001</div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Métricas de Salud</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div style={{ padding: '0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <div className="muted-text" style={{ fontSize: '0.7rem' }}>Visto por última vez</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.8rem' }}>
                      {selectedAsset.lastSeenAt ? new Date(selectedAsset.lastSeenAt).toLocaleString() : 'Nunca'}
                    </div>
                  </div>
                  <div style={{ padding: '0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <div className="muted-text" style={{ fontSize: '0.7rem' }}>Sincronización</div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Agente v{selectedAsset.agentVersion || '---'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Especificaciones Técnicas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">Board:</span>
                    <span style={{ fontWeight: 600 }}>{selectedAsset.motherboard || '---'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">Serial:</span>
                    <span style={{ fontWeight: 600 }}>{selectedAsset.serialNumber || '---'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted-text">Almacenamiento:</span>
                    <span style={{ fontWeight: 600, fontSize: '0.7rem', textAlign: 'right' }}>{selectedAsset.storageSummary || '---'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Mapa de Dependencias</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="badge" style={{ background: '#334155', color: '#fff' }}>Servicio ERP</span>
                  <span className="badge" style={{ background: '#334155', color: '#fff' }}>Active Directory</span>
                  <span className="badge" style={{ background: '#334155', color: '#fff' }}>Backup Core</span>
                </div>
                <p className="muted-text" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>⚠️ Impacto Crítico si el activo falla.</p>
              </div>

              <button 
                className="btn primary full" 
                style={{ marginTop: '1rem', padding: '1rem' }}
                onClick={() => generateAssetReport(selectedAsset)}
              >
                Generar Reporte Técnico
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
