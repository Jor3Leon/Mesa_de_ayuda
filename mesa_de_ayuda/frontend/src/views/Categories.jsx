import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const initialForm = {
  group: '',
  name: '',
  ticketType: 'Incidencia',
  sla: '4 horas',
  isActive: true
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  
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
        isActive: category.isActive !== false
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
          body: form
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        setFeedback('Categoría actualizada exitosamente.');
      } else {
        const created = await apiRequest('/categories', {
          method: 'POST',
          body: form
        });
        setCategories(prev => [...prev, created]);
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
        body: { ...category, isActive: !category.isActive }
      });
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      setError('Error al cambiar estado: ' + err.message);
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) return;
    try {
      await apiRequest(`/categories/${category.id}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c.id !== category.id));
      setFeedback('Categoría eliminada.');
    } catch (err) {
      setError('Error al eliminar: ' + err.message);
    }
  }

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.ticketType === activeTab);
  }, [categories, activeTab]);

  const groupedCategories = useMemo(() => {
    const groups = {};
    filteredCategories.forEach(cat => {
      const grp = cat.group || 'General';
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(cat);
    });
    return groups;
  }, [filteredCategories]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 🌟 HERO CONTROL BAR */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        marginBottom: '1.75rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            fontSize: '1.25rem'
          }}>
            🏷️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Categorías & Acuerdos de Servicio (ANS)
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                ITSM v2.2
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Clasificación de solicitudes por tipología y tiempos máximos de respuesta reglamentarios.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
          }}
        >
          + Nueva Categoría
        </button>
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

      {/* 🧭 TABS: INCIDENCIAS VS REQUERIMIENTOS */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '0.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {['Incidencia', 'Requerimiento', 'Problema', 'Cambio'].map((type) => {
          const isActive = activeTab === type;
          const count = categories.filter(c => c.ticketType === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{type === 'Incidencia' ? '🚨' : type === 'Requerimiento' ? '📋' : type === 'Problema' ? '🔍' : '🔄'}</span>
              {type}s ({count})
            </button>
          );
        })}
      </div>

      {/* 📦 CATEGORIES BY GROUP GRID */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando catálogo...</div>
      ) : Object.keys(groupedCategories).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>No hay categorías registradas para tipo <strong>{activeTab}</strong>.</p>
          <button
            onClick={() => handleOpenModal()}
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            + Crear Primera Categoría
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {Object.entries(groupedCategories).map(([groupName, items]) => (
            <div
              key={groupName}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {/* Group Header */}
              <div style={{
                padding: '0.85rem 1.25rem',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                  📁 {groupName}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', background: '#e2e8f0', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {items.length} categorías
                </span>
              </div>

              {/* Items List */}
              <div style={{ padding: '0.75rem' }}>
                {items.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: cat.isActive ? '#ffffff' : '#f8fafc',
                      opacity: cat.isActive ? 1 : 0.6
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        ⏱️ ANS: {cat.sla || 'Sin tiempo estipulado'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleToggleActive(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                        title={cat.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {cat.isActive ? '🟢' : '⚪'}
                      </button>
                      <button
                        onClick={() => handleOpenModal(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                {editingId ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
              </h3>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Tipo de Solicitud *
                </label>
                <select
                  value={form.ticketType}
                  onChange={(e) => setForm({ ...form, ticketType: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="Incidencia">Incidencia</option>
                  <option value="Requerimiento">Requerimiento</option>
                  <option value="Problema">Problema</option>
                  <option value="Cambio">Cambio</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Grupo / Especialidad *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Hardware, Redes, Cuentas, Ofimática"
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Nombre de la Categoría *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Falla en Impresora / Creación de Usuario"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Tiempo de Resolución ANS (SLA)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 2 horas, 4 horas, 1 día"
                  value={form.sla}
                  onChange={(e) => setForm({ ...form, sla: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: '#059669', color: '#ffffff', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                >
                  {saving ? 'Guardando...' : 'Guardar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
