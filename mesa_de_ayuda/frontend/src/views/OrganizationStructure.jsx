import { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

export default function OrganizationStructure() {
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'sedes' | 'dependencias' | 'oficinas'
  const [treeData, setTreeData] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [stats, setStats] = useState({ totalSedes: 0, totalDependencias: 0, totalOficinas: 0, totalAssets: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({});

  // Filter states for CRUD tables
  const [filterSedeId, setFilterSedeId] = useState('ALL');
  const [filterDepId, setFilterDepId] = useState('ALL');

  // Modals state
  const [modalType, setModalType] = useState(null); // 'sede' | 'dependencia' | 'oficina'
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Forms state
  const [sedeForm, setSedeForm] = useState({ name: '', code: '', address: '', city: 'Yopal', phone: '', managerName: '' });
  const [depForm, setDepForm] = useState({ name: '', code: '', sedeId: '', managerName: '', email: '' });
  const [ofiForm, setOfiForm] = useState({ name: '', code: '', sedeId: '', dependenciaId: '', floor: '', responsibleUser: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [treeRes, sedesRes, depsRes, ofisRes] = await Promise.all([
        apiRequest('/organization-structure').catch(() => ({ tree: [], stats: {} })),
        apiRequest('/organization-structure/sedes').catch(() => []),
        apiRequest('/organization-structure/dependencias').catch(() => []),
        apiRequest('/organization-structure/oficinas').catch(() => []),
      ]);

      const tree = treeRes.tree || [];
      setTreeData(tree);
      setStats(treeRes.stats || { totalSedes: sedesRes.length, totalDependencias: depsRes.length, totalOficinas: ofisRes.length, totalAssets: 0 });
      setSedes(sedesRes);
      setDependencias(depsRes);
      setOficinas(ofisRes);

      // Auto-expand all sedes in tree on first load
      const initialExpanded = {};
      tree.forEach((s) => {
        initialExpanded[`sede-${s.id}`] = true;
        (s.dependencias || []).forEach((d) => {
          initialExpanded[`dep-${d.id}`] = true;
        });
      });
      setExpandedNodes((prev) => (Object.keys(prev).length === 0 ? initialExpanded : prev));
    } catch (err) {
      setError(err.message || 'Error al cargar la estructura organizacional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleNode = (nodeKey) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const expandAll = () => {
    const all = {};
    treeData.forEach((s) => {
      all[`sede-${s.id}`] = true;
      (s.dependencias || []).forEach((d) => {
        all[`dep-${d.id}`] = true;
      });
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  // Open modal handlers
  const handleOpenSedeModal = (sede = null) => {
    setEditingItem(sede);
    if (sede) {
      setSedeForm({
        name: sede.name || '',
        code: sede.code || '',
        address: sede.address || '',
        city: sede.city || 'Yopal',
        phone: sede.phone || '',
        managerName: sede.managerName || '',
      });
    } else {
      setSedeForm({ name: '', code: '', address: '', city: 'Yopal', phone: '', managerName: '' });
    }
    setModalType('sede');
  };

  const handleOpenDepModal = (dep = null, defaultSedeId = '') => {
    setEditingItem(dep);
    if (dep) {
      setDepForm({
        name: dep.name || '',
        code: dep.code || '',
        sedeId: dep.sedeId ? String(dep.sedeId) : '',
        managerName: dep.managerName || '',
        email: dep.email || '',
      });
    } else {
      setDepForm({
        name: '',
        code: '',
        sedeId: defaultSedeId ? String(defaultSedeId) : (sedes[0]?.id ? String(sedes[0].id) : ''),
        managerName: '',
        email: '',
      });
    }
    setModalType('dependencia');
  };

  const handleOpenOfiModal = (ofi = null, defaultSedeId = '', defaultDepId = '') => {
    setEditingItem(ofi);
    if (ofi) {
      setOfiForm({
        name: ofi.name || '',
        code: ofi.code || '',
        sedeId: ofi.sedeId ? String(ofi.sedeId) : '',
        dependenciaId: ofi.dependenciaId ? String(ofi.dependenciaId) : '',
        floor: ofi.floor || '',
        responsibleUser: ofi.responsibleUser || '',
      });
    } else {
      setOfiForm({
        name: '',
        code: '',
        sedeId: defaultSedeId ? String(defaultSedeId) : (sedes[0]?.id ? String(sedes[0].id) : ''),
        dependenciaId: defaultDepId ? String(defaultDepId) : (dependencias[0]?.id ? String(dependencias[0].id) : ''),
        floor: '',
        responsibleUser: '',
      });
    }
    setModalType('oficina');
  };

  // Submit handlers
  const handleSaveSede = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      if (editingItem) {
        await apiRequest(`/organization-structure/sedes/${editingItem.id}`, {
          method: 'PUT',
          body: sedeForm,
        });
        setFeedback(`Sede "${sedeForm.name}" actualizada con éxito.`);
      } else {
        await apiRequest('/organization-structure/sedes', {
          method: 'POST',
          body: sedeForm,
        });
        setFeedback(`Sede "${sedeForm.name}" creada con éxito.`);
      }
      setModalType(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDep = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      const payload = {
        ...depForm,
        sedeId: depForm.sedeId ? Number(depForm.sedeId) : null,
      };

      if (editingItem) {
        await apiRequest(`/organization-structure/dependencias/${editingItem.id}`, {
          method: 'PUT',
          body: payload,
        });
        setFeedback(`Dependencia "${depForm.name}" actualizada.`);
      } else {
        await apiRequest('/organization-structure/dependencias', {
          method: 'POST',
          body: payload,
        });
        setFeedback(`Dependencia "${depForm.name}" creada.`);
      }
      setModalType(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOfi = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      const payload = {
        ...ofiForm,
        sedeId: ofiForm.sedeId ? Number(ofiForm.sedeId) : null,
        dependenciaId: ofiForm.dependenciaId ? Number(ofiForm.dependenciaId) : null,
      };

      if (editingItem) {
        await apiRequest(`/organization-structure/oficinas/${editingItem.id}`, {
          method: 'PUT',
          body: payload,
        });
        setFeedback(`Oficina "${ofiForm.name}" actualizada.`);
      } else {
        await apiRequest('/organization-structure/oficinas', {
          method: 'POST',
          body: payload,
        });
        setFeedback(`Oficina "${ofiForm.name}" creada.`);
      }
      setModalType(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${name}"?`)) return;
    setError('');
    setFeedback('');

    try {
      await apiRequest(`/organization-structure/${type}/${id}`, { method: 'DELETE' });
      setFeedback(`Elemento eliminado con éxito.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Filtered Tree Search
  const filteredTree = useMemo(() => {
    if (!search.trim()) return treeData;
    const term = search.toLowerCase().trim();

    return treeData.filter((sede) => {
      const matchSede = sede.name.toLowerCase().includes(term) || (sede.code && sede.code.toLowerCase().includes(term));
      const matchingDeps = (sede.dependencias || []).filter((dep) => {
        const matchDep = dep.name.toLowerCase().includes(term) || (dep.code && dep.code.toLowerCase().includes(term));
        const matchOfis = (dep.oficinas || []).some((ofi) => ofi.name.toLowerCase().includes(term) || (ofi.code && ofi.code.toLowerCase().includes(term)));
        return matchDep || matchOfis;
      });
      const matchingOfis = (sede.oficinasDirectas || []).filter((ofi) => ofi.name.toLowerCase().includes(term));

      return matchSede || matchingDeps.length > 0 || matchingOfis.length > 0;
    });
  }, [treeData, search]);

  return (
    <div className="view-container">
      {/* Header & Title */}
      <section className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <span style={{ fontSize: '1.4rem' }}>🏛️</span> Estructura Organizacional & Ubicaciones
          </h2>
          <p style={{ margin: '0.3rem 0 0 0', color: '#64748b' }}>
            Jerarquía institucional: Sedes, Dependencias/Áreas y Oficinas físicas para la asignación y trazabilidad de Activos TI.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-ghost" onClick={() => handleOpenSedeModal()} style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
            + Nueva Sede
          </button>
          <button type="button" className="btn-ghost" onClick={() => handleOpenDepModal()} style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
            + Nueva Dependencia
          </button>
          <button type="button" className="btn" onClick={() => handleOpenOfiModal()} style={{ background: '#0284c7' }}>
            + Nueva Oficina
          </button>
        </div>
      </section>

      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.2rem' }}>
        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ background: '#e0f2fe', color: '#0284c7', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            🏛️
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Sedes / Campus</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalSedes || sedes.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ background: '#ede9fe', color: '#8b5cf6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            📁
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Dependencias / Áreas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalDependencias || dependencias.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ background: '#d1fae5', color: '#10b981', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            🚪
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Oficinas & Espacios</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalOficinas || oficinas.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            💻
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Activos TI Monitoreados</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalAssets || 0}</div>
          </div>
        </div>
      </div>

      {error && <div className="feedback error" style={{ marginTop: '1rem' }}>{error}</div>}
      {feedback && <div className="feedback" style={{ marginTop: '1rem' }}>{feedback}</div>}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginTop: '1.5rem', paddingBottom: '0.2rem' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setActiveTab('tree')}
          style={{
            fontWeight: 600,
            borderBottom: activeTab === 'tree' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'tree' ? '#0284c7' : '#64748b',
            borderRadius: '0',
            padding: '0.6rem 1.2rem',
          }}
        >
          🌳 Árbol Organizacional
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setActiveTab('sedes')}
          style={{
            fontWeight: 600,
            borderBottom: activeTab === 'sedes' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'sedes' ? '#0284c7' : '#64748b',
            borderRadius: '0',
            padding: '0.6rem 1.2rem',
          }}
        >
          🏛️ Sedes ({sedes.length})
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setActiveTab('dependencias')}
          style={{
            fontWeight: 600,
            borderBottom: activeTab === 'dependencias' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'dependencias' ? '#0284c7' : '#64748b',
            borderRadius: '0',
            padding: '0.6rem 1.2rem',
          }}
        >
          📁 Dependencias ({dependencias.length})
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setActiveTab('oficinas')}
          style={{
            fontWeight: 600,
            borderBottom: activeTab === 'oficinas' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'oficinas' ? '#0284c7' : '#64748b',
            borderRadius: '0',
            padding: '0.6rem 1.2rem',
          }}
        >
          🚪 Oficinas ({oficinas.length})
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: ÁRBOL ORGANIZACIONAL VISUAL                   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'tree' && (
        <section className="card" style={{ marginTop: '1.2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
              <input
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Filtrar por sede, área u oficina..."
                style={{ width: '100%' }}
              />
              {search && (
                <button type="button" className="btn-ghost" onClick={() => setSearch('')} style={{ padding: '0.4rem 0.6rem' }}>
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-ghost" onClick={expandAll} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                📂 Expandir Todo
              </button>
              <button type="button" className="btn-ghost" onClick={collapseAll} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                📁 Colapsar Todo
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state" style={{ padding: '3rem 0' }}>Cargando estructura organizacional...</div>
          ) : filteredTree.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏛️</div>
              <p>No se encontraron sedes o dependencias registradas.</p>
              <button type="button" className="btn" onClick={() => handleOpenSedeModal()} style={{ marginTop: '1rem' }}>
                + Registrar Primera Sede
              </button>
            </div>
          ) : (
            <div className="tree-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTree.map((sede) => {
                const isSedeExpanded = Boolean(expandedNodes[`sede-${sede.id}`]);

                return (
                  <div
                    key={sede.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      overflow: 'hidden',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Sede Header */}
                    <div
                      style={{
                        padding: '0.9rem 1.2rem',
                        background: '#fff',
                        borderBottom: isSedeExpanded ? '1px solid #e2e8f0' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleNode(`sede-${sede.id}`)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ fontSize: '1rem', color: '#64748b' }}>{isSedeExpanded ? '▼' : '►'}</span>
                        <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.4rem', borderRadius: '8px', fontSize: '1.2rem' }}>
                          🏛️
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{sede.name}</strong>
                            {sede.code && (
                              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                {sede.code}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            📍 {sede.address || 'Sin dirección'} {sede.city ? `• ${sede.city}` : ''} {sede.managerName ? `• Resp: ${sede.managerName}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                          💻 {sede.assetCount || 0} Activos
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                          📁 {(sede.dependencias || []).length} Dependencias
                        </span>
                        <button
                          type="button"
                          className="btn-ghost"
                          title="Añadir Dependencia a esta Sede"
                          onClick={() => handleOpenDepModal(null, sede.id)}
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                        >
                          + Área
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          title="Editar Sede"
                          onClick={() => handleOpenSedeModal(sede)}
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    {/* Sede Children (Dependencias & Oficinas) */}
                    {isSedeExpanded && (
                      <div style={{ padding: '0.8rem 1rem 0.8rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(sede.dependencias || []).length === 0 && (sede.oficinasDirectas || []).length === 0 ? (
                          <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '0.5rem 0' }}>
                            No hay dependencias registradas en esta sede.{' '}
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleOpenDepModal(null, sede.id)}
                              style={{ color: '#0284c7', textDecoration: 'underline', padding: '0 0.2rem' }}
                            >
                              Añadir una dependencia
                            </button>
                          </div>
                        ) : null}

                        {(sede.dependencias || []).map((dep) => {
                          const isDepExpanded = Boolean(expandedNodes[`dep-${dep.id}`]);

                          return (
                            <div
                              key={dep.id}
                              style={{
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                background: '#fff',
                                overflow: 'hidden',
                              }}
                            >
                              {/* Dependencia Header */}
                              <div
                                style={{
                                  padding: '0.7rem 1rem',
                                  background: '#fafafa',
                                  borderBottom: isDepExpanded ? '1px solid #f1f5f9' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                }}
                                onClick={() => toggleNode(`dep-${dep.id}`)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{isDepExpanded ? '▼' : '►'}</span>
                                  <div style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.3rem', borderRadius: '6px', fontSize: '1rem' }}>
                                    📁
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{dep.name}</strong>
                                      {dep.code && (
                                        <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>
                                          {dep.code}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      {dep.managerName ? `Jefe: ${dep.managerName}` : 'Sin jefe asignado'} {dep.email ? `• ${dep.email}` : ''}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                  <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                                    💻 {dep.assetCount || 0} activos
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    title="Añadir Oficina a esta Dependencia"
                                    onClick={() => handleOpenOfiModal(null, sede.id, dep.id)}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                                  >
                                    + Oficina
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    title="Editar Dependencia"
                                    onClick={() => handleOpenDepModal(dep, sede.id)}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  >
                                    ✏️
                                  </button>
                                </div>
                              </div>

                              {/* Oficinas list */}
                              {isDepExpanded && (
                                <div style={{ padding: '0.6rem 0.8rem 0.6rem 2.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#fff' }}>
                                  {(dep.oficinas || []).length === 0 ? (
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '0.3rem 0' }}>
                                      No hay oficinas registradas.{' '}
                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => handleOpenOfiModal(null, sede.id, dep.id)}
                                        style={{ color: '#0284c7', textDecoration: 'underline', padding: '0 0.2rem' }}
                                      >
                                        Crear oficina
                                      </button>
                                    </div>
                                  ) : (
                                    dep.oficinas.map((ofi) => (
                                      <div
                                        key={ofi.id}
                                        style={{
                                          padding: '0.5rem 0.8rem',
                                          borderRadius: '8px',
                                          background: '#f8fafc',
                                          border: '1px solid #f1f5f9',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                          <span style={{ fontSize: '0.9rem' }}>🚪</span>
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                              <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{ofi.name}</strong>
                                              {ofi.floor && (
                                                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                                  {ofi.floor}
                                                </span>
                                              )}
                                              {ofi.code && (
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>
                                                  {ofi.code}
                                                </span>
                                              )}
                                            </div>
                                            {ofi.responsibleUser && (
                                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>👤 Resp: {ofi.responsibleUser}</div>
                                            )}
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                                            💻 {ofi.assetCount || 0} TI
                                          </span>
                                          <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={() => handleOpenOfiModal(ofi, sede.id, dep.id)}
                                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}
                                          >
                                            ✏️
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: SEDES / CAMPUS CRUD                           */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'sedes' && (
        <section className="card" style={{ marginTop: '1.2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Directorio de Sedes y Campus ({sedes.length})</h3>
            <button type="button" className="btn" onClick={() => handleOpenSedeModal()}>
              + Registrar Nueva Sede
            </button>
          </div>

          <div className="table-shell">
            {sedes.length === 0 ? (
              <div className="empty-state">No hay sedes registradas.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre de la Sede</th>
                    <th>Dirección</th>
                    <th>Ciudad</th>
                    <th>Teléfono</th>
                    <th>Administrador / Responsable</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sedes.map((s) => (
                    <tr key={s.id}>
                      <td><span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{s.code || '---'}</span></td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.address || '---'}</td>
                      <td>{s.city || 'Yopal'}</td>
                      <td>{s.phone || '---'}</td>
                      <td>{s.managerName || '---'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn-ghost" onClick={() => handleOpenSedeModal(s)} style={{ padding: '0.3rem 0.6rem', marginRight: '0.3rem' }}>
                          ✏️ Editar
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => handleDelete('sedes', s.id, s.name)} style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: DEPENDENCIAS / ÁREAS CRUD                     */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'dependencias' && (
        <section className="card" style={{ marginTop: '1.2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <h3 style={{ margin: 0 }}>Dependencias y Secretarías ({dependencias.length})</h3>
              <select
                className="search-input"
                value={filterSedeId}
                onChange={(e) => setFilterSedeId(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
              >
                <option value="ALL">🏢 Todas las Sedes</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <button type="button" className="btn" onClick={() => handleOpenDepModal()}>
              + Nueva Dependencia
            </button>
          </div>

          <div className="table-shell">
            {dependencias.length === 0 ? (
              <div className="empty-state">No hay dependencias registradas.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Dependencia / Área</th>
                    <th>Sede Asignada</th>
                    <th>Líder / Jefe de Área</th>
                    <th>Correo de Contacto</th>
                    <th>Oficinas</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dependencias
                    .filter((d) => filterSedeId === 'ALL' || String(d.sedeId) === String(filterSedeId))
                    .map((d) => (
                      <tr key={d.id}>
                        <td><span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{d.code || '---'}</span></td>
                        <td><strong>{d.name}</strong></td>
                        <td>{d.sede?.name || 'Sede Principal'}</td>
                        <td>{d.managerName || '---'}</td>
                        <td>{d.email || '---'}</td>
                        <td>{(d.oficinas || []).length}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn-ghost" onClick={() => handleOpenDepModal(d, d.sedeId)} style={{ padding: '0.3rem 0.6rem', marginRight: '0.3rem' }}>
                            ✏️ Editar
                          </button>
                          <button type="button" className="btn-ghost" onClick={() => handleDelete('dependencias', d.id, d.name)} style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: OFICINAS & ESPACIOS FÍSICOS CRUD              */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'oficinas' && (
        <section className="card" style={{ marginTop: '1.2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Oficinas y Espacios de Trabajo ({oficinas.length})</h3>
              <select
                className="search-input"
                value={filterDepId}
                onChange={(e) => setFilterDepId(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
              >
                <option value="ALL">📁 Todas las Dependencias</option>
                {dependencias.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.sede?.name || 'Sede'})</option>
                ))}
              </select>
            </div>

            <button type="button" className="btn" onClick={() => handleOpenOfiModal()}>
              + Registrar Nueva Oficina
            </button>
          </div>

          <div className="table-shell">
            {oficinas.length === 0 ? (
              <div className="empty-state">No hay oficinas registradas.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Oficina / Espacio</th>
                    <th>Piso / Nivel</th>
                    <th>Dependencia</th>
                    <th>Sede</th>
                    <th>Responsable Local</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {oficinas
                    .filter((o) => filterDepId === 'ALL' || String(o.dependenciaId) === String(filterDepId))
                    .map((o) => (
                      <tr key={o.id}>
                        <td><span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{o.code || '---'}</span></td>
                        <td><strong>{o.name}</strong></td>
                        <td>{o.floor || '---'}</td>
                        <td>{o.dependencia?.name || '---'}</td>
                        <td>{o.sede?.name || o.dependencia?.sede?.name || 'Sede Principal'}</td>
                        <td>{o.responsibleUser || '---'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn-ghost" onClick={() => handleOpenOfiModal(o, o.sedeId, o.dependenciaId)} style={{ padding: '0.3rem 0.6rem', marginRight: '0.3rem' }}>
                            ✏️ Editar
                          </button>
                          <button type="button" className="btn-ghost" onClick={() => handleDelete('oficinas', o.id, o.name)} style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: SEDE                                          */}
      {/* ---------------------------------------------------- */}
      {modalType === 'sede' && (
        <div className="modal-overlay" role="presentation" onClick={() => setModalType(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="section-heading">
              <div>
                <h3>{editingItem ? 'Editar Sede / Campus' : 'Registrar Nueva Sede'}</h3>
                <p>Edificios o instalaciones físicas principales de la entidad.</p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleSaveSede} style={{ marginTop: '1rem' }}>
              <div className="field full">
                <label>Nombre de la Sede *</label>
                <input
                  required
                  value={sedeForm.name}
                  onChange={(e) => setSedeForm({ ...sedeForm, name: e.target.value })}
                  placeholder="Ej: Palacio Municipal (Sede Central)"
                />
              </div>

              <div className="field">
                <label>Código Identificador</label>
                <input
                  value={sedeForm.code}
                  onChange={(e) => setSedeForm({ ...sedeForm, code: e.target.value })}
                  placeholder="Ej: SED-01"
                />
              </div>

              <div className="field">
                <label>Ciudad</label>
                <input
                  value={sedeForm.city}
                  onChange={(e) => setSedeForm({ ...sedeForm, city: e.target.value })}
                  placeholder="Ej: Yopal"
                />
              </div>

              <div className="field full">
                <label>Dirección Física</label>
                <input
                  value={sedeForm.address}
                  onChange={(e) => setSedeForm({ ...sedeForm, address: e.target.value })}
                  placeholder="Ej: Diagonal 15 No. 13-35"
                />
              </div>

              <div className="field">
                <label>Teléfono de Contacto</label>
                <input
                  value={sedeForm.phone}
                  onChange={(e) => setSedeForm({ ...sedeForm, phone: e.target.value })}
                  placeholder="Ej: 6351234"
                />
              </div>

              <div className="field">
                <label>Administrador de Sede</label>
                <input
                  value={sedeForm.managerName}
                  onChange={(e) => setSedeForm({ ...sedeForm, managerName: e.target.value })}
                  placeholder="Ej: Ing. Administrador"
                />
              </div>

              <div className="toolbar full" style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Crear Sede'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setModalType(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: DEPENDENCIA / ÁREA                           */}
      {/* ---------------------------------------------------- */}
      {modalType === 'dependencia' && (
        <div className="modal-overlay" role="presentation" onClick={() => setModalType(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="section-heading">
              <div>
                <h3>{editingItem ? 'Editar Dependencia / Área' : 'Nueva Dependencia o Secretaría'}</h3>
                <p>Divisiones operativas y secretarías de la organización.</p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleSaveDep} style={{ marginTop: '1rem' }}>
              <div className="field full">
                <label>Nombre del Área o Dependencia *</label>
                <input
                  required
                  value={depForm.name}
                  onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                  placeholder="Ej: Dirección de TIC e Innovación"
                />
              </div>

              <div className="field">
                <label>Código / Sigla</label>
                <input
                  value={depForm.code}
                  onChange={(e) => setDepForm({ ...depForm, code: e.target.value })}
                  placeholder="Ej: TIC"
                />
              </div>

              <div className="field">
                <label>Sede Perteneciente *</label>
                <select
                  value={depForm.sedeId}
                  onChange={(e) => setDepForm({ ...depForm, sedeId: e.target.value })}
                >
                  <option value="">Seleccionar Sede...</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Líder o Secretario</label>
                <input
                  value={depForm.managerName}
                  onChange={(e) => setDepForm({ ...depForm, managerName: e.target.value })}
                  placeholder="Ej: Director TIC"
                />
              </div>

              <div className="field">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  value={depForm.email}
                  onChange={(e) => setDepForm({ ...depForm, email: e.target.value })}
                  placeholder="tic@yopal.gov.co"
                />
              </div>

              <div className="toolbar full" style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Crear Dependencia'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setModalType(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: OFICINA / ESPACIO                            */}
      {/* ---------------------------------------------------- */}
      {modalType === 'oficina' && (
        <div className="modal-overlay" role="presentation" onClick={() => setModalType(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="section-heading">
              <div>
                <h3>{editingItem ? 'Editar Oficina / Espacio' : 'Registrar Nueva Oficina'}</h3>
                <p>Espacio físico exacto donde se ubican los computadores y equipos.</p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleSaveOfi} style={{ marginTop: '1rem' }}>
              <div className="field full">
                <label>Nombre de la Oficina o Espacio *</label>
                <input
                  required
                  value={ofiForm.name}
                  onChange={(e) => setOfiForm({ ...ofiForm, name: e.target.value })}
                  placeholder="Ej: Mesa de Ayuda (Piso 2)"
                />
              </div>

              <div className="field">
                <label>Dependencia / Área *</label>
                <select
                  value={ofiForm.dependenciaId}
                  onChange={(e) => {
                    const depId = e.target.value;
                    const matchedDep = dependencias.find((d) => String(d.id) === String(depId));
                    setOfiForm({
                      ...ofiForm,
                      dependenciaId: depId,
                      sedeId: matchedDep?.sedeId ? String(matchedDep.sedeId) : ofiForm.sedeId,
                    });
                  }}
                >
                  <option value="">Seleccionar Dependencia...</option>
                  {dependencias.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.sede?.name || 'Sede'})</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Sede</label>
                <select
                  value={ofiForm.sedeId}
                  onChange={(e) => setOfiForm({ ...ofiForm, sedeId: e.target.value })}
                >
                  <option value="">Seleccionar Sede...</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Piso o Nivel</label>
                <input
                  value={ofiForm.floor}
                  onChange={(e) => setOfiForm({ ...ofiForm, floor: e.target.value })}
                  placeholder="Ej: Piso 2, Ala Norte"
                />
              </div>

              <div className="field">
                <label>Código de Oficina</label>
                <input
                  value={ofiForm.code}
                  onChange={(e) => setOfiForm({ ...ofiForm, code: e.target.value })}
                  placeholder="Ej: OF-201"
                />
              </div>

              <div className="field full">
                <label>Responsable Local del Espacio</label>
                <input
                  value={ofiForm.responsibleUser}
                  onChange={(e) => setOfiForm({ ...ofiForm, responsibleUser: e.target.value })}
                  placeholder="Ej: Jherson Rivera"
                />
              </div>

              <div className="toolbar full" style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Crear Oficina'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setModalType(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
