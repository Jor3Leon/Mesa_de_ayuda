import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const initialForm = {
  name: '',
  email: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    apiRequest('/customers')
      .then((response) => {
        if (!ignore) {
          setCustomers(response);
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

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      const createdCustomer = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setCustomers((currentCustomers) =>
        [...currentCustomers, { ...createdCustomer, _count: { tickets: 0, assets: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setForm(initialForm);
      setFeedback('Cliente creado correctamente.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-container">
      <section className="section-heading">
        <div>
          <h2>Clientes y departamentos</h2>
          <p>Entidades atendidas, capacidad instalada y relacion con tickets y activos.</p>
        </div>
      </section>

      {error && <div className="feedback error">{error}</div>}
      {feedback && <div className="feedback">{feedback}</div>}

      <section className="split-card">
        <article className="card">
          <h3>Directorio</h3>
          <div className="table-shell" style={{ marginTop: '1rem' }}>
            {customers.length === 0 ? (
              <div className="empty-state">No hay clientes cargados.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Entidad</th>
                    <th>Correo</th>
                    <th>Tickets</th>
                    <th>Activos</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td><strong>{customer.name}</strong></td>
                      <td>{customer.email}</td>
                      <td>{customer._count?.tickets || 0}</td>
                      <td>{customer._count?.assets || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="card">
          <h3>Nuevo cliente</h3>
          <form className="form-grid" style={{ marginTop: '1rem' }} onSubmit={handleSubmit}>
            <div className="field full">
              <label htmlFor="customer-name">Nombre</label>
              <input
                id="customer-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Alcaldia de Yopal"
              />
            </div>
            <div className="field full">
              <label htmlFor="customer-email">Correo</label>
              <input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="soporte@yopal.gov.co"
              />
            </div>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
