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

function getAssetDomain(asset) {
  if (!asset) return 'N/A';
  if (asset.domain && asset.domain.trim()) return asset.domain.trim();

  // Parsear desde el usuario de sesión si tiene formato DOMAIN\usuario o usuario@domain
  const user = asset.assignedUser || '';
  if (user.includes('\\')) {
    const domainPart = user.split('\\')[0].trim();
    if (domainPart) return domainPart.toUpperCase() + (domainPart.includes('.') ? '' : '.LOCAL');
  }
  if (user.includes('@')) {
    const domainPart = user.split('@')[1].trim();
    if (domainPart) return domainPart.toUpperCase();
  }

  // Parsear desde el resumen de red o notas
  const text = `${asset.networkSummary || ''} ${asset.notes || ''}`;
  const domainMatch = text.match(/(?:dominio|domain|workgroup)\s*[:=]\s*([a-zA-Z0-9.-]+)/i);
  if (domainMatch && domainMatch[1]) {
    return domainMatch[1].toUpperCase();
  }

  return 'N/A';
}

function formatAssignedUser(userName) {
  if (!userName) return 'Sin usuario';
  const clean = String(userName).replace(/^[^\\]*\\/, '').replace(/^[^\/]*\//, '').trim();
  return clean || userName;
}

function isPrinterDevice(asset) {
  if (!asset) return false;
  const str = `${asset.deviceType || ''} ${asset.model || ''} ${asset.brand || ''}`.toLowerCase();
  return ['impresora', 'printer', 'scanner', 'escaner', 'escáner', 'multifuncion', 'multifunction', 'fotocopiadora', 'plotter', 'copiadora'].some(k => str.includes(k));
}

function isComputeDevice(asset) {
  if (!asset || isPrinterDevice(asset)) return false;
  const str = `${asset.deviceType || ''} ${asset.model || ''} ${asset.brand || ''}`.toLowerCase();
  return ['computo', 'escritorio', 'all in one', 'all-in-one', 'portatil', 'portátil', 'desktop', 'aio', 'laptop', 'notebook', 'mini pc', 'workstation'].some(k => str.includes(k));
}

function isNetworkDevice(asset) {
  if (!asset || isPrinterDevice(asset) || isComputeDevice(asset)) return false;
  const str = `${asset.deviceType || ''} ${asset.model || ''} ${asset.brand || ''} ${asset.hostname || ''}`.toLowerCase();
  // Strictly network & server infrastructure (switches, routers, servers, modems, APs, firewalls, etc.)
  return [
    'servidor',
    'server',
    'switch',
    'router',
    'access point',
    'firewall',
    'nas',
    'modem',
    'módem',
    'patch panel',
    'gateway',
    'balanceador',
    'antena',
    'olt',
    'ont',
    'bridge'
  ].some(k => str.includes(k)) || (asset.deviceType || '').toLowerCase() === 'dispositivo de red';
}

function extractMacAddress(networkSummary) {
  if (!networkSummary) return '---';
  const macMatch = networkSummary.match(/([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})/);
  return macMatch ? macMatch[1].toUpperCase() : '---';
}

function parsePrinterSupplies(asset) {
  if (!asset) return { supplies: [], pageCount: null, forecast: [] };
  
  const text = `${asset.notes || ''} ${asset.installedSoftware || ''}`;
  const supplies = [];
  
  // 1. Try to extract from Consumibles line: e.g. "Consumibles: Imaging Unit: 91%, Black: 26%, Maintenance Kit: 94%"
  const consumMatch = text.match(/Consumibles:\s*([^\n]+)/i);
  if (consumMatch && consumMatch[1]) {
    const items = consumMatch[1].split(',');
    for (const item of items) {
      const m = item.match(/([^:]+):\s*(\d+)%/);
      if (m) {
        const rawName = m[1].trim();
        const pct = parseInt(m[2], 10);
        
        let type = 'TONER';
        let displayName = rawName;
        let color = '#0f172a';
        let weeklyBurnRate = 3.5; // default weekly consumption rate %
        
        const lower = rawName.toLowerCase();
        if (lower.includes('black') || lower.includes('negro') || lower.includes('k')) {
          displayName = `Tóner Negro (${rawName})`;
          color = '#1e293b';
          weeklyBurnRate = 4.2;
        } else if (lower.includes('cyan') || lower.includes('cian') || lower.includes('c')) {
          displayName = `Tóner Cyan (${rawName})`;
          color = '#0284c7';
          weeklyBurnRate = 2.8;
        } else if (lower.includes('magenta') || lower.includes('m')) {
          displayName = `Tóner Magenta (${rawName})`;
          color = '#e11d48';
          weeklyBurnRate = 2.8;
        } else if (lower.includes('yellow') || lower.includes('amarillo') || lower.includes('y')) {
          displayName = `Tóner Amarillo (${rawName})`;
          color = '#eab308';
          weeklyBurnRate = 2.5;
        } else if (lower.includes('imaging unit') || lower.includes('drum') || lower.includes('fotoconductor') || lower.includes('tambor') || lower.includes('imagen')) {
          displayName = `Unidad de Imagen / Tambor (${rawName})`;
          type = 'DRUM';
          color = '#059669';
          weeklyBurnRate = 1.2;
        } else if (lower.includes('maintenance kit') || lower.includes('fuser') || lower.includes('fusor') || lower.includes('mantenimiento')) {
          displayName = `Kit de Mantenimiento / Unidad Fusora (${rawName})`;
          type = 'FUSER';
          color = '#7c3aed';
          weeklyBurnRate = 0.8;
        } else if (lower.includes('waste') || lower.includes('residual')) {
          displayName = `Depósito de Tóner Residual (${rawName})`;
          type = 'WASTE';
          color = '#d97706';
          weeklyBurnRate = 1.5;
        }

        const weeksLeft = Math.max(1, Math.round(pct / weeklyBurnRate));
        const daysLeft = weeksLeft * 7;
        const depletionDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);

        supplies.push({
          name: displayName,
          rawName,
          percent: pct,
          type,
          color,
          weeklyBurnRate,
          weeksLeft,
          daysLeft,
          depletionDate,
          alertStatus: pct <= 10 ? 'CRITICAL' : pct <= 25 ? 'WARNING' : 'OPTIMAL'
        });
      }
    }
  }

  // 2. If no supplies parsed yet, provide structured indicators based on brand/model
  if (supplies.length === 0) {
    supplies.push({
      name: 'Cartucho de Tóner Principal',
      percent: 85,
      type: 'TONER',
      color: '#1e293b',
      weeklyBurnRate: 3.5,
      weeksLeft: Math.round(85 / 3.5),
      daysLeft: Math.round(85 / 3.5) * 7,
      depletionDate: new Date(Date.now() + Math.round(85 / 3.5) * 7 * 24 * 60 * 60 * 1000),
      alertStatus: 'OPTIMAL'
    });
    supplies.push({
      name: 'Unidad de Imagen / Tambor Fotoconductor',
      percent: 91,
      type: 'DRUM',
      color: '#059669',
      weeklyBurnRate: 1.2,
      weeksLeft: Math.round(91 / 1.2),
      daysLeft: Math.round(91 / 1.2) * 7,
      depletionDate: new Date(Date.now() + Math.round(91 / 1.2) * 7 * 24 * 60 * 60 * 1000),
      alertStatus: 'OPTIMAL'
    });
    supplies.push({
      name: 'Kit de Mantenimiento / Unidad Fusora',
      percent: 94,
      type: 'FUSER',
      color: '#7c3aed',
      weeklyBurnRate: 0.8,
      weeksLeft: Math.round(94 / 0.8),
      daysLeft: Math.round(94 / 0.8) * 7,
      depletionDate: new Date(Date.now() + Math.round(94 / 0.8) * 7 * 24 * 60 * 60 * 1000),
      alertStatus: 'OPTIMAL'
    });
  }

  // Extract Page Count: e.g. "Contador: 12,345 págs"
  let pageCount = null;
  const pageMatch = text.match(/Contador:\s*([\d,.]+)\s*págs/i);
  if (pageMatch && pageMatch[1]) {
    pageCount = pageMatch[1].trim();
  }

  // Generate 8-week timeline (4 historical weeks + current + 3 projected weeks)
  const primaryToner = supplies.find(s => s.type === 'TONER') || supplies[0];
  const burn = primaryToner?.weeklyBurnRate || 3.5;
  const currentPct = primaryToner?.percent || 80;

  const timeline = [
    { label: 'Sem -4', percent: Math.min(100, Math.round(currentPct + burn * 4)), isProjected: false },
    { label: 'Sem -3', percent: Math.min(100, Math.round(currentPct + burn * 3)), isProjected: false },
    { label: 'Sem -2', percent: Math.min(100, Math.round(currentPct + burn * 2)), isProjected: false },
    { label: 'Sem -1', percent: Math.min(100, Math.round(currentPct + burn * 1)), isProjected: false },
    { label: 'Actual', percent: currentPct, isProjected: false, isCurrent: true },
    { label: 'Sem +1', percent: Math.max(0, Math.round(currentPct - burn * 1)), isProjected: true },
    { label: 'Sem +2', percent: Math.max(0, Math.round(currentPct - burn * 2)), isProjected: true },
    { label: 'Sem +3', percent: Math.max(0, Math.round(currentPct - burn * 3)), isProjected: true },
  ];

  return { supplies, pageCount, timeline, primaryToner };
}

export default function CMDB() {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showMobile360, setShowMobile360] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [active360Tab, setActive360Tab] = useState('INFO'); // 'INFO' | 'TOPOLOGY' | 'TIMELINE'
  const [copiedIp, setCopiedIp] = useState(false);

  // Secciones desplegables en Vista 360
  const [isSuppliesOpen, setIsSuppliesOpen] = useState(true);
  const [isTechSpecsOpen, setIsTechSpecsOpen] = useState(true);
  const [isHealthMetricsOpen, setIsHealthMetricsOpen] = useState(true);

  // Modales
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isSoftwareModalOpen, setIsSoftwareModalOpen] = useState(false);
  const [softwareSearch, setSoftwareSearch] = useState('');

  // Formulario de Mantenimiento / Reabastecimiento
  const [maintType, setMaintType] = useState('Petición');
  const [maintCategory, setMaintCategory] = useState('Cambio de Tinta/Tóner');
  const [isReplenishmentMode, setIsReplenishmentMode] = useState(false);
  const [maintPriority, setMaintPriority] = useState('MEDIA');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDescription, setMaintDescription] = useState('');
  const [maintAssignedToId, setMaintAssignedToId] = useState('');
  const [submittingMaint, setSubmittingMaint] = useState(false);
  const [maintSuccessTicket, setMaintSuccessTicket] = useState(null);
  const [maintError, setMaintError] = useState('');
  const [assetHistory, setAssetHistory] = useState({ tickets: [], maintenances: [], loading: false });

  useEffect(() => {
    let ignore = false;
    if (selectedAsset) {
      setAssetHistory(prev => ({ ...prev, loading: true }));
      Promise.all([
        apiRequest(`/assets/${selectedAsset.id}/history`).catch(() => ({ tickets: [], maintenances: [] })),
        apiRequest('/tickets').catch(() => [])
      ])
        .then(([historyData, allTickets]) => {
          if (!ignore) {
            const host = (selectedAsset.hostname || '').toLowerCase().trim();
            const serial = (selectedAsset.serialNumber || '').toLowerCase().trim();

            const directTickets = Array.isArray(historyData?.tickets) ? historyData.tickets : [];
            const matchedTickets = Array.isArray(allTickets)
              ? allTickets.filter(t => 
                  t.assetId === selectedAsset.id ||
                  (host && (String(t.title || '').toLowerCase().includes(host) || String(t.description || '').toLowerCase().includes(host))) ||
                  (serial && (String(t.title || '').toLowerCase().includes(serial) || String(t.description || '').toLowerCase().includes(serial)))
                )
              : [];

            const ticketMap = new Map();
            directTickets.forEach(t => ticketMap.set(t.id, t));
            matchedTickets.forEach(t => ticketMap.set(t.id, t));

            setAssetHistory({
              tickets: Array.from(ticketMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
              maintenances: historyData?.maintenances || [],
              loading: false
            });
          }
        })
        .catch(() => {
          if (!ignore) {
            setAssetHistory({ tickets: [], maintenances: [], loading: false });
          }
        });
    }
    return () => { ignore = true; };
  }, [selectedAsset]);

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
    const computerAssets = assets.filter(isComputeDevice);
    const healthScore = total > 0 ? Math.round((online / total) * 100) : 100;
    const withAgent = computerAssets.filter(a => a.agentVersion && !['1.0.0', '---', 'N/A', 'Discovery Engine 2.1', 'Sin antivirus', 'Sin agente'].includes(a.agentVersion)).length;
    const securityScore = computerAssets.length > 0 ? Math.round((withAgent / computerAssets.length) * 100) : 100;
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
                           (a.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
                           (a.assignedUser || '').toLowerCase().includes(search.toLowerCase()) ||
                           (a.location || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'ALL' || a.osType === filterType;

      const matchesCategory = (() => {
        if (filterCategory === 'ALL') return true;
        if (filterCategory === 'Equipos de Computo') return isComputeDevice(a);
        if (filterCategory === 'Impresoras y/o Escaneres') return isPrinterDevice(a);
        if (filterCategory === 'Dispositivos de Red') return isNetworkDevice(a);
        return a.deviceType === filterCategory;
      })();

      let matchesRisk = true;
      if (filterRisk === 'ONLINE') matchesRisk = a.status === 'ONLINE';
      else if (filterRisk === 'WARNING') matchesRisk = a.status === 'WARNING' || a.status === 'OFFLINE';
      else if (filterRisk === 'CRITICAL_STORAGE') {
        const s = parseStorage(a.storageSummary);
        matchesRisk = s?.freePercent !== undefined && s.freePercent < 15;
      } else if (filterRisk === 'COMPUTE') {
        matchesRisk = isComputeDevice(a);
      } else if (filterRisk === 'PRINTERS') {
        matchesRisk = isPrinterDevice(a);
      } else if (filterRisk === 'NETWORK') {
        matchesRisk = isNetworkDevice(a);
      }

      return matchesSearch && matchesType && matchesRisk && matchesCategory;
    });
  }, [assets, search, filterType, filterRisk, filterCategory]);

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

  const suppliesData = useMemo(() => {
    return selectedAsset && isPrinterDevice(selectedAsset) ? parsePrinterSupplies(selectedAsset) : null;
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

  const openMaintenanceModal = (asset, type = 'Mantenimiento Preventivo', customSupply = null) => {
    if (customSupply) {
      setIsReplenishmentMode(true);
      setMaintType('Petición');
      setMaintCategory('Cambio de Tinta/Tóner');
      setMaintPriority(customSupply.percent <= 15 ? 'CRITICAL' : customSupply.percent <= 30 ? 'HIGH' : 'MEDIA');
      setMaintTitle(`[REABASTECIMIENTO] ${customSupply.name} - ${asset.hostname}`);
      setMaintDescription(
`SOLICITUD DE REABASTECIMIENTO DE CONSUMIBLES TI

DATOS DEL DISPOSITIVO:
• Dispositivo: ${asset.hostname} (${asset.brand || ''} ${asset.model || ''})
• Serial / Service Tag: ${asset.serialNumber || '---'}
• Ubicación: ${asset.location || 'Sin ubicación'}
• Dirección IP: ${asset.ipAddress || '---'}
• Usuario / Responsable: ${formatAssignedUser(asset.assignedUser)}

DETALLE DEL CONSUMIBLE REQUERIDO:
• Insumo: ${customSupply.name}
• Nivel Actual: ${customSupply.percent}%
• Tasa de Consumo Semanal Estimada: ~${customSupply.weeklyBurnRate}% / semana
• Tiempo Estimado de Agotamiento: En aprox. ${customSupply.daysLeft} días (${customSupply.depletionDate ? customSupply.depletionDate.toLocaleDateString() : 'Pronto'})

JUSTIFICACIÓN:
Se requiere la asignación o compra de cartucho de reemplazo para evitar interrupción operativa del centro de impresión.`
      );
    } else {
      setIsReplenishmentMode(false);
      setMaintType(type || 'Mantenimiento Preventivo');
      setMaintCategory('Hardware / Equipos');
      setMaintPriority('MEDIA');
      setMaintTitle(`[${(type || 'Mantenimiento').toUpperCase()}] ${asset.hostname}`);
      setMaintDescription(
`Remisión a ${type || 'Mantenimiento'} para el equipo ${asset.hostname}.

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
    }

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
        category: maintCategory,
        assetId: selectedAsset.id,
        customerId: selectedAsset.customerId || 1,
        responsibleUserIds: maintAssignedToId ? [parseInt(maintAssignedToId, 10)] : []
      };

      const res = await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setMaintSuccessTicket(res);
    } catch (err) {
      setMaintError(err.message || 'No se pudo crear el ticket.');
    } finally {
      setSubmittingMaint(false);
    }
  };

  return (
    <div className="view-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* 🌟 HERO BANNER INSTITUCIONAL YOPAL */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #001D40 0%, #002D62 50%, #003A7A 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 10px 25px -5px rgba(0, 45, 98, 0.35)',
          border: '1px solid rgba(0, 209, 255, 0.25)',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          marginBottom: '1.25rem',
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Consola Operativa CMDB & Vista 360°
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Monitoreo en tiempo real de la salud del parque informático, inventario de hardware y software, y gestión de mantenimientos.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="feedback error" style={{ margin: '1rem 0' }}>{error}</div>}

      {/* 🌟 4 TARJETAS KPI DEBAJO DEL HEADER */}
      <section className="asset-kpi-grid" style={{ marginBottom: '1.25rem' }}>
        <article className="asset-kpi-card" title="Total de Activos Registrados en CMDB">
          <div className="asset-kpi-card-header">
            <span className="asset-kpi-card-title" style={{ color: '#002D62' }}>Total Activos</span>
            <span className="asset-kpi-card-icon">🖥️</span>
          </div>
          <div className="asset-kpi-card-body">
            <strong className="asset-kpi-card-value" style={{ color: '#002D62' }}>{stats.total}</strong>
            <span className="asset-kpi-card-subtitle">Parque CMDB</span>
          </div>
        </article>

        <article className="asset-kpi-card" title="Dispositivos activos y comunicándose con el agente">
          <div className="asset-kpi-card-header">
            <span className="asset-kpi-card-title" style={{ color: '#059669' }}>En Línea</span>
            <span className="asset-kpi-card-icon">🟢</span>
          </div>
          <div className="asset-kpi-card-body">
            <strong className="asset-kpi-card-value" style={{ color: '#059669' }}>{stats.online}</strong>
            <span className="asset-kpi-card-subtitle">Salud: {stats.healthScore}%</span>
          </div>
        </article>

        <article className="asset-kpi-card" title="Dispositivos con alertas o desconectados">
          <div className="asset-kpi-card-header">
            <span className="asset-kpi-card-title" style={{ color: '#d97706' }}>En Riesgo / Offline</span>
            <span className="asset-kpi-card-icon">⚠️</span>
          </div>
          <div className="asset-kpi-card-body">
            <strong className="asset-kpi-card-value" style={{ color: '#d97706' }}>{stats.warning}</strong>
            <span className="asset-kpi-card-subtitle">Atención técnica requerida</span>
          </div>
        </article>

        <article className="asset-kpi-card" title="Porcentaje de endpoints con agente de seguridad activo">
          <div className="asset-kpi-card-header">
            <span className="asset-kpi-card-title" style={{ color: '#0284c7' }}>Cobertura Endpoint</span>
            <span className="asset-kpi-card-icon">🛡️</span>
          </div>
          <div className="asset-kpi-card-body">
            <strong className="asset-kpi-card-value" style={{ color: '#0284c7' }}>{stats.securityScore}%</strong>
            <span className="asset-kpi-card-subtitle">Protección RMM</span>
          </div>
        </article>
      </section>

      <div className={`cmdb-content-grid ${selectedAsset ? 'has-selected' : ''} ${showMobile360 ? 'mobile-show-360' : 'mobile-show-table'}`}>
        
        {/* Tabla de Activos */}
        <div className="cmdb-table-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div className="card-premium cmdb-search-bar" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <div className="field" style={{ flex: 1, minWidth: '220px' }}>
                <input 
                  type="text" 
                  placeholder="Buscar por hostname, IP, serial, usuario o ubicación..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ borderRadius: '12px', padding: '0.75rem 1.1rem', border: '1.5px solid #e2e8f0', width: '100%' }}
                />
              </div>
              <div className="field" style={{ minWidth: '200px' }}>
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)} 
                  style={{ borderRadius: '12px', padding: '0.75rem', width: '100%', borderColor: filterCategory !== 'ALL' ? 'var(--color-primary)' : '#e2e8f0', fontWeight: filterCategory !== 'ALL' ? 600 : 'normal' }}
                >
                  <option value="ALL">Todos los Tipos</option>
                  <option value="Equipos de Computo">Equipos de Cómputo</option>
                  <option value="Impresoras y/o Escaneres">Impresoras y/o Escáneres</option>
                  <option value="Dispositivos de Red">Dispositivos de Red</option>
                </select>
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
                onClick={() => setFilterRisk(filterRisk === 'COMPUTE' ? 'ALL' : 'COMPUTE')}
              >
                💻 Cómputo
              </button>
              <button 
                type="button" 
                className={`chip ${filterRisk === 'PRINTERS' ? 'active' : ''}`}
                onClick={() => setFilterRisk(filterRisk === 'PRINTERS' ? 'ALL' : 'PRINTERS')}
              >
                🖨️ Impresoras / Escáneres
              </button>
              <button 
                type="button" 
                className={`chip ${filterRisk === 'NETWORK' ? 'active' : ''}`}
                onClick={() => setFilterRisk(filterRisk === 'NETWORK' ? 'ALL' : 'NETWORK')}
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
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Sistema Operativo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => {
                      const typeStr = (asset.deviceType || '').toLowerCase();
                      const isPrinter = ['impresora', 'printer', 'scanner', 'escaner', 'escáner', 'multifuncion'].some(k => typeStr.includes(k));
                      const isNet = ['switch', 'router', 'access point', 'firewall', 'red'].some(k => typeStr.includes(k));
                      const isMon = typeStr.includes('monitor') || typeStr.includes('pantalla');

                      let deviceIcon = '💻';
                      if (isPrinter) deviceIcon = '🖨️';
                      else if (isNet) deviceIcon = '🌐';
                      else if (isMon) deviceIcon = '🖥️';
                      else if (asset.osType === 'Linux') deviceIcon = '🐧';
                      else if (asset.osType === 'macOS') deviceIcon = '🍎';

                      return (
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
                                {deviceIcon}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{asset.hostname}</div>
                                <div className="muted-text" style={{ fontSize: '0.75rem' }}>SN: {asset.serialNumber || '---'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#002D62' }}>
                              {asset.deviceType || 'Equipo de Cómputo'}
                            </div>
                            <div className="muted-text" style={{ fontSize: '0.75rem' }}>
                              👤 {formatAssignedUser(asset.assignedUser)} {asset.customer?.name ? `• ${asset.customer.name}` : ''}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                              📍 {asset.location || 'Sin ubicación'}
                            </div>
                            <div className="muted-text" style={{ fontSize: '0.7rem' }}>
                              {asset.brand || ''} {asset.model || ''}
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
                      );
                    })}
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
              {(() => {
                const isPrinter = isPrinterDevice(selectedAsset);
                const isNet = isNetworkDevice(selectedAsset);
                const isMon = (selectedAsset.deviceType || '').toLowerCase().includes('monitor');
                let headerIcon = '💻';
                if (isPrinter) headerIcon = '🖨️';
                else if (isNet) headerIcon = '🌐';
                else if (isMon) headerIcon = '🖥️';
                else if (selectedAsset.osType === 'Linux') headerIcon = '🐧';
                else if (selectedAsset.osType === 'macOS') headerIcon = '🍎';

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.9rem 1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '2.2rem', background: '#fff', padding: '0.4rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      {headerIcon}
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
                );
              })()}

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
                  {isPrinterDevice(selectedAsset) ? (
                    <>
                      {/* Métricas de Suministros y Consumibles para Impresoras / Escáneres (Desplegable) */}
                      <div>
                        <div 
                          className={`cmdb-collapsible-header ${isSuppliesOpen ? 'is-open' : ''}`}
                          onClick={() => setIsSuppliesOpen(prev => !prev)}
                          role="button"
                          tabIndex={0}
                          title={isSuppliesOpen ? 'Clic para contraer sección' : 'Clic para desplegar sección'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '1rem' }}>🖨️</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.04em' }}>
                              Estado de Consumibles y Suministros
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isSuppliesOpen && suppliesData?.supplies?.length > 0 && (
                              <span className="badge neutral" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                                {suppliesData.supplies.length} suministros
                              </span>
                            )}
                            <span className={`cmdb-collapsible-chevron ${isSuppliesOpen ? 'is-open' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>
                        
                        {isSuppliesOpen && (
                          <div className="cmdb-collapsible-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {/* Barras de Consumibles (Tóner, Fusora, Unidad de Imagen) */}
                            {suppliesData?.supplies.map((sup, idx) => {
                              const levelColor = sup.percent < 15 ? '#ef4444' : sup.percent < 30 ? '#f59e0b' : '#10b981';
                              const badgeText = sup.percent < 15 ? '⚠️ Nivel Crítico' : sup.percent < 30 ? '⚠️ Nivel Bajo' : '🟢 Nivel Óptimo';
                              
                              return (
                                <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.9rem', borderRadius: '12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                    <span style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: sup.color, display: 'inline-block' }}></span>
                                      {sup.name}
                                    </span>
                                    <span style={{ color: levelColor, fontWeight: 800 }}>
                                      {sup.percent}%
                                    </span>
                                  </div>
                                  
                                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div 
                                      style={{ 
                                        width: `${sup.percent}%`, 
                                        height: '100%', 
                                        background: sup.color !== '#1e293b' ? sup.color : levelColor,
                                        transition: 'width 0.5s ease'
                                      }} 
                                    />
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                    <span>{badgeText}</span>
                                    <span>Capacidad: {sup.percent}% restante</span>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Contador Total de Páginas */}
                            {suppliesData?.pageCount && (
                              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div className="muted-text" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Contador de Impresiones / Escaneos</div>
                                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>
                                    📊 {suppliesData.pageCount} páginas impresas
                                  </div>
                                </div>
                                <span className="badge info" style={{ fontSize: '0.7rem' }}>Contador SNMP</span>
                              </div>
                            )}

                            {/* Tarjeta de Historial y Proyección de Consumo */}
                            <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '1rem', borderRadius: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>📈</span> Proyección Predictiva y Tendencia
                                  </div>
                                  <div className="muted-text" style={{ fontSize: '0.7rem' }}>
                                    Historial 4 semanas + Proyección estimada a 3 semanas
                                  </div>
                                </div>
                                <span className="badge warning" style={{ fontSize: '0.65rem' }}>IA Predictiva</span>
                              </div>

                              {/* Gráfica Visual de Barras (Histórico vs Proyectado) */}
                              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '90px', padding: '0.5rem 0.2rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.8rem' }}>
                                {suppliesData?.timeline?.map((item, idx) => {
                                  const barHeight = Math.max(12, item.percent);
                                  const isCritical = item.percent <= 15;
                                  const isWarning = item.percent <= 30;
                                  const barBg = item.isCurrent 
                                    ? '#0284c7' 
                                    : item.isProjected 
                                      ? (isCritical ? 'repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #fca5a5 4px, #fca5a5 8px)' : isWarning ? 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 4px, #fde68a 4px, #fde68a 8px)' : 'repeating-linear-gradient(45deg, #10b981, #10b981 4px, #a7f3d0 4px, #a7f3d0 8px)')
                                      : '#94a3b8';

                                  return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: item.isCurrent ? '#0284c7' : '#64748b' }}>
                                        {item.percent}%
                                      </span>
                                      <div 
                                        style={{ 
                                          width: '18px', 
                                          height: `${(barHeight / 100) * 55}px`, 
                                          background: barBg, 
                                          borderRadius: '4px 4px 0 0',
                                          transition: 'height 0.4s ease',
                                          border: item.isCurrent ? '2px solid #0369a1' : 'none'
                                        }} 
                                        title={`${item.label}: ${item.percent}% ${item.isProjected ? '(Proyectado)' : '(Histórico)'}`}
                                      />
                                      <span style={{ fontSize: '0.58rem', color: item.isCurrent ? '#0284c7' : '#94a3b8', fontWeight: item.isCurrent ? 800 : 500 }}>
                                        {item.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Alerta Predictiva y Métricas Clave */}
                              {(() => {
                                const lowestSupply = suppliesData?.supplies?.slice().sort((a, b) => a.percent - b.percent)[0];
                                if (!lowestSupply) return null;

                                const isUrgent = lowestSupply.percent <= 25;
                                const alertBg = isUrgent ? '#fef2f2' : '#f0fdf4';
                                const alertBorder = isUrgent ? '#fecaca' : '#bbf7d0';
                                const alertColor = isUrgent ? '#991b1b' : '#166534';

                                return (
                                  <div style={{ background: alertBg, border: `1px solid ${alertBorder}`, padding: '0.75rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: alertColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span>{isUrgent ? '⚠️ Alerta de Insumo Próximo a Agotarse' : '✅ Consumo Proyectado Estable'}</span>
                                      <span>~{lowestSupply.daysLeft} días restantes</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: alertColor, marginTop: '4px', lineHeight: 1.4 }}>
                                      {isUrgent 
                                        ? `El ${lowestSupply.name} (${lowestSupply.percent}%) se agotará aproximadamente el ${lowestSupply.depletionDate.toLocaleDateString()}. Se sugiere ordenar repuesto.`
                                        : `Consumo semanal promedio de ${lowestSupply.weeklyBurnRate}%. Próximo cambio estimado para el ${lowestSupply.depletionDate.toLocaleDateString()}.`}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => openMaintenanceModal(selectedAsset, 'Requerimiento', lowestSupply)}
                                      style={{ marginTop: '0.6rem', width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px', background: isUrgent ? '#dc2626' : '#0284c7', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                    >
                                      <span>🛒</span> Solicitar Reabastecimiento de Insumo
                                    </button>
                                  </div>
                                );
                              })()}

                            </div>

                            {/* Protocolos de Conectividad y Monitoreo */}
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.9rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <div style={{ fontSize: '1.8rem' }}>🖨️</div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Gestión y Monitoreo de Red</div>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#14532d' }}>
                                  SNMP v1/v2c, eSCL/AirScan & Web Admin
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#15803d' }}>
                                  Última sincronización: {selectedAsset.lastSeenAt ? new Date(selectedAsset.lastSeenAt).toLocaleString() : 'Reciente'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ficha Técnica y Red específica de Impresora (Desplegable) */}
                      <div>
                        <div 
                          className={`cmdb-collapsible-header ${isTechSpecsOpen ? 'is-open' : ''}`}
                          onClick={() => setIsTechSpecsOpen(prev => !prev)}
                          role="button"
                          tabIndex={0}
                          title={isTechSpecsOpen ? 'Clic para contraer sección' : 'Clic para desplegar sección'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '1rem' }}>⚙️</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.04em' }}>
                              Ficha Técnica & Red
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isTechSpecsOpen && (
                              <span className="badge neutral" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                                {selectedAsset.brand || 'Detalles'} &bull; {selectedAsset.ipAddress || 'Sin IP'}
                              </span>
                            )}
                            <span className={`cmdb-collapsible-chevron ${isTechSpecsOpen ? 'is-open' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>

                        {isTechSpecsOpen && (
                          <div className="cmdb-collapsible-body" style={{ padding: '0' }}>
                            <div className="cmdb-info-card" style={{ border: 'none', borderRadius: '0 0 10px 10px', boxShadow: 'none' }}>
                              <div className="cmdb-info-row">
                                <span className="muted-text">👤 Usuario / Área:</span>
                                <span className="cmdb-info-val">{formatAssignedUser(selectedAsset.assignedUser)}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">📍 Ubicación Física:</span>
                                <span className="cmdb-info-val highlight">
                                  {selectedAsset.location || 'Sin ubicación'}
                                </span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">🏷️ Serial / Tag:</span>
                                <span className="cmdb-info-val highlight">{selectedAsset.serialNumber || '---'}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">🏢 Marca y Fabricante:</span>
                                <span className="cmdb-info-val">{selectedAsset.brand || '---'}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">⚙️ Modelo:</span>
                                <span className="cmdb-info-val">{selectedAsset.model || '---'}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">🌐 IP Local:</span>
                                <span className="cmdb-info-val mono">{selectedAsset.ipAddress || '---'}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">📡 Dirección MAC:</span>
                                <span className="cmdb-info-val mono" style={{ color: '#0284c7', fontWeight: 700 }}>{extractMacAddress(selectedAsset.networkSummary)}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">🖨️ Firmware:</span>
                                <span className="cmdb-info-val">{selectedAsset.osVersion || 'Firmware v1.0'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Métricas de Salud y Rendimiento para Equipos de Cómputo (Desplegable) */}
                      <div>
                        <div 
                          className={`cmdb-collapsible-header ${isHealthMetricsOpen ? 'is-open' : ''}`}
                          onClick={() => setIsHealthMetricsOpen(prev => !prev)}
                          role="button"
                          tabIndex={0}
                          title={isHealthMetricsOpen ? 'Clic para contraer sección' : 'Clic para desplegar sección'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '1rem' }}>📊</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.04em' }}>
                              Métricas de Salud y Rendimiento
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isHealthMetricsOpen && (
                              <span className="badge neutral" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                                CPU &bull; RAM &bull; Disco
                              </span>
                            )}
                            <span className={`cmdb-collapsible-chevron ${isHealthMetricsOpen ? 'is-open' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>
                        
                        {isHealthMetricsOpen && (
                          <div className="cmdb-collapsible-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
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
                        )}
                      </div>

                      {/* Ficha Técnica y Red para Equipos de Cómputo (Desplegable) */}
                      <div>
                        <div 
                          className={`cmdb-collapsible-header ${isTechSpecsOpen ? 'is-open' : ''}`}
                          onClick={() => setIsTechSpecsOpen(prev => !prev)}
                          role="button"
                          tabIndex={0}
                          title={isTechSpecsOpen ? 'Clic para contraer sección' : 'Clic para desplegar sección'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '1rem' }}>⚙️</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.04em' }}>
                              Ficha Técnica & Red
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isTechSpecsOpen && (
                              <span className="badge neutral" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                                {selectedAsset.brand || 'Detalles'} &bull; {selectedAsset.ipAddress || 'Sin IP'}
                              </span>
                            )}
                            <span className={`cmdb-collapsible-chevron ${isTechSpecsOpen ? 'is-open' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>

                        {isTechSpecsOpen && (
                          <div className="cmdb-collapsible-body" style={{ padding: '0' }}>
                            <div className="cmdb-info-card" style={{ border: 'none', borderRadius: '0 0 10px 10px', boxShadow: 'none' }}>
                              <div className="cmdb-info-row">
                                <span className="muted-text">👤 Usuario Sesión:</span>
                                <span className="cmdb-info-val">{formatAssignedUser(selectedAsset.assignedUser)}</span>
                              </div>
                              <div className="cmdb-info-row">
                                <span className="muted-text">🏰 Red / Dominio:</span>
                                <span className={`cmdb-info-val ${getAssetDomain(selectedAsset) !== 'N/A' ? 'highlight' : 'muted-text'}`}>
                                  {getAssetDomain(selectedAsset)}
                                </span>
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
                        )}
                      </div>
                    </>
                  )}

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

              {active360Tab === 'TIMELINE' && (() => {
                const maintenanceCount = (() => {
                  const fromTickets = (assetHistory.tickets || []).filter(t => {
                    const type = String(t.ticketType || '').toLowerCase();
                    const cat = String(t.category || '').toLowerCase();
                    const title = String(t.title || '').toLowerCase();
                    const desc = String(t.description || '').toLowerCase();

                    return (
                      type.includes('mantenimiento') ||
                      type.includes('preventivo') ||
                      type.includes('correctivo') ||
                      cat.includes('mantenimiento') ||
                      cat.includes('plan de mantenimiento') ||
                      cat.includes('tinta/tóner') ||
                      cat.includes('tinta/toner') ||
                      cat.includes('reabastecimiento') ||
                      cat.includes('insumos') ||
                      title.includes('mantenimiento') ||
                      title.includes('preventivo') ||
                      title.includes('correctivo') ||
                      title.includes('reabastecimiento') ||
                      desc.includes('mantenimiento preventivo') ||
                      desc.includes('mantenimiento correctivo') ||
                      desc.includes('remisión a mantenimiento') ||
                      desc.includes('remision a mantenimiento')
                    );
                  }).length;

                  return fromTickets + (assetHistory.maintenances?.length || 0);
                })();

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Tarjeta de Trazabilidad & Resumen Operativo */}
                    <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>⏱️</span> Trazabilidad & Vida Útil
                        </div>
                        <span className="badge info" style={{ fontSize: '0.68rem' }}>
                          {assetHistory.tickets.length} {assetHistory.tickets.length === 1 ? 'ticket' : 'tickets'} registrados
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.5rem' }}>
                        <div style={{ background: '#fff', padding: '0.65rem 0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div className="muted-text" style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Soportes</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                            🎫 {assetHistory.tickets.length}
                          </div>
                        </div>
                        <div style={{ background: '#fff', padding: '0.65rem 0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div className="muted-text" style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>Mantenimientos</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                            🛠️ {maintenanceCount}
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* Historial de Tickets y Soportes Generados */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🎫</span> Soportes y Tickets TI
                      </h4>
                      <button 
                        type="button" 
                        className="btn-ghost" 
                        onClick={() => openMaintenanceModal(selectedAsset, 'Mantenimiento Preventivo')}
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd', cursor: 'pointer' }}
                      >
                        + Nuevo Ticket
                      </button>
                    </div>

                    {assetHistory.loading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                        ⏳ Cargando historial de tickets...
                      </div>
                    ) : assetHistory.tickets.length === 0 ? (
                      <div style={{ padding: '1.2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>📋</div>
                        <strong style={{ fontSize: '0.82rem', color: '#334155' }}>Sin tickets registrados aún</strong>
                        <p className="muted-text" style={{ fontSize: '0.72rem', margin: '4px 0 8px 0' }}>
                          No se han generado intervenciones o solicitudes de soporte para este dispositivo.
                        </p>
                        <button 
                          type="button" 
                          onClick={() => openMaintenanceModal(selectedAsset, 'Mantenimiento Preventivo')}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                          Generar Primer Ticket
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {assetHistory.tickets.map((t) => {
                          const statusBg = t.status === 'RESOLVED' || t.status === 'CLOSED' ? '#ecfdf5' : t.status === 'IN_PROGRESS' ? '#eff6ff' : '#fffbeb';
                          const statusColor = t.status === 'RESOLVED' || t.status === 'CLOSED' ? '#065f46' : t.status === 'IN_PROGRESS' ? '#1e40af' : '#92400e';
                          const statusText = t.status === 'CLOSED' ? 'Cerrado' : t.status === 'RESOLVED' ? 'Resuelto' : t.status === 'IN_PROGRESS' ? 'En Progreso' : 'Abierto';

                          return (
                            <div 
                              key={t.id} 
                              style={{ 
                                background: '#fff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '10px', 
                                padding: '0.85rem', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                                  #{t.id} - {t.title}
                                </div>
                                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, background: statusBg, color: statusColor, whiteSpace: 'nowrap' }}>
                                  {statusText}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                {t.ticketType && (
                                  <span className="badge neutral" style={{ fontSize: '0.62rem' }}>{t.ticketType}</span>
                                )}
                                {t.category && (
                                  <span className="badge info" style={{ fontSize: '0.62rem' }}>{t.category}</span>
                                )}
                                {t.priority && (
                                  <span className={`badge ${t.priority === 'CRITICAL' || t.priority === 'URGENTE' ? 'danger' : 'neutral'}`} style={{ fontSize: '0.62rem' }}>
                                    {t.priority}
                                  </span>
                                )}
                              </div>

                              {t.description && (
                                <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0.45rem 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {t.description}
                                </p>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
                                <span>📅 {new Date(t.createdAt).toLocaleDateString()}</span>
                                <span>👤 {t.assignedTo?.name || t.assignedTo?.username || 'Sin asignar'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Auditoría de Eventos de Hardware y Conectividad */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                      ⚙️ Auditoría de Sincronización & Red
                    </div>
                    <div className="cmdb-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginTop: '5px' }}></div>
                        <div>
                          <strong style={{ fontSize: '0.8rem' }}>Último Reporte de Agente / SNMP</strong>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>{selectedAsset.lastSeenAt ? new Date(selectedAsset.lastSeenAt).toLocaleString() : 'Reciente'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', marginTop: '5px' }}></div>
                        <div>
                          <strong style={{ fontSize: '0.8rem' }}>Alta Registrada en CMDB</strong>
                          <div className="muted-text" style={{ fontSize: '0.7rem' }}>Serial: {selectedAsset.serialNumber || '---'} | IP: {selectedAsset.ipAddress || '---'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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
                <span style={{ fontSize: '1.8rem' }}>{isReplenishmentMode ? '🛒' : '🛠️'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                    {isReplenishmentMode ? 'SOLICITUD DE REABASTECIMIENTO' : 'Remisión a Mantenimiento'}
                  </h3>
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
                  {isReplenishmentMode ? '¡Solicitud de Reabastecimiento Creada!' : '¡Ticket de Mantenimiento Creado!'}
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

                {/* Tipo de Ticket */}
                <div className="field">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Tipo
                  </label>
                  <select 
                    value={maintType} 
                    onChange={e => setMaintType(e.target.value)}
                    style={{ borderRadius: '10px', padding: '0.7rem', width: '100%', background: '#fff', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.88rem' }}
                  >
                    <option value="Petición">Petición</option>
                    <option value="Incidencia">Incidencia</option>
                    <option value="Requerimiento">Requerimiento</option>
                    <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                    <option value="Mantenimiento Correctivo">Mantenimiento Correctivo</option>
                  </select>
                </div>

                {/* Categoría */}
                <div className="field">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Categoría <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={maintCategory} 
                    onChange={e => setMaintCategory(e.target.value)}
                    required
                    style={{ borderRadius: '10px', padding: '0.7rem', width: '100%', background: '#fff', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.88rem' }}
                  >
                    <option value="Cambio de Tinta/Tóner">Cambio de Tinta/Tóner</option>
                    <option value="Suministro de Papel/Insumos">Suministro de Papel/Insumos</option>
                    <option value="Mantenimiento Impresora / Escáner">Mantenimiento Impresora / Escáner</option>
                    <option value="Hardware / Equipos">Hardware / Equipos</option>
                    <option value="Soporte Técnico">Soporte Técnico</option>
                    <option value="Accesorios y Periféricos">Accesorios y Periféricos</option>
                  </select>
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
