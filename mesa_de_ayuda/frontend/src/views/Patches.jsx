const patches = [
  { id: 'KB5034765', name: 'Security Update for Windows 11', severity: 'CRITICAL', status: 'Pendiente', target: 'PC-ADMIN-01' },
  { id: 'KB5034441', name: 'Cumulative Update for .NET Framework', severity: 'NORMAL', status: 'Pendiente', target: 'SRV-DATA-01' },
  { id: 'Chrome-122', name: 'Google Chrome Security Fix', severity: 'CRITICAL', status: 'Programado', target: 'General' },
];

export default function Patches() {
  return (
    <div className="view-container">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Hardening</p>
          <h2>Gestion de parches</h2>
          <p className="muted-text">
            Esta vista sigue siendo un modulo de demostracion, pero ahora tiene una presentacion
            alineada con el resto del producto y queda lista para integrar orquestacion real.
          </p>
        </div>
        <div className="stat-grid compact-grid">
          <div className="stat-card">
            <span>Criticos</span>
            <strong>2</strong>
          </div>
          <div className="stat-card">
            <span>Programados</span>
            <strong>12</strong>
          </div>
        </div>
      </section>

      <article className="card">
        <h3>Cola de despliegue</h3>
        <div className="table-shell" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Objetivo</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {patches.map((patch) => (
                <tr key={patch.id}>
                  <td>{patch.id}</td>
                  <td><strong>{patch.name}</strong></td>
                  <td>
                    <span className={`badge ${patch.severity === 'CRITICAL' ? 'badge-danger' : 'badge-neutral'}`}>
                      {patch.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${patch.status === 'Programado' ? 'badge-warning' : 'badge-neutral'}`}>
                      {patch.status}
                    </span>
                  </td>
                  <td>{patch.target}</td>
                  <td><button className="btn-ghost">Programar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
