import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const initialForm = {
  title: '',
  content: '',
  shortcut: '',
  category: 'General',
  ticketType: 'Incidencia',
};

export default function CannedResponses() {
  const [responses, setResponses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, catData] = await Promise.all([
        apiRequest('/canned-responses'),
        apiRequest('/categories').catch(() => []),
      ]);
      setResponses(Array.isArray(resData) ? resData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      setError('Error al cargar plantillas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (res = null) => {
    if (res) {
      setEditingId(res.id);
      setForm({
        title: res.title || '',
        content: res.content || '',
        shortcut: res.shortcut || '',
        category: res.category || 'General',
        ticketType: res.ticketType || 'Incidencia',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/canned-responses/${editingId}` : '/canned-responses';

    try {
      await apiRequest(url, {
        method,
        body: form,
      });
      setFeedback(editingId ? 'Plantilla actualizada exitosamente.' : 'Plantilla creada con éxito.');
      handleCloseModal();
      loadData();
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`¿Está seguro de eliminar la plantilla "${title}"?`)) return;
    try {
      await apiRequest(`/canned-responses/${id}`, { method: 'DELETE' });
      setFeedback(`Plantilla "${title}" eliminada.`);
      loadData();
    } catch (err) {
      setError('Error al eliminar: ' + err.message);
    }
  };

  const handleCopy = (res) => {
    navigator.clipboard.writeText(res.content);
    setCopiedId(res.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const uniqueCategories = useMemo(() => {
    const set = new Set(responses.map((r) => r.category || 'General'));
    return Array.from(set);
  }, [responses]);

  const filteredResponses = useMemo(() => {
    return responses.filter((res) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        res.title?.toLowerCase().includes(q) ||
        res.content?.toLowerCase().includes(q) ||
        res.shortcut?.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'ALL' || (res.category || 'General') === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [responses, search, selectedCategory]);

  const shortcutsCount = responses.filter((r) => Boolean(r.shortcut)).length;

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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
              Base de Conocimiento & Respuestas Predeterminadas
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Plantillas estándar para agilizar la resolución y atención al usuario en Mesa de Ayuda.
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
        {/* KPI 1: Plantillas */}
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
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plantillas Totales
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {responses.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '0.2rem' }}>
              Respuestas homologadas
            </div>
          </div>
        </div>

        {/* KPI 2: Categorías */}
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
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categorías
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {uniqueCategories.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>
              Áreas temáticas
            </div>
          </div>
        </div>

        {/* KPI 3: Atajos */}
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
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Atajos Rápidos
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {shortcutsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>
              Comandos /shortcut
            </div>
          </div>
        </div>

        {/* KPI 4: Aceleración */}
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
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ahorro de Tiempo
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              ~85%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>
              En primera respuesta
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
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: selectedCategory === 'ALL' ? '#ffffff' : 'transparent',
              color: selectedCategory === 'ALL' ? '#0f172a' : '#64748b',
              fontWeight: selectedCategory === 'ALL' ? '700' : '500',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: selectedCategory === 'ALL' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Todas ({responses.length})
          </button>
          {uniqueCategories.map((cat) => {
            const count = responses.filter((r) => (r.category || 'General') === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
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
              placeholder="Buscar por título, contenido o /atajo..."
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
            onClick={() => handleOpenModal()}
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
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* 📦 RESPONSES GRID CARDS */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Cargando base de conocimiento...
        </div>
      ) : filteredResponses.length === 0 ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
          <h3 style={{ margin: '0 0 0.25rem 0', color: '#1e293b' }}>No se encontraron respuestas predeterminadas</h3>
          <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.875rem' }}>
            Crea una plantilla rápida o ajusta los filtros de búsqueda.
          </p>
          <button
            onClick={() => handleOpenModal()}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Crear Primera Plantilla
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredResponses.map((res) => {
            const isCopied = copiedId === res.id;
            return (
              <div
                key={res.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                        {res.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          🏷️ {res.category || 'General'}
                        </span>
                        {res.shortcut && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              background: '#f5f3ff',
                              color: '#7c3aed',
                              border: '1px solid #c4b5fd',
                            }}
                          >
                            ⚡ /{res.shortcut.replace('/', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      fontSize: '0.84rem',
                      color: '#334155',
                      lineHeight: 1.5,
                      maxHeight: '120px',
                      overflowY: 'auto',
                      border: '1px solid #f1f5f9',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {res.content}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.85rem',
                  }}
                >
                  <button
                    onClick={() => handleCopy(res)}
                    style={{
                      background: isCopied ? '#ecfdf5' : '#f1f5f9',
                      color: isCopied ? '#047857' : '#334155',
                      border: `1px solid ${isCopied ? '#a7f3d0' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '0.4rem 0.75rem',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCopied ? '✓ ¡Copiado!' : '📋 Copiar Texto'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => handleOpenModal(res)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        color: '#0f172a',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(res.id, res.title)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.78rem',
                        color: '#b91c1c',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              maxWidth: '540px',
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
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                    {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
                  </h3>
                  <small style={{ color: '#64748b' }}>Texto predeterminado y atajo rápido</small>
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Título / Identificador de la Plantilla *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Saludo inicial y solicitud de detalles"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
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
                    Categoría Temática
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Redes, Cuentas, Hardware"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Atajo de Teclado (/atajo)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: saludo, pass, cierre"
                    value={form.shortcut}
                    onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
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
                  Contenido de la Respuesta Predeterminada *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Estimado(a) funcionario(a), hemos recibido su requerimiento..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
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
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
