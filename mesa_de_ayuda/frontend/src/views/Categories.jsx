import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const initialForm = {
  group: '',
  name: '',
  ticketType: 'Incidencia',
  sla: '4 horas',
  isActive: true,
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Incidencia');

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const data = await apiRequest('/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar categorías: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(category = null) {
    if (category) {
      setEditingId(category.id);
      setForm({
        group: category.group || '',
        name: category.name,
        ticketType: category.ticketType,
        sla: category.sla || '4 horas',
        isActive: category.isActive !== false,
      });
    } else {
      setEditingId(null);
      setForm({ ...initialForm, ticketType: activeTab });
    }
    setFeedback('');
    setError('');
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      if (editingId) {
        const updated = await apiRequest(`/categories/${editingId}`, {
          method: 'PUT',
          body: form,
        });
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setFeedback('Categoría actualizada exitosamente.');
      } else {
        const created = await apiRequest('/categories', {
          method: 'POST',
          body: form,
        });
        setCategories((prev) => [...prev, created]);
        setFeedback('Categoría creada exitosamente.');
      }
      handleCloseModal();
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(category) {
    try {
      const updated = await apiRequest(`/categories/${category.id}`, {
        method: 'PUT',
        body: { ...category, isActive: !category.isActive },
      });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setFeedback(`Categoría "${category.name}" ${!category.isActive ? 'activada' : 'desactivada'}.`);
    } catch (err) {
      setError('Error al actualizar estado: ' + err.message);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`¿Está seguro de eliminar la categoría "${name}"?`)) return;
    try {
      await apiRequest(`/categories/${id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setFeedback(`Categoría "${name}" eliminada.`);
    } catch (err) {
      setError('Error al eliminar: ' + err.message);
    }
  }

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesTab = c.ticketType === activeTab;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.group?.toLowerCase().includes(q) || c.sla?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [categories, activeTab, search]);

  const groupedCategories = useMemo(() => {
    const groups = {};
    filteredCategories.forEach((cat) => {
      const g = (cat.group || 'General').trim();
      if (!groups[g]) groups[g] = [];
      groups[g].push(cat);
    });
    return groups;
  }, [filteredCategories]);

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(categories.map((c) => (c.group || '').trim()).filter(Boolean)));
  }, [categories]);

  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const groupsCount = new Set(categories.map((c) => c.group || 'General')).size;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO CONTROL BAR */}
      <div
        style={{
          background: 'linear-gradient(135deg, #001D40 0%, #002D62 50%, #083b75 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
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
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#ffffff' }}>
                Categorías & Acuerdos de Servicio (ANS)
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'rgba(0, 209, 255, 0.18)',
                  color: '#00D1FF',
                  border: '1px solid rgba(0, 209, 255, 0.4)',
                }}
              >
                ITSM v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Clasificación de solicitudes por grupos temáticos y tiempos máximos de respuesta reglamentarios.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#002D62',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: '1px solid rgba(0, 209, 255, 0.4)',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 45, 98, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva Categoría
        </button>
      </div>

      {/* 📊 KPI METRICS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* KPI 1: Total */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)',
              border: '1px solid #6ee7b7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Catálogo
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>
              {categories.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>
              Tipologías registradas
            </div>
          </div>
        </div>

        {/* KPI 2: Activas */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)',
              border: '1px solid #93c5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categorías Activas
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>
              {activeCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '0.2rem' }}>
              Disponibles para radicación
            </div>
          </div>
        </div>

        {/* KPI 3: Grupos */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)',
              border: '1px solid #c4b5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grupos Temáticos
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>
              {groupsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>
              Áreas de servicio
            </div>
          </div>
        </div>

        {/* KPI 4: SLA Estándar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ANS Promedio
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>
              4h - 24h
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>
              Ventana de resolución
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
        {/* Type Segmented Tabs */}
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
          {['Incidencia', 'Requerimiento', 'Problema', 'Cambio'].map((type) => {
            const count = categories.filter((c) => c.ticketType === type).length;
            const isSelected = activeTab === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                style={{
                  background: isSelected ? '#002D62' : 'transparent',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid rgba(0, 209, 255, 0.4)' : '1px solid transparent',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 45, 98, 0.3)' : 'none',
                }}
              >
                {type}s ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', maxWidth: '380px', minWidth: '220px', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={`Buscar categorías o grupos en ${activeTab}s...`}
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
      </div>

      {/* 📦 CATEGORIES ORGANIZED BY THEMATIC GROUP */}
      {loading ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#002D62', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
          Cargando catálogo de categorías por grupo temático...
        </div>
      ) : Object.keys(groupedCategories).length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '3.5rem 1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏷️</div>
          <h3 style={{ margin: '0 0 0.35rem 0', color: '#002D62', fontWeight: 800 }}>
            No hay categorías de {activeTab}s
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>
            Crea la primera categoría para clasificar tickets y establecer los tiempos de respuesta ANS.
          </p>
          <button
            onClick={() => handleOpenModal()}
            style={{
              background: '#002D62',
              color: '#ffffff',
              border: '1px solid rgba(0, 209, 255, 0.4)',
              padding: '0.65rem 1.35rem',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 45, 98, 0.3)',
            }}
          >
            + Crear Primera Categoría
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {Object.entries(groupedCategories).map(([groupName, items]) => (
            <div
              key={groupName}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px -2px rgba(0, 45, 98, 0.05)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {/* Group Header */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.15rem' }}>📁</span>
                  <strong style={{ color: '#002D62', fontSize: '0.95rem', fontWeight: 800 }}>
                    {groupName}
                  </strong>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    background: '#e0f8ff',
                    color: '#002D62',
                    border: '1px solid rgba(0, 209, 255, 0.35)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                  }}
                >
                  {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
                </span>
              </div>

              {/* Items List inside Group */}
              <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {items.map((cat) => {
                  const isActive = cat.isActive !== false;
                  return (
                    <div
                      key={cat.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9',
                        background: isActive ? '#ffffff' : '#f8fafc',
                        opacity: isActive ? 1 : 0.65,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.02)' : 'none',
                      }}
                      onMouseEnter={(e) => { if (isActive) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={(e) => { if (isActive) e.currentTarget.style.borderColor = '#f1f5f9'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.9rem', display: 'block', wordBreak: 'break-word' }}>
                          {cat.name}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              background: '#f0f9ff',
                              color: '#002D62',
                              border: '1px solid rgba(0, 209, 255, 0.25)',
                            }}
                          >
                            ⏱️ ANS: {cat.sla || 'Sin tiempo'}
                          </span>
                          {!isActive && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#ef4444', background: '#fef2f2', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              Inactiva
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          style={{
                            background: isActive ? '#ecfdf5' : '#fef2f2',
                            color: isActive ? '#059669' : '#b91c1c',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                            padding: '0.3rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title={isActive ? 'Desactivar categoría' : 'Activar categoría'}
                        >
                          {isActive ? '🟢 Activa' : '⚪ Inactiva'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(cat)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '0.3rem 0.55rem',
                            color: '#002D62',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                          }}
                          title="Editar categoría"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '0.3rem 0.55rem',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                          }}
                          title="Eliminar categoría"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
              maxWidth: '500px',
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
                    background: '#f0f9ff',
                    color: '#002D62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0, 209, 255, 0.3)',
                  }}
                >
                  🏷️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#002D62', fontWeight: '800' }}>
                    {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                  </h3>
                  <small style={{ color: '#64748b' }}>Definición de tipología y tiempo ANS</small>
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
                  Nombre de la Categoría *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Falla de Conexión a Internet"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                    Tipología de Ticket *
                  </label>
                  <select
                    value={form.ticketType}
                    onChange={(e) => setForm({ ...form, ticketType: e.target.value })}
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
                  >
                    <option value="Incidencia">🚨 Incidencia</option>
                    <option value="Requerimiento">📋 Requerimiento</option>
                    <option value="Problema">🔍 Problema</option>
                    <option value="Cambio">🔄 Cambio</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Grupo Temático *
                  </label>
                  <input
                    type="text"
                    list="group-options"
                    placeholder="Ej: Redes & Conectividad"
                    value={form.group}
                    onChange={(e) => setForm({ ...form, group: e.target.value })}
                    required
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
                  <datalist id="group-options">
                    {uniqueGroups.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Acuerdo de Nivel de Servicio (ANS) *
                </label>
                <select
                  value={form.sla}
                  onChange={(e) => setForm({ ...form, sla: e.target.value })}
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
                >
                  <option value="1 hora">⚡ 1 hora (Crítico)</option>
                  <option value="2 horas">⏱️ 2 horas (Urgente)</option>
                  <option value="4 horas">⏱️ 4 horas (Estándar)</option>
                  <option value="8 horas">📅 8 horas (1 día hábil)</option>
                  <option value="24 horas">📅 24 horas</option>
                  <option value="48 horas">📅 48 horas (2 días)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id="cat-modal-isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                />
                <label htmlFor="cat-modal-isActive" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', cursor: 'pointer', margin: 0 }}>
                  Categoría Activa (disponible para selección)
                </label>
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
                    background: '#002D62',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: '1px solid rgba(0, 209, 255, 0.4)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 45, 98, 0.35)',
                  }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
