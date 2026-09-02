import { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/customers');
      setCustomers(Array.isArray(response) ? response : []);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingId(customer.id);
      setForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      });
    } else {
      setEditingId(null);
      setForm(initialForm);
    }
    setFeedback('');
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(initialForm);
    setEditingId(null);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      if (editingId) {
        const updated = await apiRequest(`/customers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setCustomers((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c)),
        );
        setFeedback('Entidad / Cliente actualizado correctamente.');
      } else {
        const createdCustomer = await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setCustomers((current) =>
          [...current, { ...createdCustomer, _count: { tickets: 0, assets: 0 } }].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        setFeedback('Entidad / Cliente registrado exitosamente.');
      }
      handleCloseModal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const totalTickets = customers.reduce((acc, c) => acc + (c._count?.tickets || 0), 0);
  const totalAssets = customers.reduce((acc, c) => acc + (c._count?.assets || 0), 0);

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <path d="M9 9v.01" />
              <path d="M9 12v.01" />
              <path d="M9 15v.01" />
              <path d="M9 18v.01" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Directorio de Entidades & Clientes
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Entidades atendidas, dependencias asociadas y relación con tickets y activos de infraestructura.
            </p>
          </div>
        </div>
      </div>

      {/* 📊 ENTERPRISE KPI METRICS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* KPI 1: Clientes */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              border: '1px solid #7dd3fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Entidades Registradas
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {customers.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '600', marginTop: '0.2rem' }}>
              Clientes & Organizaciones
            </div>
          </div>
        </div>

        {/* KPI 2: Tickets */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tickets Acumulados
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {totalTickets}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>
              Solicitudes e incidentes
            </div>
          </div>
        </div>

        {/* KPI 3: Activos */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)',
              border: '1px solid #6ee7b7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Activos Instalados
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {totalAssets}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>
              Equipos y hardware
            </div>
          </div>
        </div>

        {/* KPI 4: Cobertura */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)',
              border: '1px solid #c4b5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estado del Servicio
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              100%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>
              Disponibilidad SLA
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
          ✅ {feedback}
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 🧭 SEARCH & CONTROLS */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '0.75rem 1rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '240px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar entidad por nombre, correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.9rem',
              color: '#1e293b',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Mostrando <strong>{filteredCustomers.length}</strong> de {customers.length} entidades
          </span>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#002D62',
              color: '#ffffff',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 45, 98, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva Entidad
          </button>
        </div>
      </div>

      {/* 📦 ENTERPRISE DATA TABLE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Cargando directorio de entidades...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#1e293b' }}>No se encontraron entidades</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.875rem' }}>
              Registra una nueva entidad o limpia los filtros de búsqueda.
            </p>
            <button
              onClick={() => handleOpenModal()}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Registrar Entidad
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Entidad / Organización</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Contacto & Correo</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Tickets</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Activos TI</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                          }}
                        >
                          {customer.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '0.92rem', display: 'block' }}>
                            {customer.name}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ID: #{customer.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span>{customer.email || 'Sin correo asignado'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: (customer._count?.tickets || 0) > 0 ? '#fef3c7' : '#f1f5f9',
                          color: (customer._count?.tickets || 0) > 0 ? '#92400e' : '#64748b',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          border: (customer._count?.tickets || 0) > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                        }}
                      >
                        {customer._count?.tickets || 0}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: (customer._count?.assets || 0) > 0 ? '#ecfdf5' : '#f1f5f9',
                          color: (customer._count?.assets || 0) > 0 ? '#047857' : '#64748b',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          border: (customer._count?.assets || 0) > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        }}
                      >
                        {customer._count?.assets || 0}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenModal(customer)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.4rem 0.75rem',
                          color: '#0f172a',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
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
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                    {editingId ? 'Editar Entidad' : 'Nueva Entidad'}
                  </h3>
                  <small style={{ color: '#64748b' }}>Información de la organización</small>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Nombre de la Entidad / Organización *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Alcaldía Municipal de Yopal"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Correo Electrónico de Contacto
                </label>
                <input
                  type="email"
                  placeholder="soporte@entidad.gov.co"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Entidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
