import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

function isValidIpv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

function getBrandColor(brand) {
  const b = (brand || '').toUpperCase();
  if (b.includes('HP') || b.includes('HEWLETT')) return '#0096d6';
  if (b.includes('EPSON')) return '#003399';
  if (b.includes('CANON')) return '#cc0000';
  if (b.includes('BROTHER')) return '#1e3a8a';
  if (b.includes('KYOCERA')) return '#d97706';
  if (b.includes('XEROX')) return '#e11d48';
  if (b.includes('RICOH')) return '#b91c1c';
  return '#6366f1';
}

function getDeviceTypeLabel(type) {
  if (type === 'MULTIFUNCTION' || type === 'Impresora Multifuncional') return 'Impresora Multifuncional';
  if (type === 'SCANNER' || type === 'Escáner') return 'Escáner de Red';
  if (type === 'PRINTER' || type === 'Impresora de Red') return 'Impresora de Red';
  return type || 'Dispositivo de Red';
}

export default function Discovery() {
  const navigate = useNavigate();

  // Configuration form state
  const [targetIp, setTargetIp] = useState('10.0.5.56');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [snmpCommunity, setSnmpCommunity] = useState('public');

  // Loaded data
  const [agents, setAgents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Scanning flow state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: Idle, 1: Connecting agent, 2: Querying device, 3: Parsing SNMP/eSCL, 4: Done
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  // Device registration editable form state (including explicit MAC field)
  const [regForm, setRegForm] = useState({
    hostname: '',
    ipAddress: '',
    mac: '',
    brand: '',
    model: '',
    serialNumber: '',
    deviceType: 'Impresora Multifuncional',
    location: '',
    customerId: '',
    firmware: '',
    notes: '',
  });

  const [registering, setRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const [registrationError, setRegistrationError] = useState('');
  const [copiedField, setCopiedField] = useState('');

  // Initial load
  useEffect(() => {
    let ignore = false;
    setLoadingInitial(true);

    Promise.all([
      apiRequest('/discovery/agents').catch(() => []),
      apiRequest('/locations').catch(() => []),
      apiRequest('/customers').catch(() => []),
    ])
      .then(([agentsRes, locationsRes, customersRes]) => {
        if (!ignore) {
          const agentList = Array.isArray(agentsRes) ? agentsRes : [];
          const locList = Array.isArray(locationsRes) ? locationsRes : [];
          const custList = Array.isArray(customersRes) ? customersRes : [];

          setAgents(agentList);
          setLocations(locList);
          setCustomers(custList);

          if (agentList.length > 0) {
            setSelectedAgentId(String(agentList[0].id));
          }
          if (locList.length > 0) {
            setSelectedLocation(locList[0].name);
          }
          setLoadingInitial(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoadingInitial(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    });
  };

  // Perform discovery scan
  const handleStartScan = async (e) => {
    if (e) e.preventDefault();
    setScanError('');
    setRegistrationSuccess(null);
    setRegistrationError('');

    if (!isValidIpv4(targetIp)) {
      setScanError('Por favor ingresa una dirección IPv4 válida (ejemplo: 10.0.5.56).');
      return;
    }

    setIsScanning(true);
    setScanStep(1);

    // Step progression animation for feedback
    const timer1 = setTimeout(() => setScanStep(2), 500);
    const timer2 = setTimeout(() => setScanStep(3), 1100);

    try {
      const response = await apiRequest('/discovery/scan', {
        method: 'POST',
        body: JSON.stringify({
          ip: targetIp.trim(),
          agentId: selectedAgentId ? Number(selectedAgentId) : undefined,
          community: snmpCommunity.trim() || 'public',
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      setScanStep(4);
      setScanResult(response);

      // Populate registration form with discovered technical data (including MAC address)
      setRegForm({
        hostname: response.hostname || `PRN-${response.ip.replace(/\./g, '-')}`,
        ipAddress: response.ip,
        mac: response.mac || '',
        brand: response.brand || 'Generico',
        model: response.model || 'Dispositivo de Red',
        serialNumber: response.serialNumber || '',
        deviceType: getDeviceTypeLabel(response.deviceType),
        location: selectedLocation || (locations[0]?.name || 'Sede Principal'),
        customerId: customers[0]?.id ? String(customers[0].id) : '1',
        firmware: response.firmware || '',
        notes: `Descubierto vía Network Discovery. Protocolos: ${(response.protocols || []).join(', ')}`,
      });
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setScanError(err.message || 'Error al comunicarse con el dispositivo o agente RMM.');
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  // Register or update device into Assets & CMDB
  const handleRegisterDevice = async (e) => {
    if (e) e.preventDefault();
    setRegistering(true);
    setRegistrationError('');
    setRegistrationSuccess(null);

    try {
      const payload = {
        hostname: regForm.hostname.trim(),
        ipAddress: regForm.ipAddress.trim(),
        mac: regForm.mac.trim(),
        brand: regForm.brand.trim(),
        model: regForm.model.trim(),
        serialNumber: regForm.serialNumber.trim() || undefined,
        deviceType: regForm.deviceType,
        location: regForm.location,
        customerId: regForm.customerId ? Number(regForm.customerId) : undefined,
        firmware: regForm.firmware.trim(),
        notes: regForm.notes.trim(),
        webUrl: scanResult?.webUrl,
        capabilities: scanResult?.capabilities,
        consumables: scanResult?.consumables,
        counters: scanResult?.counters,
        agentVersion: `Discovery Engine 2.1 (${(scanResult?.protocols || ['SNMP']).join(', ')})`,
        status: scanResult?.status || 'ONLINE',
      };

      const result = await apiRequest('/discovery/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setRegistrationSuccess(result);
    } catch (err) {
      setRegistrationError(err.message || 'No se pudo registrar el dispositivo.');
    } finally {
      setRegistering(false);
    }
  };

  const selectedAgentObj = useMemo(() => {
    return agents.find((a) => String(a.id) === String(selectedAgentId));
  }, [agents, selectedAgentId]);

  return (
    <div className="view-container">
      {/* Hero Panel */}
      <section className="hero-panel">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              RMM &bull; Módulo de Activos
            </span>
            <span className="badge badge-success">Protocolos: SNMP v1/v2c &bull; eSCL &bull; WSD &bull; HTTP</span>
          </div>
          <h2>Network Device Discovery</h2>
          <p className="muted-text" style={{ maxWidth: '780px' }}>
            Exploración, identificación y registro automático de impresoras, escáneres y multifuncionales en la red local
            a través del Agente RMM. Integración directa y deduplicación nativa con <strong>Dispositivos</strong> y <strong>CMDB</strong>.
          </p>
        </div>

        <div className="stat-grid compact-grid" style={{ minWidth: '320px' }}>
          <div className="stat-card">
            <span>Agentes en Red</span>
            <strong style={{ color: '#0ea5e9' }}>{agents.length} Activos</strong>
          </div>
          <div className="stat-card">
            <span>Sede Activa</span>
            <strong>{selectedLocation || 'Principal'}</strong>
          </div>
        </div>
      </section>

      {/* Quick Navigation Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/assets" className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>💻</span> Ver Dispositivos
          </Link>
          <Link to="/cmdb" className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🗺️</span> Consola 360° CMDB
          </Link>
        </div>

        {/* Quick IP Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
          <span>IPs de Prueba sugeridas:</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '0.78rem' }}
            onClick={() => setTargetIp('10.0.5.56')}
          >
            10.0.5.56 (HP E731)
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '0.78rem' }}
            onClick={() => setTargetIp('10.0.5.80')}
          >
            10.0.5.80 (Epson L3150)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Scan Configuration Card */}
        <div className="card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🎯</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Configurar Detección</h3>
              <small style={{ color: '#64748b' }}>Indica los parámetros de la consulta local</small>
            </div>
          </div>

          <form onSubmit={handleStartScan}>
            {/* Target IP Address */}
            <div className="form-group" style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Dirección IP del Dispositivo *</strong>
                <small style={{ color: '#0ea5e9' }}>IPv4 Reservada</small>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ej: 10.0.5.56"
                  value={targetIp}
                  onChange={(e) => setTargetIp(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '0.65rem 0.85rem',
                    border: '2px solid #cbd5e1',
                    borderRadius: '10px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            {/* Sede / Location */}
            <div className="form-group" style={{ marginBottom: '1.1rem' }}>
              <label><strong>Sede / Ubicación</strong></label>
              <select
                className="search-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>{loc.name}</option>
                ))}
                {locations.length === 0 && <option value="Sede Principal">Sede Principal</option>}
              </select>
            </div>

            {/* Agent Selector */}
            <div className="form-group" style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Agente RMM Explorador</strong>
                <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>En Línea</span>
              </label>
              <select
                className="search-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.hostname} ({ag.ipAddress}) - {ag.brand || 'PC'} {ag.model || ''}
                  </option>
                ))}
                {agents.length === 0 && <option value="">Sondeo Directo / Servidor Local</option>}
              </select>
              {selectedAgentObj && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  Agente seleccionado: <strong>{selectedAgentObj.hostname}</strong> ({selectedAgentObj.ipAddress}) &bull; Sede: {selectedAgentObj.location || 'General'}
                </div>
              )}
            </div>

            {/* SNMP Community (Advanced Accordion) */}
            <details style={{ marginBottom: '1.3rem', fontSize: '0.82rem', color: '#64748b' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0ea5e9' }}>
                ⚙️ Opciones avanzadas de SNMP
              </summary>
              <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Comunidad SNMP (v1/v2c)</label>
                <input
                  type="password"
                  className="search-input"
                  value={snmpCommunity}
                  onChange={(e) => setSnmpCommunity(e.target.value)}
                  placeholder="public"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <small style={{ display: 'block', marginTop: '4px', color: '#94a3b8' }}>
                  Por defecto: <code>public</code>. No se expondrá en logs.
                </small>
              </div>
            </details>

            {/* Submit Action Button */}
            <button
              type="submit"
              className="btn"
              disabled={isScanning}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: isScanning ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                boxShadow: isScanning ? 'none' : '0 4px 14px rgba(14, 165, 233, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isScanning ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  <span>Explorando Red...</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.2rem' }}>🔍</span>
                  <span>DETECTAR DISPOSITIVO</span>
                </>
              )}
            </button>
          </form>

          {/* Progress Indicator */}
          {isScanning && (
            <div style={{ marginTop: '1.2rem', padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0369a1', marginBottom: '0.4rem' }}>
                Progreso del Escaneo:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#0284c7', lineHeight: '1.6' }}>
                <li style={{ fontWeight: scanStep >= 1 ? 700 : 400 }}>
                  {scanStep > 1 ? '✓' : '⏳'} Consultando agente RMM local ({selectedAgentObj?.hostname || 'Local'})...
                </li>
                <li style={{ fontWeight: scanStep >= 2 ? 700 : 400 }}>
                  {scanStep > 2 ? '✓' : scanStep === 2 ? '⏳' : '○'} Conectando con {targetIp} en puertos 161, 9100, 631, 80...
                </li>
                <li style={{ fontWeight: scanStep >= 3 ? 700 : 400 }}>
                  {scanStep > 3 ? '✓' : scanStep === 3 ? '⏳' : '○'} Extrayendo SNMP MIB-2, eSCL/AirScan y consumibles...
                </li>
                <li style={{ fontWeight: scanStep >= 4 ? 700 : 400 }}>
                  {scanStep >= 4 ? '✓' : '○'} Procesando y normalizando información técnica...
                </li>
              </ul>
            </div>
          )}

          {scanError && (
            <div style={{ marginTop: '1.2rem', padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '0.85rem' }}>
              <strong>Error en la detección:</strong> {scanError}
            </div>
          )}
        </div>

        {/* Right Column: Scan Result & Device Registration Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {scanResult ? (
            <div className="card" style={{ padding: '1.5rem', animation: 'fadeIn 0.25s ease' }}>
              {/* Header: Device Identification and Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        background: getBrandColor(scanResult.brand),
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {scanResult.brand || 'GENERIC'}
                    </span>
                    <span className="badge badge-success" style={{ fontWeight: 700 }}>
                      ● {scanResult.status}
                    </span>
                    {scanResult.isExistingAsset && !scanResult.ipChangeDetected && (
                      <span className="badge badge-info">✓ Dispositivo Ya Registrado</span>
                    )}
                    {scanResult.ipChangeDetected && (
                      <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                        ⚠️ Cambio de IP Detectado (Anterior: {scanResult.previousIp})
                      </span>
                    )}
                    {!scanResult.isExistingAsset && (
                      <span className="badge badge-primary" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                        ★ Nuevo Dispositivo Detectado
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                    {scanResult.brand} {scanResult.model}
                  </h2>
                  <small style={{ color: '#64748b' }}>
                    Hostname: <code>{scanResult.hostname}</code> &bull; Tiempo de respuesta: {scanResult.discoveryDuration}s
                  </small>
                </div>

                {scanResult.webUrl && (
                  <a
                    href={scanResult.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', borderColor: '#bae6fd' }}
                  >
                    <span>🌐</span> Consola Web ({scanResult.ip})
                  </a>
                )}
              </div>

              {/* Technical Specifications Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.4rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Dirección IP</small>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{scanResult.ip}</strong>
                    <button type="button" className="btn-ghost" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => copyToClipboard(scanResult.ip, 'ip')}>
                      {copiedField === 'ip' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <small style={{ color: '#15803d', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Dirección MAC</small>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#166534', fontFamily: 'monospace' }}>
                      {scanResult.mac || 'No disponible'}
                    </strong>
                    {scanResult.mac && (
                      <button type="button" className="btn-ghost" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => copyToClipboard(scanResult.mac, 'mac')}>
                        {copiedField === 'mac' ? 'Copiado!' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Número de Serie</small>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginTop: '2px', fontFamily: 'monospace' }}>
                    {scanResult.serialNumber || 'No reportado'}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Tipo Detectado</small>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                    {getDeviceTypeLabel(scanResult.deviceType)}
                  </strong>
                </div>
              </div>

              {/* Capabilities Badges */}
              <div style={{ marginBottom: '1.4rem' }}>
                <small style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Capacidades del Dispositivo
                </small>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${scanResult.capabilities?.printing ? 'badge-success' : 'badge-neutral'}`}>
                    🖨️ Impresión: {scanResult.capabilities?.printing ? 'Soportada' : 'No'}
                  </span>
                  <span className={`badge ${scanResult.capabilities?.scanning ? 'badge-success' : 'badge-neutral'}`}>
                    📄 Escaneo (eSCL/WSD): {scanResult.capabilities?.scanning ? 'Soportado' : 'No'}
                  </span>
                  <span className={`badge ${scanResult.capabilities?.copying ? 'badge-success' : 'badge-neutral'}`}>
                    📑 Copia Digital: {scanResult.capabilities?.copying ? 'Soportada' : 'No'}
                  </span>
                  <span className={`badge ${scanResult.capabilities?.fax ? 'badge-success' : 'badge-neutral'}`}>
                    📠 Fax: {scanResult.capabilities?.fax ? 'Soportado' : 'No detectado'}
                  </span>
                  {(scanResult.protocols || []).map((p) => (
                    <span key={p} className="badge badge-info">
                      ⚡ Protocolo: {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Consumables (Toner Levels & Drum) */}
              {Array.isArray(scanResult.consumables) && scanResult.consumables.length > 0 && (
                <div style={{ marginBottom: '1.4rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <small style={{ color: '#334155', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      Niveles de Consumibles y Suministros (SNMP Printer MIB)
                    </small>
                    <small style={{ color: '#64748b' }}>{scanResult.consumables.length} consumibles detectados</small>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    {scanResult.consumables.map((c, idx) => (
                      <div key={idx} style={{ background: '#fff', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{c.name}</span>
                          <strong style={{ color: c.levelPercent < 20 ? '#ef4444' : '#0f172a' }}>{c.levelPercent}%</strong>
                        </div>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(4, Math.min(100, c.levelPercent))}%`,
                              background: c.color || (c.levelPercent < 20 ? '#ef4444' : '#10b981'),
                              borderRadius: '4px',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Counters */}
              {scanResult.counters && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <small style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Contador Total</small>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {scanResult.counters.totalPages ? scanResult.counters.totalPages.toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <small style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Páginas Color</small>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>
                      {scanResult.counters.colorPages ? scanResult.counters.colorPages.toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <small style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Páginas Monocromo</small>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#334155' }}>
                      {scanResult.counters.monochromePages ? scanResult.counters.monochromePages.toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <small style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Escaneos Digitales</small>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                      {scanResult.counters.scans ? scanResult.counters.scans.toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Form Accordion with MAC Field Included */}
              <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>📝</span>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Confirmar Registro en Activos & CMDB</h4>
                </div>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Verifica o personaliza los campos antes de guardar. El campo <strong>MAC</strong> se almacenará permanentemente para control de inventario y trazabilidad ante cambios de IP.
                </p>

                <form onSubmit={handleRegisterDevice}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem', marginBottom: '1.1rem' }}>
                    <div className="form-group">
                      <label><strong>Hostname / Identificador *</strong></label>
                      <input
                        type="text"
                        className="search-input"
                        value={regForm.hostname}
                        onChange={(e) => setRegForm({ ...regForm, hostname: e.target.value })}
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Explicit MAC Field as requested */}
                    <div className="form-group">
                      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Dirección MAC *</strong>
                        <small style={{ color: '#16a34a' }}>Formato XX:XX:XX:XX:XX:XX</small>
                      </label>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Ej: 00:1E:0B:05:8F:38"
                        value={regForm.mac}
                        onChange={(e) => setRegForm({ ...regForm, mac: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>

                    <div className="form-group">
                      <label><strong>Fabricante / Marca</strong></label>
                      <input
                        type="text"
                        className="search-input"
                        value={regForm.brand}
                        onChange={(e) => setRegForm({ ...regForm, brand: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="form-group">
                      <label><strong>Modelo</strong></label>
                      <input
                        type="text"
                        className="search-input"
                        value={regForm.model}
                        onChange={(e) => setRegForm({ ...regForm, model: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="form-group">
                      <label><strong>Número de Serie</strong></label>
                      <input
                        type="text"
                        className="search-input"
                        value={regForm.serialNumber}
                        onChange={(e) => setRegForm({ ...regForm, serialNumber: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                      />
                    </div>

                    <div className="form-group">
                      <label><strong>Tipo de Dispositivo</strong></label>
                      <select
                        className="search-input"
                        value={regForm.deviceType}
                        onChange={(e) => setRegForm({ ...regForm, deviceType: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        <option value="Impresora Multifuncional">Impresora Multifuncional (MFP)</option>
                        <option value="Impresora de Red">Impresora de Red</option>
                        <option value="Escáner">Escáner de Red</option>
                        <option value="Servidor de Impresión">Servidor de Impresión</option>
                        <option value="Dispositivo de Red">Dispositivo de Red</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label><strong>Sede / Ubicación</strong></label>
                      <select
                        className="search-input"
                        value={regForm.location}
                        onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.name}>{loc.name}</option>
                        ))}
                        {locations.length === 0 && <option value="Sede Principal">Sede Principal</option>}
                      </select>
                    </div>

                    <div className="form-group">
                      <label><strong>Cliente / Organización</strong></label>
                      <select
                        className="search-input"
                        value={regForm.customerId}
                        onChange={(e) => setRegForm({ ...regForm, customerId: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        {customers.length === 0 && <option value="1">General / Corporativo</option>}
                      </select>
                    </div>
                  </div>

                  {registrationError && (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.82rem', marginBottom: '1rem' }}>
                      {registrationError}
                    </div>
                  )}

                  {registrationSuccess && (
                    <div style={{ padding: '0.85rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>✓ {registrationSuccess.message}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <Link to="/assets" className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                          Ir a Dispositivos
                        </Link>
                        <Link to="/cmdb" className="btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                          Ver en CMDB 360°
                        </Link>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      className="btn"
                      disabled={registering}
                      style={{
                        padding: '0.75rem 1.4rem',
                        fontWeight: 700,
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: registering ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {registering ? 'Registrando...' : (scanResult.isExistingAsset ? '💾 Actualizar Activo y CMDB' : '💾 Guardar en Activos y CMDB')}
                    </button>

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setScanResult(null)}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Empty State when no scan yet */
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#0f172a' }}>
                Listo para Descubrir Dispositivos de Red
              </h3>
              <p style={{ margin: '0 auto 1.5rem auto', color: '#64748b', maxWidth: '520px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Ingresa una dirección IP en el panel izquierdo (ejemplo: <code>10.0.5.56</code>) y presiona <strong>DETECTAR DISPOSITIVO</strong>.
                El agente RMM consultará la red local mediante SNMP v1/v2c, eSCL/AirScan y HTTP, obteniendo fabricante, modelo, MAC, serial, consumibles y contadores.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', maxWidth: '640px', margin: '0 auto' }}>
                <div style={{ flex: 1, minWidth: '160px', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>1. Detección Local</div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>El agente RMM ejecuta la sonda desde la subred interna sin exponer la red privada.</small>
                </div>
                <div style={{ flex: 1, minWidth: '160px', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>2. Deduplicación</div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Identifica por Serial y MAC. Si la IP cambia, actualiza el activo sin duplicarlo.</small>
                </div>
                <div style={{ flex: 1, minWidth: '160px', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>3. Sincronización CMDB</div>
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>El activo queda disponible inmediatamente en Dispositivos y en la vista 360° CMDB.</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
