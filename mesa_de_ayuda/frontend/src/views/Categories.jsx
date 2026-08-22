import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const initialForm = {
  group: '',
  name: '',
  ticketType: 'Incidencia',
  sla: '',
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
  
  const [activeTab, setActiveTab] = useState('Incidencia');
  
  const uniqueGroups = useMemo(() => {
    const groups = categories.map(c => c.group).filter(Boolean);
    return [...new Set(groups)].sort();
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const data = await apiRequest('/categories');
      setCategories(data);
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
        sla: category.sla || '',
        isActive: category.isActive
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
    setFeedback('');
    setError('');

    try {
      if (editingId) {
        const updated = await apiRequest(`/categories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        setFeedback('Categoría actualizada exitosamente.');
      } else {
        const created = await apiRequest('/categories', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setCategories(prev => [...prev, created]);
        setFeedback('Categoría creada exitosamente.');
      }
      setTimeout(() => {
        handleCloseModal();
        setFeedback('');
      }, 1500);
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    }
  }

  async function handleToggleActive(category) {
    if (!window.confirm(`¿Estás seguro de que deseas ${category.isActive ? 'desactivar' : 'activar'} esta categoría?`)) return;
    try {
      const updated = await apiRequest(`/categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...category, isActive: !category.isActive })
      });
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      alert('Error al cambiar el estado: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta categoría? Esta acción no se puede deshacer.')) return;
    try {
      await apiRequest(`/categories/${id}`, {
        method: 'DELETE'
      });
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Error al eliminar la categoría: ' + err.message);
    }
  }

  // Agrupar las categorias para la pestaña activa
  const activeCategories = categories.filter(c => c.ticketType === activeTab);
  const groupedCategories = activeCategories.reduce((acc, cat) => {
    const g = cat.group || 'General';
    if (!acc[g]) acc[g] = [];
    acc[g].push(cat);
    return acc;
  }, {});

  // Ordenar grupos alfabéticamente
  const sortedGroups = Object.keys(groupedCategories).sort();

  return (
    <div className="view-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <section className="hero-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow">Administración</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', margin: '0.5rem 0' }}>Estructura de Categorías</h2>
            <p className="muted-text">Diseña el árbol de tipologías y Acuerdos de Nivel de Servicio (ANS).</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nueva Categoría
          </button>
        </div>
      </section>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('Incidencia')}
          style={{
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Incidencia' ? '3px solid #002E5D' : '3px solid transparent',
            color: activeTab === 'Incidencia' ? '#002E5D' : '#64748b',
            fontWeight: activeTab === 'Incidencia' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          Incidencias
        </button>
        <button 
          onClick={() => setActiveTab('Petición')}
          style={{
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Petición' ? '3px solid #002E5D' : '3px solid transparent',
            color: activeTab === 'Petición' ? '#002E5D' : '#64748b',
            fontWeight: activeTab === 'Petición' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          Solicitudes / Peticiones
        </button>
      </div>

      <section>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            Cargando estructura...
          </div>
        ) : sortedGroups.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p>No hay categorías registradas en {activeTab}.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sortedGroups.map(groupName => (
              <div key={groupName} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Cabecera del Grupo */}
                <div style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{groupName}</h3>
                  <span style={{ marginLeft: 'auto', background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600 }}>
                    {groupedCategories[groupName].length}
                  </span>
                </div>
                
                {/* Lista de Categorías */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {groupedCategories[groupName].map((cat, index) => (
                    <div key={cat.id} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '1rem 1.5rem', 
                      borderBottom: index < groupedCategories[groupName].length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: cat.isActive ? '#fff' : '#fafafa',
                      opacity: cat.isActive ? 1 : 0.6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.isActive ? '#10b981' : '#94a3b8' }}></div>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#1e293b', display: 'block', marginBottom: '0.2rem' }}>{cat.name}</strong>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              ANS: <strong style={{ color: cat.sla ? '#002E5D' : '#94a3b8' }}>{cat.sla || 'No definido'}</strong>
                            </span>
                            {!cat.isActive && (
                              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Inactiva</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleOpenModal(cat)}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'background 0.2s' }}
                          onMouseOver={e => e.target.style.background = '#e2e8f0'}
                          onMouseOut={e => e.target.style.background = '#f1f5f9'}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleActive(cat)}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'transparent', color: cat.isActive ? '#64748b' : '#10b981', border: '1px solid ' + (cat.isActive ? '#cbd5e1' : '#10b981'), borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                        >
                          {cat.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'background 0.2s' }}
                          onMouseOver={e => e.target.style.background = '#fee2e2'}
                          onMouseOut={e => e.target.style.background = '#fef2f2'}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '500px', borderRadius: '12px', padding: '2rem' }}>
            <div className="section-heading" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <p style={{ margin: 0 }}>Parámetros de clasificación para el formulario de tickets.</p>
            </div>

            {error && <div className="feedback error" style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1.5rem' }}>{error}</div>}
            {feedback && <div className="feedback success" style={{ padding: '0.75rem', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '1.5rem' }}>{feedback}</div>}

            <form className="form-grid" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="field full">
                <label style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Tipo de Ticket *</label>
                <select 
                  value={form.ticketType} 
                  onChange={e => setForm({...form, ticketType: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' }}
                >
                  <option value="Incidencia">Incidencia</option>
                  <option value="Petición">Petición</option>
                </select>
              </div>

              <div className="field full">
                <label style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Grupo Principal *</label>
                <input 
                  type="text" 
                  list="group-options"
                  value={form.group} 
                  onChange={e => setForm({...form, group: e.target.value})} 
                  placeholder="Ej. Infraestructura - Equipos"
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' }}
                />
                <datalist id="group-options">
                  {uniqueGroups.map(g => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>

              <div className="field full">
                <label style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Nombre de la Categoría *</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="Ej. Hardware"
                  required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' }}
                />
              </div>

              <div className="field full">
                <label style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Acuerdo de Nivel de Servicio (ANS / SLA)</label>
                <select 
                  value={form.sla} 
                  onChange={e => setForm({...form, sla: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' }}
                >
                  <option value="">Sin ANS predeterminado</option>
                  <option value="2h">2 Horas</option>
                  <option value="4h">4 Horas</option>
                  <option value="8h">8 Horas</option>
                  <option value="24h">24 Horas</option>
                  <option value="48h">48 Horas</option>
                </select>
              </div>
              
              <div className="field full" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="cat-isActive"
                  checked={form.isActive} 
                  onChange={e => setForm({...form, isActive: e.target.checked})}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="cat-isActive" style={{ margin: 0, cursor: 'pointer', fontWeight: 500, color: '#334155' }}>Categoría Activa</label>
              </div>

              <div className="toolbar full" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600 }}>
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
