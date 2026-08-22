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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, catData] = await Promise.all([
        apiRequest('/canned-responses'),
        apiRequest('/categories')
      ]);
      setResponses(resData);
      setCategories(catData);
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
      body: JSON.stringify(form)
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

  const filteredResponses = responses.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(filters.search.toLowerCase()) || 
                         res.content.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = !filters.category || res.category === filters.category;
    const matchesType = !filters.type || res.ticketType === filters.type;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="view-container">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Repositorio Digital</p>
          <h2>Base de Conocimiento</h2>
          <p className="muted-text">Optimice la gestión operativa mediante plantillas técnicas estandarizadas y respuestas formales de alta fidelidad.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Crear Nueva Plantilla'}
          </button>
        </div>
      </section>

      {showForm && (
        <div className="card-premium animate-fade-in" style={{ 
          marginBottom: '2rem', 
          borderLeft: `4px solid ${form.ticketType === 'Incidencia' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
          background: 'linear-gradient(180deg, #ffffff, #f9fafb)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1a1a' }}>
              {editingId ? '🛠 Editar Plantilla Técnica' : '✨ Nueva Respuesta de Conocimiento'}
            </h3>
            <button className="btn-icon mini" onClick={resetForm}>✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)' }}>Título Descriptivo</label>
              <input 
                type="text" 
                placeholder="Ej: Protocolo de Conectividad DNS"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                required
                style={{ borderRadius: '10px' }}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)' }}>Tipo de Ticket</label>
              <select 
                value={form.ticketType}
                onChange={e => setForm({...form, ticketType: e.target.value})}
                required
                style={{ borderRadius: '10px' }}
              >
                <option value="Incidencia">Incidencia</option>
                <option value="Petición">Petición</option>
              </select>
            </div>

            <div className="field">
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)' }}>Atajo Rápido (Slash Command)</label>
              <input 
                type="text" 
                placeholder="Ej: /dns-fix"
                value={form.shortcut}
                onChange={e => setForm({...form, shortcut: e.target.value})}
                style={{ borderRadius: '10px' }}
              />
            </div>

            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)' }}>Categoría Relacionada</label>
              <select 
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                required
                style={{ borderRadius: '10px' }}
              >
                <option value="General">General</option>
                {[...new Set(categories.map(c => c.name))].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)' }}>Contenido Técnico y Formal</label>
              <textarea 
                rows="6"
                placeholder="Redacte la solución con lenguaje profesional y técnico..."
                value={form.content}
                onChange={e => setForm({...form, content: e.target.value})}
                required
                style={{ borderRadius: '12px', padding: '1rem', lineHeight: '1.6' }}
              />
              <small className="muted-text" style={{ marginTop: '8px', display: 'block' }}>Utilice un tono formal, técnico y conciso para la resolución definitiva.</small>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn outline" onClick={resetForm}>Descartar</button>
              <button type="submit" className="btn primary" style={{ padding: '0.75rem 2rem' }}>
                {editingId ? 'Actualizar Registro' : 'Registrar en Base'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-premium" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', flex: '1', minWidth: '300px' }}>
            <div className="field" style={{ flex: '1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px', display: 'block' }}>🔍 Búsqueda Inteligente</label>
              <input 
                type="text" 
                placeholder="Filtrar por título, atajo o contenido técnico..." 
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                style={{ borderRadius: '12px', padding: '0.75rem 1rem' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="field">
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px', display: 'block' }}>Tipo</label>
              <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={{ borderRadius: '12px', minWidth: '140px' }}>
                <option value="">Todos</option>
                <option value="Incidencia">Incidencias</option>
                <option value="Petición">Peticiones</option>
              </select>
            </div>
            <div className="field">
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '8px', display: 'block' }}>Categoría</label>
              <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} style={{ borderRadius: '12px', minWidth: '180px' }}>
                <option value="">Todas las categorías</option>
                {[...new Set(responses.map(r => r.category))].filter(Boolean).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="loader" style={{ margin: '0 auto 20px' }}></div>
          <p className="muted-text">Sincronizando repositorio de conocimiento...</p>
        </div>
      ) : (
        <div className="knowledge-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
          gap: '24px' 
        }}>
          {filteredResponses.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', background: '#fff', borderRadius: '24px', border: '2px dashed var(--color-border)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📂</span>
              <h3 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>No se encontraron resultados</h3>
              <p className="muted-text">Ajuste los filtros o cree una nueva plantilla para enriquecer la base.</p>
            </div>
          ) : (
            filteredResponses.map(res => (
              <div key={res.id} className="card-premium hover-lift" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '4px', 
                  height: '100%', 
                  background: res.ticketType === 'Incidencia' ? 'var(--color-danger)' : 'var(--color-primary)' 
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span className={`badge ${res.ticketType === 'Incidencia' ? 'danger' : 'success'}`} style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: '6px' }}>
                      {res.ticketType === 'Incidencia' ? '🚨 Incidencia' : '📋 Petición'}
                    </span>
                    <span className="badge" style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.04)', color: '#444' }}>
                      📁 {res.category}
                    </span>
                  </div>
                  {res.shortcut && (
                    <code style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 8px', 
                      background: '#1a1a1a', 
                      color: '#f4f4f4', 
                      borderRadius: '6px',
                      fontWeight: 600,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>{res.shortcut}</code>
                  )}
                </div>
                
                <h4 style={{ fontSize: '1.15rem', marginBottom: '12px', color: '#1a1a1a', fontWeight: 700, lineHeight: 1.3 }}>{res.title}</h4>
                
                <div style={{ 
                  fontSize: '0.92rem', 
                  color: '#4b5563', 
                  flex: '1', 
                  lineHeight: 1.6,
                  marginBottom: '24px',
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  whiteSpace: 'pre-wrap'
                }}>
                  {res.content.length > 220 ? res.content.substring(0, 220) + '...' : res.content}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingTop: '16px', 
                  borderTop: '1px solid #f1f5f9' 
                }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-icon mini" onClick={() => handleEdit(res)} title="Editar" style={{ background: '#f3f4f6' }}>✎</button>
                    <button className="btn-icon mini danger" onClick={() => handleDelete(res.id)} title="Eliminar" style={{ background: '#fee2e2' }}>🗑</button>
                  </div>
                  <button 
                    className="btn mini" 
                    style={{ 
                      background: 'var(--color-primary)', 
                      color: '#fff', 
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      padding: '0.5rem 1rem'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(res.content);
                      const btn = document.activeElement;
                      const originalText = btn.innerText;
                      btn.innerText = '¡Copiado!';
                      btn.style.background = '#059669';
                      setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.background = 'var(--color-primary)';
                      }, 2000);
                    }}
                  >
                    Copiar Solución
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
