import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import bgImg from '../assets/login-bg.jpg';

export default function Login({ onLogin }) {
  const [form, setForm] = useState(() => ({
    username: localStorage.getItem('rmm_saved_user') || '',
    password: '',
  }));
  const [remember, setRemember] = useState(() => {
    return localStorage.getItem('rmm_remember_user') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    if (remember && form.username) {
      localStorage.setItem('rmm_saved_user', form.username);
      localStorage.setItem('rmm_remember_user', 'true');
    } else if (!remember) {
      localStorage.removeItem('rmm_saved_user');
      localStorage.setItem('rmm_remember_user', 'false');
    }
  }, [remember, form.username]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (remember) {
        localStorage.setItem('rmm_saved_user', form.username.trim());
        localStorage.setItem('rmm_remember_user', 'true');
      } else {
        localStorage.removeItem('rmm_saved_user');
        localStorage.removeItem('rmm_remember_user');
      }

      await onLogin({
        username: form.username.trim(),
        password: form.password,
      });
    } catch (requestError) {
      setError(requestError.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        padding: '1.5rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '390px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '28px',
          padding: '2.5rem 2rem',
          border: '1.5px solid #dbeafe',
          boxShadow: '0 25px 50px -12px rgba(15, 35, 75, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.95) inset, 0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '88px',
              height: '88px',
              margin: '0 auto 1.15rem auto',
              borderRadius: '24px',
              background: 'radial-gradient(circle at center, #ffffff 30%, #f0f7ff 100%)',
              border: '1.5px solid #dbeafe',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
              boxSizing: 'border-box',
              transition: 'transform 0.25s ease',
            }}
          >
            <img
              src={logoImg}
              alt="Logo Mesa de Ayuda"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 4px 8px rgba(0, 45, 120, 0.18))',
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: '700',
              color: '#1e293b',
              margin: '0 0 0.3rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Mesa de Ayuda
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              color: '#64748b',
              fontWeight: '500',
              letterSpacing: '0.01em',
            }}
          >
            Gestión RMM & TIC
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#b91c1c',
              padding: '0.75rem 0.9rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              lineHeight: 1.4,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Usuario Field */}
          <div>
            <label
              htmlFor="login_user"
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '500',
                color: '#334155',
                marginBottom: '0.45rem',
              }}
            >
              Usuario
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '0 0.85rem',
                border: '1.5px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginRight: '0.65rem' }}
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="login_user"
                required
                type="text"
                name="username"
                autoComplete="username"
                placeholder="usuario@empresa.com"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem 0',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.92rem',
                  color: '#1e293b',
                }}
              />
            </div>
          </div>

          {/* Contraseña Field */}
          <div>
            <label
              htmlFor="login_password"
              style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '500',
                color: '#334155',
                marginBottom: '0.45rem',
              }}
            >
              Contraseña
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '0 0.85rem',
                border: '1.5px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginRight: '0.65rem' }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login_password"
                required
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem 0',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.92rem',
                  color: '#1e293b',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Recordar credenciales */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '-0.2rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                fontSize: '0.86rem',
                color: '#475569',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  accentColor: '#002f6c',
                  cursor: 'pointer',
                }}
              />
              Recordar credenciales
            </label>
          </div>

          {/* Iniciar Sesión Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '0.4rem',
              background: saving
                ? '#94a3b8'
                : 'linear-gradient(180deg, #07387d 0%, #002255 100%)',
              color: '#ffffff',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.98rem',
              fontWeight: '600',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 6px 18px -3px rgba(0, 34, 85, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 22px -3px rgba(0, 34, 85, 0.55)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 18px -3px rgba(0, 34, 85, 0.45)';
              }
            }}
          >
            {saving ? (
              <span>Validando credenciales...</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '0.88rem',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              transition: 'text-decoration 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '380px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.15rem' }}>
              Restablecer Contraseña
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Para restablecer tus credenciales o recuperar el acceso a la plataforma, por favor comunícate con el Administrador del Sistema o con la Mesa de Servicio TIC.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%',
                background: '#07387d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
