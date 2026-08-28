import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function CannedResponses() {
  const [responses, setResponses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', type: '' });
  const [form, setForm] = useState({ 
    title: '', 
    content: '', 
    shortcut: '', 
    category: 'General', 
    ticketType: 'Incidencia' 
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, catData] = await Promise.all([
        apiRequest('/canned-responses'),
        apiRequest('/categories').catch(() => [])
      ]);
      setResponses(Array.isArray(resData) ? resData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error("Error loading data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/canned-responses/${editingId}` : '/canned-responses';

    apiRequest(url, {
      method,
      body: form
    }).then(() => {
      resetForm();
      loadData();
    });
  };

  const resetForm = () => {
    setForm({ title: '', content: '', shortcut: '', category: 'General', ticketType: 'Incidencia' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (res) => {
    setForm({ 
      title: res.title, 
      content: res.content, 
      shortcut: res.shortcut || '', 
      category: res.category || 'General', 
      ticketType: res.ticketType || 'Incidencia' 
    });
    setEditingId(res.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta plantilla?')) return;
    await apiRequest(`/canned-responses/${id}`, { method: 'DELETE' });
    loadData();
  };

  const handleCopy = (res) => {
    navigator.clipboard.writeText(res.content);
    setCopiedId(res.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredResponses = responses.filter(res => {
    const matchesSearch = !filters.search || 
      res.title.toLowerCase().includes(filters.search.toLowerCase()) || 
      res.content.toLowerCase().includes(filters.search.toLowerCase()) ||
      (res.shortcut && res.shortcut.toLowerCase().includes(filters.search.toLowerCase()));
    const matchesCategory = !filters.category || res.category === filters.category;
    const matchesType = !filters.type || res.ticketType === filters.type;
    return matchesSearch && matchesCategory && matchesType;
  });

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
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            fontSize: '1.25rem'
          }}>
            💬
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                Plantillas & Respuestas Rápidas
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                Knowledge Base
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              Respuestas estandarizadas y atajos de teclado para agilizar la atención de técnicos en los tickets.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? '#f1f5f9' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: showForm ? '#475569' : '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.35)'
          }}
        >
          {showForm ? 'Cancelar' : '+ Nueva Plantilla'}
        </button>
      </div>

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          marginBottom: '1.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            {editingId ? '✏️ Editar Plantilla' : '➕ Crear Nueva Plantilla de Respuesta'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Título de la Plantilla *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Saludo inicial y confirmación"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Atajo de Teclado (Comando)
                </label>
                <input
                  type="text"
                  placeholder="Ej: /saludo o /cierre"
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                  Tipo de Solicitud
                </label>
                <select
                  value={form.ticketType}
                  onChange={(e) => setForm({ ...form, ticketType: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                >
                  <option value="Incidencia">Incidencia</option>
                  <option value="Requerimiento">Requerimiento</option>
                  <option value="General">General / Ambos</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                Contenido del Mensaje *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Escribe el texto de la respuesta predefinida..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={resetForm}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ background: '#2563eb', color: '#ffffff', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
              >
                Guardar Plantilla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER SEARCH BAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <input
          type="text"
          placeholder="Buscar plantillas por título, texto o atajo (/comando)..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: '1', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
        />
      </div>

      {/* RESPONSES CARDS GRID */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando repositorio de respuestas...</div>
      ) : filteredResponses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>No se encontraron plantillas coincidentes.</p>
          <button onClick={() => setShowForm(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            + Crear Plantilla
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredResponses.map((res) => (
            <div
              key={res.id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                    {res.title}
                  </h4>
                  {res.shortcut && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe'
                    }}>
                      {res.shortcut}
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  "{res.content}"
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>
                  {res.ticketType || 'General'}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCopy(res)}
                    style={{
                      background: copiedId === res.id ? '#ecfdf5' : '#f1f5f9',
                      border: `1px solid ${copiedId === res.id ? '#a7f3d0' : '#cbd5e1'}`,
                      color: copiedId === res.id ? '#047857' : '#334155',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedId === res.id ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                  <button onClick={() => handleEdit(res)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>✏️</button>
                  <button onClick={() => handleDelete(res.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
