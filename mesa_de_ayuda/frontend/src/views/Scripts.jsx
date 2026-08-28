import { useState } from 'react';

const scripts = [
  { name: 'Limpieza de temporales', description: 'Elimina archivos residuales y libera espacio en disco.', icon: '🧹', category: 'Mantenimiento' },
  { name: 'Actualizar métricas de telemetría', description: 'Fuerza el reporte inmediato de CPU, RAM y red al servidor.', icon: '📊', category: 'Diagnóstico' },
  { name: 'Reiniciar spooler de impresión', description: 'Recupera el servicio de impresión sin intervención presencial.', icon: '🖨️', category: 'Remediación' },
  { name: 'Diagnóstico preventivo de disco', description: 'Ejecuta comprobaciones SMART y sectores defectuosos en SSD/HDD.', icon: '💾', category: 'Salud' },
];

export default function Scripts() {
  const [output, setOutput] = useState([
    '[ready] Consola de Automatización RMM inicializada.',
    '[hint] Selecciona una política o tarea remota para ejecutarla en la flota.',
  ]);

  function runScript(name) {
    const timestamp = new Date().toLocaleTimeString();
    setOutput((current) => [
      ...current,
      `[${timestamp}] > Desplegando orden: ${name}`,
      `[${timestamp}] [ok] Script ejecutado exitosamente con código de salida 0.`,
    ]);
  }

  function clearConsole() {
    setOutput(['[ready] Consola despejada.']);
  }

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
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            fontSize: '1.25rem'
          }}>
            ⚡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Automatización de Scripts & Políticas RMM
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                Automation v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Biblioteca de acciones remotas para mantenimiento desatendido, optimización y soporte preventivo.
            </p>
          </div>
        </div>
      </div>

      {/* 🧭 SPLIT LAYOUT (CATALOG + TERMINAL) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: SCRIPTS CATALOG */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            Biblioteca de Tareas Automatizadas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {scripts.map((script) => (
              <div
                key={script.name}
                onClick={() => runScript(script.name)}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  fontSize: '1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {script.icon}
                </div>

                <div style={{ flex: '1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                      {script.name}
                    </h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      {script.category}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                    {script.description}
                  </p>
                </div>

                <button
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#2563eb',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Ejecutar ▶
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: TERMINAL OUTPUT */}
        <div style={{
          background: '#090d16',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          padding: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          color: '#38bdf8',
          fontFamily: 'Consolas, Monaco, monospace',
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ marginLeft: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700' }}>RMM Agent Live Terminal</span>
              </div>
              <button
                onClick={clearConsole}
                style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
              >
                Limpiar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {output.map((line, index) => (
                <div key={index} style={{ color: line.includes('[ok]') ? '#4ade80' : line.includes('>') ? '#fbbf24' : '#94a3b8' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem', marginTop: '1.5rem', color: '#64748b', fontSize: '0.75rem' }}>
            Canal seguro TLS v1.3 • Conectado al broker de telemetría local
          </div>
        </div>
      </div>
    </div>
  );
}
