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
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)',
      padding: '1.5rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '2.5rem 2.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        boxSizing: 'border-box'
      }}>
        {/* Top Lockup */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)'
          }}>
            🏢
          </div>
          
          <span style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#2563eb',
            background: '#eff6ff',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            border: '1px solid #dbeafe'
          }}>
            Mesa de Ayuda & ITAM v2.2
          </span>

          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0.75rem 0 0.25rem 0', letterSpacing: '-0.03em' }}>
            Portal Institucional
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Alcaldía Municipal de Yopal
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>
              Usuario Institucional
            </label>
            <input
              required
              type="text"
              name="login_user"
              autoComplete="username"
              placeholder="Ej: admin o nombre.apellido"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                background: '#f8fafc'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>
              Contraseña
            </label>
            <input
              required
              type="password"
              name="login_password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#f8fafc'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: '#2563eb' }}
              />
              Recordar credenciales
            </label>
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>SSL 256-bit</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: '700',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)',
              transition: 'transform 0.15s ease'
            }}
          >
            {saving ? 'Validando credenciales...' : 'Iniciar Sesión →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            Alcaldía de Yopal • Dirección de Tecnologías de la Información (TIC)
          </small>
        </div>
      </div>
    </main>
  );
}
