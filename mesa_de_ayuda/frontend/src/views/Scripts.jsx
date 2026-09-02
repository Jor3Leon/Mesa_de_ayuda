import React, { useState, useMemo } from 'react';

const initialScripts = [
  { name: 'Limpieza de temporales', description: 'Elimina archivos residuales (%temp%, prefetch) y libera espacio en disco.', icon: '🧹', category: 'Mantenimiento' },
  { name: 'Actualizar métricas de telemetría', description: 'Fuerza el reporte inmediato de CPU, RAM, disco y red al servidor.', icon: '📊', category: 'Diagnóstico' },
  { name: 'Reiniciar spooler de impresión', description: 'Recupera el servicio de impresión y cola de trabajos sin reiniciar el host.', icon: '🖨️', category: 'Remediación' },
  { name: 'Diagnóstico preventivo de disco', description: 'Ejecuta comprobaciones SMART y sectores defectuosos en SSD/HDD.', icon: '💾', category: 'Salud' },
  { name: 'Flushing de DNS & Renovación IP', description: 'Libera y renueva arrendamiento DHCP y limpia caché de resolución local.', icon: '🌐', category: 'Remediación' },
  { name: 'Comprobación de Integridad SFC', description: 'Ejecuta sfc /scannow para reparar archivos corruptos de Windows.', icon: '🛡️', category: 'Salud' },
];

export default function Scripts() {
  const [scripts, setScripts] = useState(initialScripts);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [executingName, setExecutingName] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newScript, setNewScript] = useState({ name: '', description: '', icon: '⚙️', category: 'Mantenimiento' });
  const [output, setOutput] = useState([
    '[ready] Consola de Automatización RMM inicializada.',
    '[hint] Selecciona una política o tarea remota para ejecutarla en la flota conectada.',
  ]);

  function runScript(name) {
    setExecutingName(name);
    const timestamp = new Date().toLocaleTimeString();
    setOutput((current) => [
      ...current,
      `[${timestamp}] > Desplegando orden remota: "${name}"...`,
      `[${timestamp}] > Conectando con agente RMM del host... [OK]`,
    ]);

    setTimeout(() => {
      const finishTime = new Date().toLocaleTimeString();
      setOutput((current) => [
        ...current,
        `[${finishTime}] [ok] Script "${name}" ejecutado exitosamente con código de salida 0.`,
      ]);
      setExecutingName(null);
    }, 1200);
  }

  function clearConsole() {
    setOutput(['[ready] Consola de telemetría despejada.']);
  }

  function handleCreateScript(e) {
    e.preventDefault();
    setScripts((prev) => [newScript, ...prev]);
    setShowModal(false);
    setNewScript({ name: '', description: '', icon: '⚙️', category: 'Mantenimiento' });
  }

  const categories = useMemo(() => {
    return Array.from(new Set(scripts.map((s) => s.category)));
  }, [scripts]);

  const filteredScripts = useMemo(() => {
    return scripts.filter((s) => {
      const matchesCat = activeCategory === 'ALL' || s.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [scripts, activeCategory, search]);

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
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Automatización de Scripts & Políticas RMM
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Biblioteca de acciones remotas para mantenimiento desatendido, optimización y soporte preventivo.
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
        {/* KPI 1: Scripts */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #4f46e5',
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
              Tareas Disponibles
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⚡</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {scripts.length}
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#4f46e5', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              En catálogo
            </span>
          </div>
        </div>

        {/* KPI 2: Tasa de Éxito */}
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
              Tasa de Éxito
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>✅</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', lineHeight: 1, letterSpacing: '-0.02em' }}>
              99.8%
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#059669', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Retorno 0
            </span>
          </div>
        </div>

        {/* KPI 3: Tiempo de Ejecución */}
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
              Tiempo Ejecución
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>⏱️</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              &lt; 1.5s
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#2563eb', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Tiempo real
            </span>
          </div>
        </div>

        {/* KPI 4: Conectividad */}
        <div
          className="stat-card"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderLeft: '3.5px solid #7c3aed',
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
              Modo Ejecución
            </span>
            <span style={{ fontSize: '0.95rem', lineHeight: 1, opacity: 0.85 }}>🛡️</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1, letterSpacing: '-0.02em' }}>
              RMM Live
            </strong>
            <span style={{ fontSize: '0.67rem', color: '#7c3aed', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', flex: 1 }}>
              Desatendido
            </span>
          </div>
        </div>
      </div>

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
        {/* Category Segmented Tabs */}
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
            onClick={() => setActiveCategory('ALL')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: activeCategory === 'ALL' ? '#ffffff' : 'transparent',
              color: activeCategory === 'ALL' ? '#0f172a' : '#64748b',
              fontWeight: activeCategory === 'ALL' ? '700' : '500',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: activeCategory === 'ALL' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Todas ({scripts.length})
          </button>
          {categories.map((cat) => {
            const count = scripts.filter((s) => s.category === cat).length;
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
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
                {cat} ({count})
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
              placeholder="Buscar tarea remota o comando..."
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
            Nueva Tarea Remota
          </button>
        </div>
      </div>

      {/* 🧭 SPLIT LAYOUT: SCRIPTS CATALOG + LIVE TERMINAL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: SCRIPTS LIST */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            Biblioteca de Tareas ({filteredScripts.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredScripts.map((script) => {
              const isRunning = executingName === script.name;
              return (
                <div
                  key={script.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    gap: '1rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {script.icon || '⚡'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>
                        {script.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {script.description}
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '0.35rem',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px',
                          background: '#e0e7ff',
                          color: '#3730a3',
                        }}
                      >
                        {script.category}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => runScript(script.name)}
                    disabled={isRunning}
                    style={{
                      background: isRunning ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: isRunning ? 'not-allowed' : 'pointer',
                      boxShadow: isRunning ? 'none' : '0 2px 6px rgba(79, 70, 229, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isRunning ? 'Ejecutando...' : '▶ Ejecutar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TERMINAL */}
        <div
          style={{
            background: '#0f172a',
            borderRadius: '16px',
            border: '1px solid #334155',
            padding: '1.5rem',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
            color: '#f8fafc',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginLeft: '0.5rem' }}>
                Terminal RMM Live Telemetry
              </span>
            </div>

            <button
              onClick={clearConsole}
              style={{
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Despejar
            </button>
          </div>

          <div
            style={{
              height: '380px',
              overflowY: 'auto',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: '#34d399',
            }}
          >
            {output.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '0.25rem', color: line.includes('[ok]') ? '#34d399' : line.includes('>') ? '#93c5fd' : '#94a3b8' }}>
                {line}
              </div>
            ))}
          </div>
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
                    background: '#e0e7ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                    Nueva Tarea Remota
                  </h3>
                  <small style={{ color: '#64748b' }}>Acción automatizada de mantenimiento</small>
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

            <form onSubmit={handleCreateScript} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Nombre de la Tarea / Script *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Reiniciar servicio de base de datos"
                  value={newScript.name}
                  onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Categoría *
                  </label>
                  <select
                    value={newScript.category}
                    onChange={(e) => setNewScript({ ...newScript, category: e.target.value })}
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
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Diagnóstico">Diagnóstico</option>
                    <option value="Remediación">Remediación</option>
                    <option value="Salud">Salud</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Ícono Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="⚙️, 🚀, 🔧"
                    value={newScript.icon}
                    onChange={(e) => setNewScript({ ...newScript, icon: e.target.value })}
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Descripción de la Operación *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalla qué ejecuta el script en el endpoint..."
                  value={newScript.description}
                  onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                    fontFamily: 'inherit',
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
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  Registrar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
