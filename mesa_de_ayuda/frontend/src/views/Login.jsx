import { useState } from 'react';

const initialForm = {
  username: '',
  password: '',
};

export default function Login({ onLogin }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [remember, setRemember] = useState(true);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onLogin(form);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-board login-board-portal">
        <header className="login-topbar login-topbar-portal">
          <div className="login-logo-wrap">
            <div className="login-logo-lockup">
              <div className="login-logo-text">
                <small>Alcaldia Municipal</small>
                <strong>de Yopal</strong>
              </div>
            </div>
            <h1 className="login-service-title">Mesa de Servicios</h1>
          </div>
        </header>

        <div className="login-stripe login-stripe-portal" />

        <div className="login-card login-card-portal">
          <section className="login-panel login-panel-portal">
            <div className="login-panel-head login-panel-head-portal">
              <h2>Ingreso a la plataforma</h2>
              <p className="muted-text">Accede con tus credenciales institucionales.</p>
            </div>

            {error && <div className="feedback error">{error}</div>}

            <form className="login-form login-form-portal" onSubmit={handleSubmit} autoComplete="off">
              <div className="field">
                <label htmlFor="login-email">Inicio de sesion</label>
                <input
                  id="login-email"
                  type="text"
                  name="login_user"
                  autoComplete="off"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder=""
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">Contrasena</label>
                <input
                  id="login-password"
                  type="password"
                  name="login_password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Tu contrasena"
                />
              </div>

              <div className="field">
                <label htmlFor="login-source">Origen de acceso</label>
                <select id="login-source" value="Mesa de Servicios AlcYopal" readOnly>
                  <option>Mesa de Servicios AlcYopal</option>
                </select>
              </div>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Recuerdame</span>
              </label>

              <button type="submit" className="btn login-submit" disabled={saving}>
                {saving ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </section>
        </div>

        <footer className="login-footer">
          <p>MDS Copyright (C) 2026</p>
          <p>Direccion de las Tecnologias de la Informacion y las Comunicaciones - TIC.</p>
        </footer>
      </section>
    </main>
  );
}
