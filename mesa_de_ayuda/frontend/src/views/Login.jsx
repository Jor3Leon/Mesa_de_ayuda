import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import bgImg from '../assets/login-bg.jpg';
import './Login.css';

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
      className="login-page-main"
      style={{
        backgroundImage: `url(${bgImg})`,
      }}
    >
      <div className="login-card-container">
        {/* Logo & Header */}
        <div className="login-header">
          <div className="login-logo-box">
            <img
              src={logoImg}
              alt="Logo Mesa de Ayuda"
            />
          </div>

          <h1 className="login-title">
            Mesa de Ayuda
          </h1>
          <p className="login-subtitle">
            Gestión RMM & TIC
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert">
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
        <form onSubmit={handleSubmit} className="login-form">
          {/* Usuario Field */}
          <div>
            <label
              htmlFor="login_user"
              className="login-field-label"
            >
              Usuario
            </label>
            <div className="login-input-group">
              <svg
                className="field-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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
                className="login-input"
              />
            </div>
          </div>

          {/* Contraseña Field */}
          <div>
            <label
              htmlFor="login_password"
              className="login-field-label"
            >
              Contraseña
            </label>
            <div className="login-input-group">
              <svg
                className="field-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                className="login-toggle-pw-btn"
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
          <div className="login-remember-container">
            <label className="login-remember-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="login-checkbox"
              />
              Recordar credenciales
            </label>
          </div>

          {/* Iniciar Sesión Button */}
          <button
            type="submit"
            disabled={saving}
            className="login-submit-btn"
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
        <div className="login-forgot-wrapper">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="login-forgot-btn"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="login-modal-overlay"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="login-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="login-modal-icon">
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
            <h3 className="login-modal-title">
              Restablecer Contraseña
            </h3>
            <p className="login-modal-text">
              Para restablecer tus credenciales o recuperar el acceso a la plataforma, por favor comunícate con el Administrador del Sistema o con la Mesa de Servicio TIC.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="login-modal-btn"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
