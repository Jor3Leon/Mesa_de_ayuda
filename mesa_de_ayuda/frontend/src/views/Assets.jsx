import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function getStatusLabel(status) {
  const labels = { NEW: 'Nuevo', OPEN: 'En Progreso', IN_PROGRESS: 'En Progreso', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' };
  return labels[status] || status;
}

const initialForm = {
  hostname: '',
  ipAddress: '',
  mac: '',
  osType: '',
  osVersion: '',
  status: '',
  customerId: '',
  serialNumber: '',
  brand: '',
  model: '',
  deviceType: '',
  assignedUser: '',
  location: '',
  agentVersion: '',
  lastSeenAt: '',
  motherboard: '',
  cpuModel: '',
  ramSummary: '',
  storageSummary: '',
  networkSummary: '',
  graphicsInfo: '',
  displayInfo: '',
  notes: '',
};

const initialDisplayDraft = {
  hostname: '',
  type: '',
  model: '',
  plate: '',
  serial: '',
};

function getStatusClass(status) {
  if (status === 'ONLINE') return 'badge-success';
  if (status === 'WARNING') return 'badge-warning';
  return 'badge-danger';
}

function getTicketStatusClass(status) {
  const mapping = {
    NEW: 'badge-warning',
    OPEN: 'badge-info',
    IN_PROGRESS: 'badge-info',
    RESOLVED: 'badge-success',
    CLOSED: 'badge-closed',
  };
  return mapping[status] || 'badge-neutral';
}

function formatLastSeen(value) {
  if (!value) return 'Sin reporte';
  return new Date(value).toLocaleString();
}

function getAssetPlate(hostname) {
  if (!hostname) return '---';
  const matches = hostname.match(/\d+/g);
  return matches ? matches.join('') : '---';
}

function extractMacAddress(networkSummary) {
  if (!networkSummary) return '---';
  const match = networkSummary.match(/([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})/i);
  return match ? match[1].toUpperCase() : '---';
}

function extractNetworkCard(networkSummary) {
  if (!networkSummary) return '---';
  // 1. If format is NIC: Realtek PCIe ... | IP: ... | MAC: ...
  const nicMatch = networkSummary.match(/NIC:\s*([^|]+)/i);
  if (nicMatch && nicMatch[1].trim()) {
    return nicMatch[1].trim();
  }
  // 2. If it contains a recognized adapter vendor or name
  const adapterMatch = networkSummary.match(/((Intel|Realtek|Broadcom|Qualcomm|Atheros|MediaTek|Marvell|Killer|TP-Link|D-Link|Gigabit|Wi-Fi|Wireless|Ethernet|Fast Ethernet)[^|\n]+)/i);
  if (adapterMatch && adapterMatch[1].trim()) {
    return adapterMatch[1].trim();
  }
  // 3. Fallback: if it has IP and MAC, return "Tarjeta de Red Ethernet / Wi-Fi" or the summary
  if (networkSummary.includes('IP:') && networkSummary.includes('MAC:')) {
    return 'Adaptador de Red Integrado (Ethernet/Wi-Fi)';
  }
  return networkSummary;
}

function formatAssignedUser(userName) {
  if (!userName) return 'No asignado';
  // Strip domain prefixes e.g. "ALCYOPAL\jherson.rivera" -> "jherson.rivera"
  const clean = String(userName).replace(/^[^\\]*\\/, '').replace(/^[^\/]*\//, '').trim();
  return clean || userName;
}

function buildDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  try {
    return localDate.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function parseDisplayEntries(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const entry = { ...initialDisplayDraft };

      line.split('|').forEach((part) => {
        const [rawLabel, ...rest] = part.split(':');
        const label = rawLabel?.trim().toLowerCase();
        const content = rest.join(':').trim();

        if (label === 'hostname') entry.hostname = content;
        if (label === 'tipo') entry.type = content;
        if (label === 'modelo') entry.model = content;
        if (label === 'placa') entry.plate = content;
        if (label === 's/n' || label === 'sn') entry.serial = content;
      });

      return entry;
    });
}

function serializeDisplayEntries(entries) {
  return entries
    .map((entry) => [
      `Hostname: ${entry.hostname || 'Sin dato'}`,
      `Tipo: ${entry.type || 'Sin dato'}`,
      `Modelo: ${entry.model || 'Sin dato'}`,
      `Placa: ${entry.plate || 'Sin dato'}`,
      `S/N: ${entry.serial || 'Sin dato'}`,
    ].join(' | '))
    .join('\n');
}

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [displayEntries, setDisplayEntries] = useState([]);
  const [displayDraft, setDisplayDraft] = useState(initialDisplayDraft);
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [editingDisplayIndex, setEditingDisplayIndex] = useState(null);
  const [displaySearch, setDisplaySearch] = useState('');
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('DETAILS');
  const [history, setHistory] = useState({ tickets: [], maintenances: [] });
  const [viewingTicket, setViewingTicket] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setActiveTab('DETAILS');
  }, [selectedAssetId]);

  useEffect(() => {
    let ignore = false;
    if (selectedAssetId && activeTab === 'HISTORY') {
      setLoadingHistory(true);
      apiRequest(`/assets/${selectedAssetId}/history`)
        .then((data) => {
          if (!ignore) {
            setHistory(data);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!ignore) setLoadingHistory(false);
        });
    }

    return () => {
      ignore = true;
    };
  }, [selectedAssetId, activeTab]);

  const sortedHistory = useMemo(() => {
    const items = [
      ...history.tickets.map((t) => ({ ...t, _type: 'TICKET', _date: new Date(t.createdAt) })),
      ...history.maintenances.map((m) => ({ ...m, _type: 'MAINTENANCE', _date: new Date(m.date) })),
    ];
    return items.sort((a, b) => b._date - a._date);
  }, [history]);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiRequest('/assets'), 
      apiRequest('/customers'), 
      apiRequest('/locations'),
      apiRequest('/users')
    ])
      .then(([assetsResponse, customersResponse, locationsResponse, usersResponse]) => {
        if (!ignore) {
          const sortedAssets = [...assetsResponse].sort((a, b) => a.hostname.localeCompare(b.hostname));
          setAssets(sortedAssets);
          setCustomers(customersResponse);
          setLocations(locationsResponse);
          setUsers(usersResponse);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(requestError.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          asset.hostname,
          asset.ipAddress,
          asset.brand,
          asset.model,
          asset.serialNumber,
          asset.assignedUser,
          asset.location,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
      const matchesLocation = locationFilter === 'ALL' || asset.location === locationFilter;
      const matchesCategory = (() => {
        if (categoryFilter === 'ALL') return true;
        const type = (asset.deviceType || '').toLowerCase();
        
        if (categoryFilter === 'Equipos de Computo') {
          const compuKeywords = ['computo', 'escritorio', 'all in one', 'portatil', 'desktop', 'aio', 'laptop', 'net'];
          return compuKeywords.some((keyword) => type.includes(keyword));
        } else if (categoryFilter === 'Dispositivo de Red') {
          const networkKeywords = ['switch', 'router', 'access point', 'firewall', 'nas', 'ap', 'wifi', 'red', 'servidor', 'srv', 'modem', 'patch panel'];
          const isNetwork = (val) => networkKeywords.some((k) => (val || '').toLowerCase().includes(k));
          return isNetwork(asset.deviceType) || isNetwork(asset.hostname) || type === 'dispositivo de red';
        } else if (categoryFilter === 'Monitor' || categoryFilter === 'Monitores') {
          return type.includes('monitor') || type.includes('pantalla');
        } else if (categoryFilter === 'Perifericos') {
          const peripheralKeywords = ['mouse', 'teclado', 'webcam', 'auriculares', 'headset', 'parlantes', 'microfono', 'scanner', 'impresora'];
          return peripheralKeywords.some((keyword) => type.includes(keyword));
        }
        
        return asset.deviceType === categoryFilter;
      })();

      return matchesSearch && matchesStatus && matchesLocation && matchesCategory;
    });
  }, [assets, categoryFilter, locationFilter, search, statusFilter]);

  const displaySuggestions = useMemo(() => {
    if (!displaySearch || displaySearch.trim().length < 2) return [];
    
    return assets.filter(a => {
      const criteria = [a.hostname, a.serialNumber, a.model].filter(Boolean);
      return criteria.some(c => c.toLowerCase().includes(displaySearch.toLowerCase()));
    }).slice(0, 5);
  }, [assets, displaySearch]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId],
  );

  const stats = useMemo(() => {
    const online = assets.filter((asset) => asset.status === 'ONLINE').length;
    const warning = assets.filter((asset) => asset.status === 'WARNING').length;
    const windows = assets.filter((asset) => asset.osType === 'Windows').length;
    const withAgent = assets.filter((asset) => asset.agentVersion).length;

    return {
      total: assets.length,
      online,
      warning,
      windows,
      withAgent,
    };
  }, [assets]);

  function syncSelection(nextAssets) {
    if (nextAssets.length === 0) {
      setSelectedAssetId(null);
      return;
    }

    const stillExists = nextAssets.some((asset) => asset.id === selectedAssetId);
    if (!stillExists) {
      setSelectedAssetId(nextAssets[0].id);
    }
  }

  function handleEdit(asset) {
    setSelectedAssetId(asset.id);
    setEditingAssetId(asset.id);
    setIsFormOpen(true);
    setForm({
      hostname: asset.hostname || '',
      ipAddress: asset.ipAddress || '',
      osType: asset.osType || 'Windows',
      osVersion: asset.osVersion || '',
      status: asset.status || 'ONLINE',
      customerId: String(asset.customerId || ''),
      mac: (() => {
        const match = (asset.networkSummary || '').match(/([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})/i);
        return match ? match[1] : '';
      })(),
      serialNumber: asset.serialNumber || '',
      brand: asset.brand || '',
      model: asset.model || '',
      deviceType: asset.deviceType || 'All in One',
      assignedUser: asset.assignedUser || '',
      location: asset.location || '',
      agentVersion: asset.agentVersion || '',
      lastSeenAt: buildDateInputValue(asset.lastSeenAt),
      motherboard: asset.motherboard || '',
      cpuModel: asset.cpuModel || '',
      ramSummary: asset.ramSummary || '',
      storageSummary: asset.storageSummary || '',
      networkSummary: asset.networkSummary || '',
      graphicsInfo: asset.graphicsInfo || '',
      displayInfo: asset.displayInfo || '',
      notes: asset.notes || '',
    });
    setDisplayEntries(parseDisplayEntries(asset.displayInfo));
    setDisplayDraft(initialDisplayDraft);
    setIsDisplayModalOpen(false);
    setEditingDisplayIndex(null); // Reset editing index
    setFeedback('');
    setError('');
  }

  function handleNew() {
    setSelectedAssetId(null);
    setEditingAssetId(null);
    setIsFormOpen(true);
    setForm(initialForm);
    setDisplayEntries([]);
    setDisplayDraft(initialDisplayDraft);
    setIsDisplayModalOpen(false);
    setEditingDisplayIndex(null); // Reset editing index
    setFeedback('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      const isNew = !editingAssetId;
      const method = isNew ? 'POST' : 'PUT';
      const endpoint = isNew ? '/assets' : `/assets/${editingAssetId}`;

      // Asegurar que customerId sea un entero válido
      const parsedCustomerId = parseInt(form.customerId, 10) || 1;

      // Ensure MAC is preserved in networkSummary if provided
      let finalNetworkSummary = form.networkSummary || '';
      if (form.mac && form.mac.trim()) {
        const cleanMac = form.mac.trim();
        if (!finalNetworkSummary.includes(cleanMac)) {
          finalNetworkSummary = `MAC: ${cleanMac}${finalNetworkSummary ? ` | ${finalNetworkSummary}` : ''}`;
        }
      }

      const payload = {
        ...form,
        networkSummary: finalNetworkSummary,
        customerId: parsedCustomerId,
        displayInfo: serializeDisplayEntries(displayEntries),
        lastSeenAt: form.lastSeenAt || null,
      };

      const savedAsset = await apiRequest(endpoint, {
        method: method,
        body: JSON.stringify(payload),
      });

      // Registro automático de monitores vinculados como activos independientes
      const linkedMonitors = displayEntries.filter(d => 
        (d.type || '').toLowerCase() !== 'integrada' && 
        (d.type || '').toLowerCase() !== 'interno' &&
        d.hostname
      );

      for (const monitor of linkedMonitors) {
        const monitorDraft = {
          hostname: monitor.hostname,
          serialNumber: monitor.serial || `SN-${monitor.hostname}`,
          model: monitor.model || 'Monitor Genérico',
          brand: (monitor.model || '').split(' ')[0] || 'Desconocida',
          deviceType: 'Monitor',
          location: form.location,
          assignedUser: form.assignedUser,
          customerId: parsedCustomerId,
          status: 'ONLINE',
          osType: 'Non-OS',
          osVersion: 'v1.0',
          ipAddress: '0.0.0.0'
        };

        // Enviar al servidor como nuevo activo (upsert)
        await apiRequest('/assets', {
          method: 'POST',
          body: JSON.stringify(monitorDraft)
        }).catch(err => {
          console.warn(`Error al auto-registrar monitor ${monitor.hostname}:`, err);
        });
      }

      setFeedback(isNew ? 'Dispositivo registrado correctamente.' : 'Dispositivo actualizado correctamente.');
      
      // Refrescar lista completa de activos
      const assetsResponse = await apiRequest('/assets');
      const sortedAssets = [...assetsResponse].sort((a, b) => a.hostname.localeCompare(b.hostname));
      setAssets(sortedAssets);

      setSelectedAssetId(savedAsset.id);
      setEditingAssetId(savedAsset.id);
      
      // Si era nuevo, cerramos el formulario. Si no, actualizamos el estado local del form
      if (isNew) {
        setIsFormOpen(false);
      } else {
        setForm({
          hostname: savedAsset.hostname || '',
          ipAddress: savedAsset.ipAddress || '',
          osType: savedAsset.osType || 'Windows',
          osVersion: savedAsset.osVersion || '',
          status: savedAsset.status || 'ONLINE',
          customerId: String(savedAsset.customerId || ''),
          serialNumber: savedAsset.serialNumber || '',
          brand: savedAsset.brand || '',
          model: savedAsset.model || '',
          deviceType: savedAsset.deviceType || 'All in One',
          assignedUser: savedAsset.assignedUser || '',
          location: savedAsset.location || '',
          agentVersion: savedAsset.agentVersion || '',
          lastSeenAt: buildDateInputValue(savedAsset.lastSeenAt),
          motherboard: savedAsset.motherboard || '',
          cpuModel: savedAsset.cpuModel || '',
          ramSummary: savedAsset.ramSummary || '',
          storageSummary: savedAsset.storageSummary || '',
          networkSummary: savedAsset.networkSummary || '',
          graphicsInfo: savedAsset.graphicsInfo || '',
          displayInfo: savedAsset.displayInfo || '',
          notes: savedAsset.notes || '',
        });
        setDisplayEntries(parseDisplayEntries(savedAsset.displayInfo));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(assetId) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const hostnameToConfirm = asset.hostname || 'este dispositivo';
    const input = window.prompt(
      `ATENCIÓN: Estás a punto de eliminar permanentemente el activo "${hostnameToConfirm}".\n\nEsta acción es irreversible y afectará el historial.\nPara confirmar la eliminación, por favor escribe EXACTAMENTE el nombre del activo (${hostnameToConfirm}):`
    );

    if (input !== hostnameToConfirm) {
      if (input !== null) {
        alert('El nombre ingresado no coincide. La eliminación ha sido cancelada por seguridad.');
      }
      return;
    }

    setFeedback('');
    setError('');

    try {
      await apiRequest(`/assets/${assetId}`, { method: 'DELETE' });
      const nextAssets = assets.filter((asset) => asset.id !== assetId);
      setAssets(nextAssets);
      syncSelection(nextAssets);
      if (editingAssetId === assetId) {
        setEditingAssetId(null);
        setIsFormOpen(false);
      }
      setForm(initialForm);
      setDisplayEntries([]);
      setDisplayDraft(initialDisplayDraft);
      setIsDisplayModalOpen(false);
      setEditingDisplayIndex(null); // Reset editing index
      setFeedback('Dispositivo eliminado correctamente.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleOpenDisplayModal() {
    setEditingDisplayIndex(null);
    setDisplaySearch('');
    setDisplayDraft(initialDisplayDraft);
    setIsDisplayModalOpen(true);
  }

  function handleEditDisplay(index) {
    const entry = displayEntries[index];
    setEditingDisplayIndex(index);
    setDisplaySearch('');
    setDisplayDraft({ ...entry });
    setIsDisplayModalOpen(true);
  }

  function closeDisplayModal() {
    setIsDisplayModalOpen(false);
    setEditingDisplayIndex(null);
    setDisplayDraft(initialDisplayDraft);
  }

  function handleConfirmDisplay() {
    const nextEntry = {
      hostname: displayDraft.hostname.trim(),
      type: displayDraft.type.trim(),
      model: displayDraft.model.trim(),
      plate: displayDraft.plate.trim(),
      serial: (displayDraft.serial || '').trim(),
    };

    if (!nextEntry.hostname || !nextEntry.type || !nextEntry.model || !nextEntry.plate) {
      setError('Todos los campos de pantalla son obligatorios.');
      return;
    }

    let nextEntries;
    if (editingDisplayIndex !== null) {
      nextEntries = [...displayEntries];
      nextEntries[editingDisplayIndex] = nextEntry;
    } else {
      nextEntries = [...displayEntries, nextEntry];
    }
    
    setDisplayEntries(nextEntries);
    setForm((current) => ({
      ...current,
      displayInfo: serializeDisplayEntries(nextEntries),
    }));
    setError('');
    closeDisplayModal();
  }

  function handleRemoveDisplay(index) {
    const nextEntries = displayEntries.filter((_, entryIndex) => entryIndex !== index);
    setDisplayEntries(nextEntries);
    setForm((current) => ({
      ...current,
      displayInfo: serializeDisplayEntries(nextEntries),
    }));
  }

  function downloadInventory(format) {
    let content = '';
    let fileName = `inventario_activos_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = '';
    if (format === 'JSON') {
      content = JSON.stringify(filteredAssets, null, 2);
      fileName += '.json';
      mimeType = 'application/json';
    } else if (format === 'CSV') {
      const headers = [
        'HOSTNAME', 'DIRECCION IP', 'SISTEMA OPERATIVO', 'VERSION SO', 'ID DEVICE / S/N', 
        'MARCA', 'MODELO', 'TIPO DE DISPOSITIVO', 'UBICACION / DEPTO', 'ESTADO OPERATIVO',
        'PROCESADOR (CPU)', 'MEMORIA RAM', 'ALMACENAMIENTO', 'BOARD / MOTHERBOARD',
        'ANTIVIRUS', 'ULTIMO REPORTE', 'HARDWARE DE RED (NIC)', 'GRAFICADORA', 'PANTALLAS ASOCIADAS', 'NOTAS'
      ];

      const rows = filteredAssets.map((asset) => [
        asset.hostname, asset.ipAddress, asset.osType, asset.osVersion, asset.serialNumber,
        asset.brand, asset.model, asset.deviceType, asset.location, asset.status,
        asset.cpuModel, asset.ramSummary, asset.storageSummary, asset.motherboard,
        asset.agentVersion, asset.lastSeenAt ? new Date(asset.lastSeenAt).toLocaleString() : '---',
        asset.networkSummary, asset.graphicsInfo, asset.displayInfo, asset.notes,
      ].map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(';'));
      
      content = 'sep=;\n\ufeff' + [headers.join(';'), ...rows].join('\n');
      fileName += '.csv';
      mimeType = 'text/csv;charset=utf-8;';
    } else if (format === 'XLS') {
      const headers = ['HOSTNAME', 'IP', 'S. OPERATIVO', 'VER. SO', 'ID DEVICE / S/N', 'MARCA', 'MODELO', 'TIPO', 'UBICACION', 'ESTADO', 'CPU', 'RAM', 'DISCO', 'MOTHERBOARD', 'ANTIVIRUS', 'REPORTE', 'HARDWARE RED (NIC)', 'OBSERVACIONES'];
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"/><style>
          table { border-collapse: collapse; font-family: sans-serif; }
          th { background-color: #002e5d; color: #ffffff; border: 1px solid #000000; padding: 5px; font-size: 12px; }
          td { border: 1px solid #cccccc; padding: 5px; font-size: 11px; vertical-align: top; }
        </style></head>
        <body>
          <h2>INVENTARIO TECNICO - MESA DE AYUDA</h2>
          <p>Generado: ${new Date().toLocaleString()}</p>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${filteredAssets.map(a => `
                <tr>
                  <td>${a.hostname}</td>
                  <td>${a.ipAddress}</td>
                  <td>${a.osType}</td>
                  <td>${a.osVersion}</td>
                  <td>${a.serialNumber}</td>
                  <td>${a.brand}</td>
                  <td>${a.model}</td>
                  <td>${a.deviceType}</td>
                  <td>${a.location}</td>
                  <td>${a.status}</td>
                  <td>${a.cpuModel || ''}</td>
                  <td>${a.ramSummary || ''}</td>
                  <td>${a.storageSummary || ''}</td>
                  <td>${a.motherboard || ''}</td>
                  <td>${a.agentVersion || ''}</td>
                  <td>${a.lastSeenAt ? new Date(a.lastSeenAt).toLocaleString() : ''}</td>
                  <td>${a.networkSummary || ''}</td>
                  <td>${a.notes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body></html>
      `;
      content = html;
      fileName += '.xls';
      mimeType = 'application/vnd.ms-excel';
    } else if (format === 'PRINT') {
      const printWindow = window.open('', '_blank');
      const html = `
        <html>
          <head>
            <title>Inventario Tecnico - Mesa de Ayuda</title>
            <style>
              body { font-family: sans-serif; padding: 20px; font-size: 10px; }
              header { display: flex; justify-content: space-between; border-bottom: 2px solid #002e5d; padding-bottom: 10px; margin-bottom: 20px; }
              h1 { color: #002e5d; margin: 0; font-size: 18px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
              th { background-color: #f4f4f4; color: #002e5d; }
              tr:nth-child(even) { background-color: #fafafa; }
              .footer { margin-top: 20px; font-size: 8px; color: #666; text-align: center; }
            </style>
          </head>
          <body>
            <header>
              <div>
                <h1>CONSOLA DE INVENTARIO - RMM</h1>
                <p>Reporte Detallado de Activos Tecnologicos</p>
              </div>
              <div style="text-align: right">
                <p><strong>Fecha Generacion:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Total Equipos:</strong> ${filteredAssets.length}</p>
              </div>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>IP</th>
                  <th>CPU</th>
                  <th>RAM</th>
                  <th>Disco</th>
                  <th>Ubicacion</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${filteredAssets.map(a => `
                  <tr>
                    <td><strong>${a.hostname}</strong></td>
                    <td>${a.ipAddress}</td>
                    <td>${a.cpuModel || '---'}</td>
                    <td>${a.ramSummary || '---'}</td>
                    <td>${a.storageSummary || '---'}</td>
                    <td>${a.location || '---'}</td>
                    <td>${a.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">Este documento es un extracto del sistema de gestion de inventarios - Mesa de Ayuda Municipal.</div>
            <script>window.print();</script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="view-container">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Inventario de dispositivos</p>
          <h2>Consola operativa de equipos, agente y trazabilidad tecnica</h2>
          <p className="muted-text">
            Administra el parque tecnologico con filtros, edicion, detalle tecnico y acciones rapidas por dispositivo.
          </p>
        </div>
        <div className="stat-grid compact-grid">
          <div className="stat-card">
            <span>Dispositivos</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span>Agente Antivirus</span>
            <strong>{stats.withAgent}</strong>
          </div>
        </div>
      </section>

      {error && <div className="feedback error">{error}</div>}
      {feedback && <div className="feedback">{feedback}</div>}

      <section className="stat-grid">
        <article className="stat-card">
          <span>En linea</span>
          <strong>{stats.online}</strong>
        </article>
        <article className="stat-card">
          <span>En advertencia</span>
          <strong>{stats.warning}</strong>
        </article>
        <article className="stat-card">
          <span>Windows</span>
          <strong>{stats.windows}</strong>
        </article>
        <article className="stat-card">
          <span>Coincidencias</span>
          <strong>{filteredAssets.length}</strong>
        </article>
      </section>

      <section className="card inventory-console">
        <div className="section-heading">
          <div>
            <h3>Consola de inventario</h3>
            <p>Busqueda operativa, filtros por estado y acceso directo a acciones del dispositivo.</p>
          </div>
          <div className="toolbar inventory-top-toolbar">
            <div className="inventory-actions-group">
              <button 
                type="button" 
                className="btn-ghost inventory-export-btn" 
                onClick={() => downloadInventory('XLS')}
              >
                📊 Excel Estructurado
              </button>
              <button 
                type="button" 
                className="btn-ghost inventory-export-btn export-pdf" 
                onClick={() => downloadInventory('PRINT')}
              >
                📄 Reporte PDF
              </button>
              <button 
                type="button" 
                className="btn-ghost inventory-export-btn export-json" 
                onClick={() => downloadInventory('JSON')}
              >
                🗂️ JSON
              </button>
            </div>
            <Link to="/discovery" className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}>
              📡 Network Discovery
            </Link>
            <button type="button" className="btn inventory-new-btn" onClick={handleNew}>
              + Nuevo dispositivo
            </button>
          </div>
        </div>

        <div className="inventory-toolbar">
          <div className="field full">
            <label htmlFor="asset-search">Busqueda</label>
            <input
              id="asset-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Escribe para filtrar dispositivos..."
            />
          </div>
          
          <div className="inventory-toolbar-filters">
            <div className="field">
              <label htmlFor="asset-location-filter">Ubicacion</label>
              <select id="asset-location-filter" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="ALL">Todas las ubicaciones</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="asset-status-filter">Estado</label>
              <select id="asset-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Todos los estados</option>
                <option value="ONLINE">Online</option>
                <option value="WARNING">Warning</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="asset-category-filter">Categoria</label>
              <select id="asset-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="ALL">Todas las categorias</option>
                <option value="Equipos de Computo">Equipos de Computo</option>
                <option value="Dispositivo de Red">Dispositivo de Red</option>
                <option value="Monitor">Monitor</option>
                <option value="Impresoras y/o Escaneres">Impresoras y/o Escaneres</option>
                <option value="Perifericos">Perifericos</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`asset-layout ${showMobileDetail ? 'mobile-show-detail' : 'mobile-show-list'}`} style={{ '--desktop-columns': 'minmax(0, 6fr) minmax(0, 4fr)' }}>
          <article className="asset-list-card">
            <div className="table-shell">
              {filteredAssets.length === 0 ? (
                <div className="empty-state">No hay dispositivos que coincidan con la busqueda actual.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Dispositivo</th>
                      <th>Inventario</th>
                      <th>Ubicacion</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr
                        key={asset.id}
                        className={selectedAssetId === asset.id ? 'asset-row-active' : ''}
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setShowMobileDetail(true);
                        }}
                      >
                        <td>
                          <strong>{asset.hostname}</strong>
                        </td>
                        <td>
                          <div className="muted-text">{asset.brand || 'Sin marca'} {asset.model || ''}</div>
                          <div className="muted-text">{asset.serialNumber || 'Sin serial'}</div>
                        </td>
                        <td>{asset.location || 'Sin ubicacion'}</td>
                         <td>
                          <span className={`badge ${getStatusClass(asset.status)}`}>{asset.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>

          {selectedAsset ? (
            <aside className="asset-detail-card">
              <button 
                type="button" 
                className="asset-mobile-back-btn"
                onClick={() => setShowMobileDetail(false)}
              >
                ← Volver a la lista de dispositivos
              </button>

              <div className="section-heading">
                <div>
                  <h3>Detalle tecnico</h3>
                  <p>Ficha operativa y resumen rapido del dispositivo seleccionado.</p>
                </div>
                <div className="toolbar">
                  <button type="button" className="btn-ghost asset-action-btn" onClick={() => handleEdit(selectedAsset)}>
                    Editar
                  </button>
                  <button type="button" className="btn-ghost asset-action-btn danger" onClick={() => handleDelete(selectedAsset.id)}>
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="tabs">
                <button type="button" className={`tab ${activeTab === 'DETAILS' ? 'active' : ''}`} onClick={() => setActiveTab('DETAILS')}>Resumen Tecnico</button>
                <button type="button" className={`tab ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}>Historial</button>
              </div>

              {activeTab === 'DETAILS' ? (
                <div className="asset-detail-body">
                <div className="asset-detail-hero">
                  <div>
                    <strong>{selectedAsset.hostname}</strong>
                    <p className="muted-text">{selectedAsset.brand || 'Marca no definida'} {selectedAsset.model || ''}</p>
                  </div>
                  <span className={`badge ${getStatusClass(selectedAsset.status)}`}>{selectedAsset.status}</span>
                </div>

                <div className="asset-specs-grid">
                  {(() => {
                    const typeStr = (selectedAsset.deviceType || '').toLowerCase();
                    const isMonitorOrPeripheral = ['monitor', 'monitores', 'perifericos'].some(k => typeStr.includes(k));
                    const isPrinterOrScanner = [
                      'impresora',
                      'impresoras',
                      'scanner',
                      'escaner',
                      'escáner',
                      'multifuncional',
                      'multifunction',
                      'printer',
                      'impresoras / escáneres',
                      'impresora multifuncional',
                      'impresora de red'
                    ].some(k => typeStr.includes(k));

                    if (isMonitorOrPeripheral) {
                      return (
                        <>
                          <div className="asset-spec-card"><span>Placa</span><strong>{getAssetPlate(selectedAsset.hostname)}</strong></div>
                          <div className="asset-spec-card">
                            <span>Usuario</span>
                            <strong>
                              {(() => {
                                let userName = selectedAsset.assignedUser;
                                if (selectedAsset.deviceType === 'Monitor') {
                                  const host = assets.find(a => (a.displayInfo || '').includes(selectedAsset.hostname));
                                  if (host && host.assignedUser) userName = host.assignedUser;
                                }
                                if (!userName) return 'No asignado';
                                const cleanName = formatAssignedUser(userName);
                                const userMatch = users.find(u => 
                                  (u.name && u.name.toLowerCase() === userName.toLowerCase()) ||
                                  (u.username && u.username.toLowerCase() === cleanName.toLowerCase()) ||
                                  (u.name && u.name.toLowerCase() === cleanName.toLowerCase())
                                );
                                if (userMatch) {
                                  return (
                                    <button 
                                      type="button" 
                                      className="btn-ghost" 
                                      style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 600, color: '#002E5D', background: 'transparent', border: 'none' }}
                                      onClick={() => setViewingUserProfile(userMatch)}
                                    >
                                      {userMatch.username || cleanName}
                                    </button>
                                  );
                                }
                                return cleanName;
                              })()}
                            </strong>
                          </div>
                          <div className="asset-spec-card"><span>Ubicación</span><strong>{selectedAsset.location || 'Sin ubicación'}</strong></div>
                          <div className="asset-spec-card"><span>Tipo</span><strong>{selectedAsset.deviceType || '---'}</strong></div>

                          {selectedAsset.deviceType === 'Monitor' && (
                            <div 
                              className="asset-spec-card full" 
                              style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', cursor: 'pointer' }}
                              onClick={() => {
                                const host = assets.find(a => (a.displayInfo || '').includes(selectedAsset.hostname));
                                if (host) setSelectedAssetId(host.id);
                              }}
                            >
                              <span style={{ color: '#047857' }}>Vinculado al equipo:</span>
                              {(() => {
                                const host = assets.find(a => (a.displayInfo || '').includes(selectedAsset.hostname));
                                return <strong style={{ color: '#064e3b' }}>{host ? host.hostname : 'No vinculado'}</strong>;
                              })()}
                            </div>
                          )}
                          <div className="asset-spec-card"><span>Marca</span><strong>{selectedAsset.brand || '---'}</strong></div>
                          <div className="asset-spec-card"><span>Modelo</span><strong>{selectedAsset.model || '---'}</strong></div>
                          <div className="asset-spec-card full"><span>ID device / S/N</span><strong>{selectedAsset.serialNumber || '---'}</strong></div>
                        </>
                      );
                    }

                    if (isPrinterOrScanner) {
                      return (
                        <>
                          <div className="asset-spec-card"><span>Placa</span><strong>{getAssetPlate(selectedAsset.hostname)}</strong></div>
                          <div className="asset-spec-card">
                            <span>MAC</span>
                            <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>{extractMacAddress(selectedAsset.networkSummary)}</strong>
                          </div>

                          <div className="asset-spec-card">
                            <span>Usuario / Área</span>
                            <strong>
                              {(() => {
                                let userName = selectedAsset.assignedUser;
                                if (!userName) return 'No asignado';
                                const cleanName = formatAssignedUser(userName);
                                const userMatch = users.find(u => 
                                  (u.name && u.name.toLowerCase() === userName.toLowerCase()) ||
                                  (u.username && u.username.toLowerCase() === cleanName.toLowerCase()) ||
                                  (u.name && u.name.toLowerCase() === cleanName.toLowerCase())
                                );
                                if (userMatch) {
                                  return (
                                    <button 
                                      type="button" 
                                      className="btn-ghost" 
                                      style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 600, color: '#002E5D', background: 'transparent', border: 'none' }}
                                      onClick={() => setViewingUserProfile(userMatch)}
                                    >
                                      {userMatch.username || cleanName}
                                    </button>
                                  );
                                }
                                return cleanName;
                              })()}
                            </strong>
                          </div>
                          <div className="asset-spec-card">
                            <span>Dirección IP</span>
                            <strong>{selectedAsset.ipAddress || '---'}</strong>
                          </div>

                          <div className="asset-spec-card"><span>Ubicación</span><strong>{selectedAsset.location || 'Sin ubicación'}</strong></div>
                          <div className="asset-spec-card"><span>Firmware / Sistema</span><strong>{selectedAsset.osVersion || '---'}</strong></div>

                          <div className="asset-spec-card"><span>Tipo</span><strong>{selectedAsset.deviceType || 'Impresora Multifuncional'}</strong></div>
                          <div className="asset-spec-card"><span>Marca</span><strong>{selectedAsset.brand || '---'}</strong></div>

                          <div className="asset-spec-card"><span>Modelo</span><strong>{selectedAsset.model || '---'}</strong></div>
                          <div className="asset-spec-card"><span>ID device / S/N</span><strong>{selectedAsset.serialNumber || '---'}</strong></div>
                        </>
                      );
                    }

                    // Ficha Técnica para Equipos de Cómputo (Desktop, Laptop, AIO, etc.)
                    return (
                      <>
                        <div className="asset-spec-card"><span>Placa</span><strong>{getAssetPlate(selectedAsset.hostname)}</strong></div>
                        <div className="asset-spec-card">
                          <span>Usuario</span>
                          <strong>
                            {(() => {
                              let userName = selectedAsset.assignedUser;
                              if (!userName) return 'No asignado';
                              const cleanName = formatAssignedUser(userName);
                              const userMatch = users.find(u => 
                                (u.name && u.name.toLowerCase() === userName.toLowerCase()) ||
                                (u.username && u.username.toLowerCase() === cleanName.toLowerCase()) ||
                                (u.name && u.name.toLowerCase() === cleanName.toLowerCase())
                              );
                              if (userMatch) {
                                return (
                                  <button 
                                    type="button" 
                                    className="btn-ghost" 
                                    style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 600, color: '#002E5D', background: 'transparent', border: 'none' }}
                                    onClick={() => setViewingUserProfile(userMatch)}
                                  >
                                    {userMatch.username || cleanName}
                                  </button>
                                );
                              }
                              return cleanName;
                            })()}
                          </strong>
                        </div>

                        <div className="asset-spec-card"><span>Ubicación</span><strong>{selectedAsset.location || 'Sin ubicación'}</strong></div>
                        <div className="asset-spec-card"><span>Tipo</span><strong>{selectedAsset.deviceType || '---'}</strong></div>

                        <div className="asset-spec-card"><span>Marca</span><strong>{selectedAsset.brand || '---'}</strong></div>
                        <div className="asset-spec-card"><span>Modelo</span><strong>{selectedAsset.model || '---'}</strong></div>

                        <div className="asset-spec-card"><span>ID device / S/N</span><strong>{selectedAsset.serialNumber || '---'}</strong></div>
                        <div className="asset-spec-card"><span>Procesador</span><strong>{selectedAsset.cpuModel || '---'}</strong></div>

                        <div className="asset-spec-card"><span>Memoria RAM</span><strong>{selectedAsset.ramSummary || '---'}</strong></div>
                        <div className="asset-spec-card"><span>Almacenamiento</span><strong>{selectedAsset.storageSummary || '---'}</strong></div>

                        <div className="asset-spec-card"><span>Graficadora</span><strong>{selectedAsset.graphicsInfo || '---'}</strong></div>
                        <div className="asset-spec-card"><span>Antivirus</span><strong>{selectedAsset.agentVersion || '---'}</strong></div>

                        <div className="asset-spec-card"><span>Dirección IP</span><strong>{selectedAsset.ipAddress || '---'}</strong></div>
                        <div className="asset-spec-card"><span>Hardware de RED</span><strong>{extractNetworkCard(selectedAsset.networkSummary)}</strong></div>
                      </>
                    );
                  })()}
                </div>

                {!['Monitor', 'Monitores', 'Perifericos', 'Impresoras / Escáneres', 'Impresora', 'Impresora Multifuncional', 'Impresora de Red', 'Escáner', 'Multifuncional', 'PRINTER', 'SCANNER'].some(k => (selectedAsset.deviceType || '').toLowerCase().includes(k.toLowerCase())) && (
                  <div className="asset-spec-card full" style={{ marginTop: '0.5rem', textAlign: 'center', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <span style={{ color: '#0369a1' }}>Pantalla o pantallas vinculadas</span>
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '0.8rem', justifyContent: 'center', marginTop: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                      {parseDisplayEntries(selectedAsset.displayInfo).length > 0 ? (
                        parseDisplayEntries(selectedAsset.displayInfo).map((display, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              const found = assets.find(a => a.hostname === display.hostname);
                              if (found) {
                                setSelectedAssetId(found.id);
                              } else {
                                alert(`El activo ${display.hostname} no se encuentra registrado en el inventario. Asegúrate de que el monitor esté dado de alta como un dispositivo independiente.`);
                              }
                            }}
                            style={{ 
                              background: '#fff', 
                              border: '1px solid #e0f2fe', 
                              borderRadius: '10px', 
                              padding: '0.5rem 0.9rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.6rem',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                              minWidth: 'fit-content',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            className="display-badge-clickable"
                          >
                            <span style={{ fontSize: '1rem' }}>🖥️</span>
                            <div style={{ textAlign: 'left' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0c4a6e', whiteSpace: 'nowrap' }}>{display.hostname}</strong>
                              <small style={{ color: '#64748b', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{display.model}</small>
                            </div>
                          </div>
                        ))
                      ) : (
                        <strong style={{ color: '#64748b' }}>
                          {selectedAsset.deviceType === 'PC de Escritorio (Desktop)' ? 'Sin pantallas registradas' : 'Pantalla integrada'}
                        </strong>
                      )}
                    </div>
                  </div>
                )}

                <div className="feedback">
                  <strong>Observaciones</strong>
                  <p className="muted-text">{selectedAsset.notes || 'Sin observaciones tecnicas registradas.'}</p>
                </div>

                {selectedAsset.installedSoftware && (() => {
                  try {
                    const swList = typeof selectedAsset.installedSoftware === 'string' 
                      ? JSON.parse(selectedAsset.installedSoftware) 
                      : selectedAsset.installedSoftware;
                    
                    if (Array.isArray(swList) && swList.length > 0) {
                      return (
                        <details className="feedback" style={{ marginTop: '0.5rem', background: '#f8fafc', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                            💻 Software Instalado ({swList.length} programas)
                          </summary>
                          <div style={{ maxHeight: '220px', overflowY: 'auto', marginTop: '0.5rem' }}>
                            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                  <th style={{ padding: '4px 6px' }}>Programa</th>
                                  <th style={{ padding: '4px 6px' }}>Versión</th>
                                  <th style={{ padding: '4px 6px' }}>Editor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {swList.map((sw, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '4px 6px', fontWeight: 500 }}>{sw.name}</td>
                                    <td style={{ padding: '4px 6px', color: '#64748b' }}>{sw.version || '---'}</td>
                                    <td style={{ padding: '4px 6px', color: '#64748b' }}>{sw.publisher || '---'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}

                <div className="feedback" style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Ultima conexion:</strong>
                  <span className="muted-text" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatLastSeen(selectedAsset.lastSeenAt)}</span>
                </div>

                <div className="feedback">
                  <strong>Ultima metrica</strong>
                  <p className="muted-text">
                    {selectedAsset.metrics?.[0]
                      ? `CPU ${selectedAsset.metrics[0].cpuUsage}% / RAM ${selectedAsset.metrics[0].ramUsage}%`
                      : 'No hay metricas reportadas.'}
                  </p>
                </div>
              </div>
              ) : (
                <div className="asset-history-body">
                  {loadingHistory ? (
                    <div className="empty-state">Cargando historial...</div>
                  ) : sortedHistory.length === 0 ? (
                    <div className="empty-state">No hay intervenciones registradas para este dispositivo.</div>
                  ) : (
                    <div className="timeline">
                      {sortedHistory.map((item, index) => (
                        <div key={`${item._type}-${item.id}-${index}`} className="timeline-item">
                          <div className="timeline-date">
                            {item._date.toLocaleDateString()}
                          </div>
                          <div className="timeline-content">
                            {item._type === 'TICKET' ? (
                              <>
                                <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                                    <div style={{ flex: 1, marginRight: '1rem' }}>
                                      <strong style={{ display: 'block', fontSize: '1.05rem', color: '#002E5D', lineHeight: '1.3' }}>{item.title}</strong>
                                      <span className="muted-text" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.25rem', display: 'block' }}>TICKET #{item.id}</span>
                                    </div>
                                    <span className={`badge ${getTicketStatusClass(item.status)}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{getStatusLabel(item.status)}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#4a5568', background: '#f7fafc', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>📅 {item._date.toLocaleDateString()}</span>
                                    <span style={{ fontSize: '0.82rem', color: '#4a5568', background: '#f7fafc', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>📂 {item.category || 'Sin categoría'}</span>
                                    
                                    <button 
                                      type="button" 
                                      className="btn-ghost small" 
                                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2c5282', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: '8px', background: 'rgba(44, 82, 130, 0.05)', border: '1px solid rgba(44, 82, 130, 0.1)' }}
                                      onClick={() => setViewingTicket(item)}
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                      </svg>
                                      Ver detalle
                                    </button>
                                  </div>

                                  <p className="muted-text" style={{ fontSize: '0.88rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#4a5568', minHeight: '2.6rem' }}>
                                    {stripHtml(item.description)}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                                    <div style={{ flex: 1, marginRight: '1rem' }}>
                                      <strong style={{ display: 'block', fontSize: '1.05rem', color: '#0F9D3A', lineHeight: '1.3' }}>Mantenimiento: {item.type}</strong>
                                      <span className="muted-text" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.25rem', display: 'block' }}>REPORTE TÉCNICO</span>
                                    </div>
                                    <span className="badge badge-success" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Realizado</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#4a5568', background: '#f0fff4', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #c6f6d5' }}>📅 {item._date.toLocaleDateString()}</span>
                                    <span style={{ fontSize: '0.82rem', color: '#4a5568', background: '#f7fafc', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>👤 {item.technician || 'Técnico asignado'}</span>
                                  </div>

                                  <p className="muted-text" style={{ fontSize: '0.88rem', color: '#4a5568', whiteSpace: 'pre-wrap' }}>
                                    {item.description}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </section>

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '900px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="section-heading">
              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#002E5D', marginBottom: '0.2rem' }}>
                  {editingAssetId ? 'Editar dispositivo' : 'Registrar nuevo dispositivo'}
                </h3>
                <p className="muted-text">Completa los campos técnicos para mantener la integridad del inventario.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setIsFormOpen(false)} style={{ fontSize: '1.2rem', padding: '0.5rem' }}>
                &times;
              </button>
            </div>

            <form className="form-grid" style={{ marginTop: '1.5rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '1rem' }} onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="asset-hostname">Hostname</label>
                <input id="asset-hostname" value={form.hostname} onChange={(event) => setForm((current) => ({ ...current, hostname: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="asset-ip">Direccion IP</label>
                <input id="asset-ip" value={form.ipAddress} onChange={(event) => setForm((current) => ({ ...current, ipAddress: event.target.value }))} placeholder="Ej: 10.0.5.56" />
              </div>

              <div className="field">
                <label htmlFor="asset-mac">Direccion MAC</label>
                <input id="asset-mac" value={form.mac} onChange={(event) => setForm((current) => ({ ...current, mac: event.target.value }))} placeholder="Ej: 00:1E:0B:05:8F:38" style={{ fontFamily: 'monospace' }} />
              </div>

              {!['Impresoras / Escáneres', 'Dispositivo de Red', 'Impresora Multifuncional', 'Impresora de Red', 'Escáner'].includes(form.deviceType) && (
                <div className="field">
                  <label htmlFor="asset-os-version">Version Sistema Operativo</label>
                  <input id="asset-os-version" value={form.osVersion} onChange={(event) => setForm((current) => ({ ...current, osVersion: event.target.value }))} placeholder="" />
                </div>
              )}
              <div className="field">
                <label htmlFor="asset-status">Estado</label>
                <select id="asset-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">Seleccionar estado...</option>
                  <option value="ONLINE">Online</option>
                  <option value="WARNING">Warning</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="asset-brand">Marca</label>
                <input id="asset-brand" value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="asset-model">Modelo</label>
                <input id="asset-model" value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="asset-type">Tipo</label>
                <select id="asset-type" value={form.deviceType} onChange={(event) => setForm((current) => ({ ...current, deviceType: event.target.value }))}>
                <option value="">Seleccionar tipo...</option>
                <option value="PC de Escritorio (Desktop)">PC de Escritorio (Desktop)</option>
                <option value="Portátil (Laptop)">Portátil (Laptop)</option>
                <option value="Mini (Notebook)">Mini (Notebook)</option>
                <option value="Todo en Uno (AIO)">Todo en Uno (AIO)</option>
                <option value="Impresoras / Escáneres">Impresoras / Escáneres</option>
                <option value="Dispositivo de Red">Dispositivo de Red</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="asset-serial">ID Device / S/N</label>
                <input id="asset-serial" value={form.serialNumber} onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))} placeholder="" />
              </div>
              <div className="field" style={{ position: 'relative' }}>
                <label htmlFor="asset-user">Usuario asignado</label>
                <input 
                  id="asset-user" 
                  value={form.assignedUser} 
                  onChange={(event) => {
                    const val = event.target.value;
                    setForm((current) => ({ ...current, assignedUser: val }));
                    if (val.trim()) {
                      const filtered = users.filter(u => (u.name || '').toLowerCase().includes(val.toLowerCase())).slice(0, 5);
                      setUserSuggestions(filtered);
                    } else {
                      setUserSuggestions([]);
                    }
                  }} 
                  onBlur={() => setTimeout(() => setUserSuggestions([]), 200)}
                  placeholder="" 
                />
                {userSuggestions.length > 0 && (
                  <div className="user-suggestion-list">
                    {userSuggestions.map(user => (
                      <div key={user.id} className="user-suggestion-item" onClick={() => { setForm(current => ({ ...current, assignedUser: user.name })); setUserSuggestions([]); }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.location?.name || 'Sin dependencia'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="asset-location">Ubicacion</label>
                <select
                  id="asset-location"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                >
                  <option value="">Seleccionar ubicacion</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              {!['Impresoras / Escáneres', 'Dispositivo de Red'].includes(form.deviceType) && (
                <>
                  <div className="field">
                    <label htmlFor="asset-agent">Antivirus</label>
                    <input id="asset-agent" value={form.agentVersion} onChange={(event) => setForm((current) => ({ ...current, agentVersion: event.target.value }))} placeholder="" />
                  </div>
                  <div className="field">
                    <label htmlFor="asset-cpu">Procesador</label>
                    <input id="asset-cpu" value={form.cpuModel} onChange={(event) => setForm((current) => ({ ...current, cpuModel: event.target.value }))} placeholder="" />
                  </div>
                  <div className="field">
                    <label htmlFor="asset-ram">Memoria RAM</label>
                    <input id="asset-ram" value={form.ramSummary} onChange={(event) => setForm((current) => ({ ...current, ramSummary: event.target.value }))} placeholder="" />
                  </div>
                  <div className="field">
                    <label htmlFor="asset-storage">Almacenamiento</label>
                    <input id="asset-storage" value={form.storageSummary} onChange={(event) => setForm((current) => ({ ...current, storageSummary: event.target.value }))} placeholder="" />
                  </div>
                  <div className="field">
                    <label htmlFor="asset-network">Hardware de Red (NIC)</label>
                    <input id="asset-network" value={form.networkSummary} onChange={(event) => setForm((current) => ({ ...current, networkSummary: event.target.value }))} placeholder="" />
                  </div>
                    <div className="field">
                      <label htmlFor="asset-gpu">Graficadora</label>
                      <input id="asset-gpu" value={form.graphicsInfo} onChange={(event) => setForm((current) => ({ ...current, graphicsInfo: event.target.value }))} placeholder="" />
                    </div>
                </>
              )}
              <div className="field full">
                <label>Pantalla o pantallas</label>
                <div className="display-manager">
                  <div className="display-manager-head">
                    <p className="muted-text">
                      {form.deviceType === 'PC de Escritorio (Desktop)'
                        ? 'Agrega una o varias pantallas con hostname, tipo, modelo y placa.'
                        : 'Esta seccion solo aplica para equipos de escritorio.'}
                    </p>
                    <button type="button" className="btn-ghost" onClick={handleOpenDisplayModal} disabled={form.deviceType !== 'PC de Escritorio (Desktop)'}>
                      Anadir pantalla
                    </button>
                  </div>

                  {form.deviceType !== 'PC de Escritorio (Desktop)' ? (
                    <div className="empty-state">La gestion de pantallas externas solo se habilita para equipos de escritorio.</div>
                  ) : displayEntries.length > 0 ? (
                    <div className="display-entry-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      {displayEntries.map((entry, index) => (
                        <div key={index} style={{ 
                          background: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '12px', 
                          padding: '1rem', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.8rem',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.6rem', borderRadius: '10px', fontSize: '1.2rem' }}>🖥️</div>
                            <div style={{ flex: 1 }}>
                              <strong style={{ display: 'block', fontSize: '1rem', color: '#1e293b' }}>{entry.hostname}</strong>
                              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{entry.type} • {entry.model}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '0.4rem 0.65rem', fontSize: '0.78rem', color: '#475569' }}>
                              <strong>Placa:</strong> {entry.plate}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <button 
                              type="button" 
                              className="btn-ghost" 
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} 
                              onClick={() => handleEditDisplay(index)}
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              type="button" 
                              className="btn-ghost" 
                              style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: '#fff', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444' }} 
                              onClick={() => handleRemoveDisplay(index)}
                            >
                              🗑️ Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No hay pantallas registradas.</div>
                  )}
                </div>
              </div>
              <div className="field full">
                <label htmlFor="asset-last-seen">Ultima conexion</label>
                <input id="asset-last-seen" type="datetime-local" value={form.lastSeenAt} onChange={(event) => setForm((current) => ({ ...current, lastSeenAt: event.target.value }))} />
              </div>
              <div className="field full">
                <label htmlFor="asset-notes">Observaciones</label>
                <textarea id="asset-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={{ minHeight: '80px' }} placeholder="" />
              </div>
              <div className="toolbar full" style={{ position: 'sticky', bottom: 0, background: '#f8f9fa', padding: '1rem 0', borderTop: '1px solid #e9ecef', marginTop: '1rem', zIndex: 10 }}>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingAssetId ? 'Guardar cambios' : 'Registrar dispositivo'}
                </button>
                <button type="button" className="btn-ghost" onClick={handleNew}>
                  Limpiar formulario
                </button>
                <button type="button" className="btn-ghost" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDisplayModalOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="display-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <h3 id="display-modal-title">{editingDisplayIndex !== null ? 'Editar pantalla' : 'Añadir pantalla'}</h3>
                <p>Busca un monitor del inventario o ingresa datos manualmente.</p>
              </div>
            </div>

            <div style={{ marginTop: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <div className="field">
                <label>🔎 Buscar en inventario actual (Opcional)</label>
                <input 
                  value={displaySearch} 
                  onChange={(e) => setDisplaySearch(e.target.value)} 
                  placeholder="" 
                />
              </div>
              
              {displaySuggestions.length > 0 && (
                <div style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {displaySuggestions.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => {
                        setDisplayDraft({
                          hostname: s.hostname,
                          type: s.deviceType || 'Monitor',
                          model: s.model || 'Desconocido',
                          plate: getAssetPlate(s.hostname),
                          serial: s.serialNumber || ''
                        });
                        setDisplaySearch('');
                      }}
                      style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                      className="suggestion-item"
                    >
                      <strong>{s.hostname}</strong> <span className="muted-text">({s.model}) - Placa: {getAssetPlate(s.hostname)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <div className="field">
                <label htmlFor="display-hostname">Hostname</label>
                <input id="display-hostname" value={displayDraft.hostname} onChange={(event) => setDisplayDraft((current) => ({ ...current, hostname: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="display-type">Tipo de pantalla</label>
                <input id="display-type" value={displayDraft.type} onChange={(event) => setDisplayDraft((current) => ({ ...current, type: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="display-model">Modelo</label>
                <input id="display-model" value={displayDraft.model} onChange={(event) => setDisplayDraft((current) => ({ ...current, model: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="display-plate">Placa</label>
                <input id="display-plate" value={displayDraft.plate} onChange={(event) => setDisplayDraft((current) => ({ ...current, plate: event.target.value }))} placeholder="" />
              </div>
              <div className="field">
                <label htmlFor="display-serial">S/N (Serial)</label>
                <input id="display-serial" value={displayDraft.serial} onChange={(event) => setDisplayDraft((current) => ({ ...current, serial: event.target.value }))} placeholder="" />
              </div>
            </div>

            <div className="toolbar" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn" onClick={handleConfirmDisplay}>
                {editingDisplayIndex !== null ? 'Guardar cambios' : 'Añadir pantalla'}
              </button>
              <button type="button" className="btn-ghost" onClick={closeDisplayModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewingUserProfile && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', padding: '1.5rem' }}>
            <div className="section-heading" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#002E5D' }}>Detalles de Usuario</h3>
                <p className="muted-text">Información de contacto oficial.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setViewingUserProfile(null)}>&times;</button>
            </div>
            
            <div className="user-profile-details" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Nombre Completo</span>
                  <strong style={{ color: '#0f172a' }}>{viewingUserProfile.name}</strong>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Dependencia / Ubicación</span>
                  <strong style={{ color: '#0f172a' }}>{viewingUserProfile.location?.name || 'No registrada'}</strong>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Correo Electrónico</span>
                  <a href={`mailto:${viewingUserProfile.email}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>{viewingUserProfile.email}</a>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Teléfono / Celular</span>
                  <strong style={{ color: '#0f172a' }}>{viewingUserProfile.phone || 'No registrado'}</strong>
               </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
               <button type="button" className="btn" onClick={() => setViewingUserProfile(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {viewingTicket && (
        <div className="modal-overlay">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="section-heading">
              <div>
                <h3>Detalle de Ticket #{viewingTicket.id}</h3>
                <p>Consulta rápida de la incidencia sin salir del inventario.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setViewingTicket(null)}>Cerrar</button>
            </div>
            
            <div className="asset-detail-body" style={{ marginTop: '1.5rem' }}>
              <div className="asset-detail-hero" style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <strong style={{ fontSize: '1.2rem', color: '#002E5D' }}>{viewingTicket.title}</strong>
                  <p className="muted-text">{viewingTicket.category || 'Sin categoría definida'}</p>
                </div>
                <span className={`badge ${getTicketStatusClass(viewingTicket.status)}`}>{getStatusLabel(viewingTicket.status)}</span>
              </div>

              <div className="asset-detail-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: '#f8fbfc', padding: '1rem', borderRadius: '8px' }}>
                <div><span>Prioridad</span><strong>{viewingTicket.priority}</strong></div>
                <div><span>Tipo</span><strong>{viewingTicket.ticketType}</strong></div>
                <div><span>Fecha Reporte</span><strong>{new Date(viewingTicket.createdAt).toLocaleString()}</strong></div>
                <div><span>Asignado a</span><strong>{viewingTicket.assignedTo?.name || 'Sin técnico asignado'}</strong></div>
              </div>

              <div className="feedback" style={{ marginTop: '1.5rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Descripción del caso</strong>
                <div 
                  className="muted-text" 
                  style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    background: '#fff', 
                    padding: '1rem', 
                    borderRadius: '6px', 
                    border: '1px solid #eee',
                    whiteSpace: 'pre-wrap'
                  }}
                  dangerouslySetInnerHTML={{ __html: viewingTicket.description }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setViewingTicket(null)}>Cerrar detalle</button>
                <Link to="/tickets" className="btn" onClick={() => setViewingTicket(null)}>Ir al módulo de tickets</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
