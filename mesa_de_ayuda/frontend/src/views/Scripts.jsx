import { useState } from 'react';

const scripts = [
  { name: 'Limpieza de temporales', description: 'Elimina archivos residuales y libera espacio.', icon: 'MT' },
  { name: 'Actualizar metricas', description: 'Fuerza el reporte de CPU y RAM al servidor.', icon: 'AM' },
  { name: 'Reiniciar spooler', description: 'Recupera el servicio de impresion sin intervencion manual.', icon: 'RS' },
  { name: 'Diagnostico de disco', description: 'Ejecuta comprobaciones preventivas de almacenamiento.', icon: 'DD' },
];

export default function Scripts() {
  const [output, setOutput] = useState([
    '[ready] Consola preparada.',
    '[hint] Selecciona una automatizacion para simular su ejecucion.',
  ]);

  function runScript(name) {
    setOutput((current) => [
      ...current,
      `> Ejecutando: ${name}`,
      '[ok] Orden enviada al grupo objetivo.',
    ]);
  }

  return (
    <div className="view-container">
      <section className="section-heading">
        <div>
          <h2>Automatizacion de scripts</h2>
          <p>Biblioteca operativa para mantenimiento, remediacion y tareas recurrentes.</p>
        </div>
      </section>

      <section className="split-card">
        <article className="card">
          <h3>Catalogo de automatizaciones</h3>
          <div className="module-list" style={{ marginTop: '1rem' }}>
            {scripts.map((script) => (
              <button key={script.name} type="button" className="module-tile" onClick={() => runScript(script.name)}>
                <div className="sidebar-icon">{script.icon}</div>
                <h4>{script.name}</h4>
                <p className="muted-text">{script.description}</p>
              </button>
            ))}
          </div>
        </article>

        <article className="terminal">
          <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Consola operativa</h3>
          {output.map((line, index) => (
            <div key={`${line}-${index}`} className="terminal-line">
              {line}
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
