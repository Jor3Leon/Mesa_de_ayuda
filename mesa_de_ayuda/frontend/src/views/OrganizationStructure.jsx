import { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

export default function OrganizationStructure() {
  const [treeData, setTreeData] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [stats, setStats] = useState({ totalSedes: 0, totalDependencias: 0, totalOficinas: 0, totalAssets: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({});
  const [expandedAssets, setExpandedAssets] = useState({});

  // Modals state
  const [modalType, setModalType] = useState(null); // 'sede' | 'dependencia' | 'oficina'
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Forms state
  const [sedeForm, setSedeForm] = useState({ name: '', code: '', address: '', city: '', phone: '', managerName: '' });
  const [depForm, setDepForm] = useState({ name: '', code: '', sedeId: '', managerName: '', email: '' });
  const [ofiForm, setOfiForm] = useState({ name: '', code: '', sedeId: '', dependenciaId: '', floor: '', responsibleUser: '' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [treeRes, sedesRes, depsRes, ofisRes] = await Promise.all([
        apiRequest('/organization-structure').catch(() => ({ tree: [], stats: {} })),
        apiRequest('/organization-structure/sedes').catch(() => []),
        apiRequest('/organization-structure/dependencias').catch(() => []),
        apiRequest('/organization-structure/oficinas').catch(() => []),
      ]);

      const tree = treeRes?.tree || [];
      const sedesList = Array.isArray(sedesRes) ? sedesRes : [];
      const depsList = Array.isArray(depsRes) ? depsRes : [];
      const ofisList = Array.isArray(ofisRes) ? ofisRes : [];

      setTreeData(tree);
      setStats(treeRes?.stats || { 
        totalSedes: sedesList.length, 
        totalDependencias: depsList.length, 
        totalOficinas: ofisList.length, 
        totalAssets: 0 
      });
      setSedes(sedesList);
      setDependencias(depsList);

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
      setError(err.message || 'Error al sincronizar estructura organizacional.');
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

  const toggleAssetList = (nodeKey) => {
    setExpandedAssets((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
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
        city: sede.city || '',
        phone: sede.phone || '',
        managerName: sede.managerName || '',
      });
    } else {
      setSedeForm({ name: '', code: '', address: '', city: '', phone: '', managerName: '' });
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
    if (!window.confirm(`¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
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

  // Filtered tree logic
  const filteredTree = useMemo(() => {
    if (!search.trim()) return treeData;
    const q = search.toLowerCase();

    return treeData
      .map((sede) => {
        const sedeMatch = sede.name?.toLowerCase().includes(q) || sede.code?.toLowerCase().includes(q) || sede.address?.toLowerCase().includes(q);

        const filteredDeps = (sede.dependencias || [])
          .map((dep) => {
            const depMatch = dep.name?.toLowerCase().includes(q) || dep.code?.toLowerCase().includes(q);
            const filteredOfis = (dep.oficinas || []).filter(
              (ofi) =>
                ofi.name?.toLowerCase().includes(q) ||
                ofi.code?.toLowerCase().includes(q) ||
                ofi.floor?.toLowerCase().includes(q) ||
                ofi.responsibleUser?.toLowerCase().includes(q)
            );

            if (depMatch || filteredOfis.length > 0) {
              return { ...dep, oficinas: filteredOfis.length > 0 ? filteredOfis : dep.oficinas };
            }
            return null;
          })
          .filter(Boolean);

        if (sedeMatch || filteredDeps.length > 0) {
          return { ...sede, dependencias: filteredDeps.length > 0 ? filteredDeps : sede.dependencias };
        }
        return null;
      })
      .filter(Boolean);
  }, [treeData, search]);

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
              Estructura Organizacional & Ubicaciones
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#cbd5e1' }}>
              Jerarquía corporativa de 3 niveles: Sedes, Dependencias y Oficinas físicas para localización exacta de Activos TI.
            </p>
          </div>
        </div>
      </div>

      {/* 📊 ENTERPRISE KPI METRICS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* KPI 1: Sedes */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sedes / Campus
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalSedes}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600', marginTop: '0.2rem' }}>
              Edificios e instalaciones
            </div>
          </div>
        </div>

        {/* KPI 2: Dependencias */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7c3aed'
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dependencias / Áreas
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalDependencias}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>
              Secretarías y direcciones
            </div>
          </div>
        </div>

        {/* KPI 3: Oficinas */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
              <path d="M2 20h20" />
              <path d="M14 12v.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Oficinas & Espacios
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalOficinas}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>
              Puntos físicos de activos
            </div>
          </div>
        </div>

        {/* KPI 4: Activos TI */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d97706'
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Activos TI Vinculados
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalAssets}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>
              Hardware inventariado
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK & ALERTS */}
      {feedback && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {feedback}
          </div>
          <button onClick={() => setFeedback('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: '700' }}>✕</button>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: '700' }}>✕</button>
        </div>
      )}

      {/* 🧭 SEARCH & FILTER BAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '0.65rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Navigation Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: '700',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)',
              border: 'none',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            Árbol Jerárquico Visual
          </div>
        </div>

        {/* Quick Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: '1', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '380px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por sede, área, oficina o responsable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#f8fafc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleOpenSedeModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#002D62',
                color: '#ffffff',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.8rem',
                border: '1px solid rgba(0, 209, 255, 0.4)',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 45, 98, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              + Sede
            </button>

            <button
              type="button"
              onClick={() => handleOpenDepModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#f5f3ff',
                color: '#6d28d9',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.8rem',
                border: '1px solid #ddd6fe',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              + Dependencia
            </button>

            <button
              type="button"
              onClick={() => handleOpenOfiModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.8rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              + Oficina
            </button>
          </div>
        </div>
      </div>

      {/* 📦 ÁRBOL VISUAL */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Tree Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
              Mostrando <strong style={{ color: '#0f172a' }}>{filteredTree.length}</strong> Sedes estructuradas
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={expandAll}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📂 Expandir Todo
              </button>
              <button
                onClick={collapseAll}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📁 Colapsar Todo
              </button>
            </div>
          </div>

          {/* EMPTY STATE */}
          {filteredTree.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              background: '#f8fafc',
              borderRadius: '14px',
              border: '2px dashed #cbd5e1'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                {search ? 'No se encontraron resultados para la búsqueda' : 'No hay Sedes ni Estructura Registrada'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                Comienza registrando tu primera sede institucional (ej: Palacio Municipal, Datacenter o Sede Central) para estructurar áreas y oficinas de activos TI.
              </p>
              <button
                onClick={() => handleOpenSedeModal()}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
                }}
              >
                + Registrar Primera Sede
              </button>
            </div>
          )}

          {/* TREE ITEMS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredTree.map((sede) => {
              const isSedeExpanded = expandedNodes[`sede-${sede.id}`];
              return (
                <div
                  key={sede.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* SEDE HEADER BAR */}
                  <div style={{
                    background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    borderBottom: isSedeExpanded ? '1px solid #e2e8f0' : 'none'
                  }}>
                    <div
                      onClick={() => toggleNode(`sede-${sede.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: '1', minWidth: '240px' }}
                    >
                      <span style={{ fontSize: '1rem', color: '#64748b', transition: 'transform 0.2s', transform: isSedeExpanded ? 'rotate(90deg)' : 'none' }}>
                        ▶
                      </span>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700'
                      }}>
                        🏛️
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>{sede.name}</span>
                          {sede.code && (
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#e2e8f0', color: '#334155' }}>
                              {sede.code}
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#ecfdf5', color: '#047857', fontWeight: '600' }}>
                            {sede.city || 'Principal'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                          📍 {sede.address || 'Sin dirección registrada'} {sede.managerName && `• Responsable: ${sede.managerName}`}
                        </div>
                      </div>
                    </div>

                    {/* Sede Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '9999px',
                        background: '#fffbeb',
                        border: '1px solid #fef3c7',
                        color: '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        💻 {sede.assetCount || 0} Activos TI
                      </span>

                      <button
                        onClick={() => handleOpenDepModal(null, sede.id)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        + Dependencia
                      </button>

                      <button
                        onClick={() => handleOpenSedeModal(sede)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.3rem' }}
                        title="Editar Sede"
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => handleDelete('sedes', sede.id, sede.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.3rem' }}
                        title="Eliminar Sede"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* DEPENDENCIAS & OFICINAS TREE BODY */}
                  {isSedeExpanded && (
                    <div className="tree-sede-body" style={{ padding: '0.85rem 1rem 1rem 1.5rem', background: '#fafafa' }}>
                      {(sede.dependencias || []).length === 0 && (sede.oficinasDirectas || []).length === 0 && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Esta sede no tiene dependencias registradas.</span>
                          <div style={{ marginTop: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenDepModal(null, sede.id)}
                              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              + Crear Primera Dependencia
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(sede.dependencias || []).map((dep) => {
                          const isDepExpanded = expandedNodes[`dep-${dep.id}`];
                          return (
                            <div
                              key={dep.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                overflow: 'hidden'
                              }}
                            >
                              {/* DEP HEADER */}
                              <div style={{
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                background: '#ffffff',
                                borderBottom: isDepExpanded ? '1px solid #f1f5f9' : 'none'
                              }}>
                                <div
                                  onClick={() => toggleNode(`dep-${dep.id}`)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flex: '1' }}
                                >
                                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', transform: isDepExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                                    ▶
                                  </span>
                                  <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    📁
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>
                                      {dep.name} {dep.code && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>({dep.code})</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      👤 {dep.managerName || 'Sin jefe asignado'} {dep.email && `• ✉️ ${dep.email}`}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
                                    🚪 {(dep.oficinas || []).length} Oficinas
                                  </span>
                                  <button
                                    onClick={() => handleOpenOfiModal(null, sede.id, dep.id)}
                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                                  >
                                    + Oficina
                                  </button>
                                  <button onClick={() => handleOpenDepModal(dep, sede.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>✏️</button>
                                  <button onClick={() => handleDelete('dependencias', dep.id, dep.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
                                </div>
                              </div>

                              {/* OFICINAS LIST CONTAINER */}
                              {isDepExpanded && (
                                <div className="tree-dep-body" style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                                  {(dep.oficinas || []).length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                      No hay oficinas creadas en esta dependencia.{' '}
                                      <button
                                        onClick={() => handleOpenOfiModal(null, sede.id, dep.id)}
                                        style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}
                                      >
                                        + Agregar Oficina
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                      {dep.oficinas.map((ofi) => {
                                        const isAssetDrawerOpen = expandedAssets[`ofi-${ofi.id}`];
                                        return (
                                          <div
                                            key={ofi.id}
                                            style={{
                                              background: '#ffffff',
                                              border: '1px solid #e2e8f0',
                                              borderRadius: '8px',
                                              padding: '0.75rem 0.85rem',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1rem' }}>🚪</span>
                                                <div>
                                                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }}>{ofi.name}</div>
                                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {ofi.floor ? `🏢 ${ofi.floor}` : '🏢 Sin piso'} {ofi.responsibleUser && `• 👤 ${ofi.responsibleUser}`}
                                                  </div>
                                                </div>
                                              </div>
                                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button onClick={() => handleOpenOfiModal(ofi, sede.id, dep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>✏️</button>
                                                <button onClick={() => handleDelete('oficinas', ofi.id, ofi.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                                              </div>
                                            </div>

                                            {/* IT Asset Badge Drawer Button */}
                                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: ofi.assetCount > 0 ? '#059669' : '#94a3b8' }}>
                                                💻 {ofi.assetCount || 0} Activos en sala
                                              </span>
                                              {ofi.assetCount > 0 && (
                                                <button
                                                  onClick={() => toggleAssetList(`ofi-${ofi.id}`)}
                                                  style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
                                                >
                                                  {isAssetDrawerOpen ? 'Ocultar' : 'Ver Activos'}
                                                </button>
                                              )}
                                            </div>

                                            {/* Expandable Asset List */}
                                            {isAssetDrawerOpen && ofi.assets && ofi.assets.length > 0 && (
                                              <div style={{ marginTop: '0.5rem', background: '#f8fafc', borderRadius: '6px', padding: '0.5rem', fontSize: '0.75rem' }}>
                                                {ofi.assets.map((asset) => (
                                                  <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{asset.hostname}</span>
                                                    <span style={{ color: '#64748b' }}>{asset.deviceType || 'Equipo'}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* 🛠️ MODALS (SEDE, DEPENDENCIA, OFICINA) */}
      {modalType && (
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
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>
                  {modalType === 'sede' ? '🏛️' : modalType === 'dependencia' ? '📁' : '🚪'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                  {editingItem ? 'Editar' : 'Registrar'} {modalType === 'sede' ? 'Sede / Campus' : modalType === 'dependencia' ? 'Dependencia / Área' : 'Oficina & Espacio'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={modalType === 'sede' ? handleSaveSede : modalType === 'dependencia' ? handleSaveDep : handleSaveOfi} style={{ padding: '1.5rem' }}>
              
              {/* SEDE FORM FIELDS */}
              {modalType === 'sede' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                      Nombre de la Sede *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Palacio Municipal (Sede Central)"
                      value={sedeForm.name}
                      onChange={(e) => setSedeForm({ ...sedeForm, name: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Código / Sigla
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: SED-01"
                        value={sedeForm.code}
                        onChange={(e) => setSedeForm({ ...sedeForm, code: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Ciudad
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Ciudad Principal"
                        value={sedeForm.city}
                        onChange={(e) => setSedeForm({ ...sedeForm, city: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                      Dirección Física
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Diagonal 15 No. 13-35"
                      value={sedeForm.address}
                      onChange={(e) => setSedeForm({ ...sedeForm, address: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Teléfono / Extensión
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 6358000 Ext 101"
                        value={sedeForm.phone}
                        onChange={(e) => setSedeForm({ ...sedeForm, phone: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Administrador de Sede
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Ing. Mario Gómez"
                        value={sedeForm.managerName}
                        onChange={(e) => setSedeForm({ ...sedeForm, managerName: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DEPENDENCIA FORM FIELDS */}
              {modalType === 'dependencia' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                      Sede Perteneciente *
                    </label>
                    <select
                      required
                      value={depForm.sedeId}
                      onChange={(e) => setDepForm({ ...depForm, sedeId: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    >
                      <option value="">Seleccionar Sede</option>
                      {sedes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                      Nombre de la Dependencia / Secretaría *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Dirección de TIC / Secretaría de Hacienda"
                      value={depForm.name}
                      onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Código / Sigla
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: TIC-01"
                        value={depForm.code}
                        onChange={(e) => setDepForm({ ...depForm, code: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Jefe / Director de Área
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Lic. Carlos Pérez"
                        value={depForm.managerName}
                        onChange={(e) => setDepForm({ ...depForm, managerName: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                      Correo Institucional de Contacto
                    </label>
                    <input
                      type="email"
                      placeholder="Ej: contacto@empresa.com"
                      value={depForm.email}
                      onChange={(e) => setDepForm({ ...depForm, email: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* OFICINA FORM FIELDS */}
              {modalType === 'oficina' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Sede *
                      </label>
                      <select
                        required
                        value={ofiForm.sedeId}
                        onChange={(e) => setOfiForm({ ...ofiForm, sedeId: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      >
                        <option value="">Seleccionar Sede</option>
                        {sedes.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Dependencia
                      </label>
                      <select
                        value={ofiForm.dependenciaId}
                        onChange={(e) => setOfiForm({ ...ofiForm, dependenciaId: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      >
                        <option value="">Oficina Directa de Sede</option>
                        {dependencias
                          .filter((d) => !ofiForm.sedeId || String(d.sedeId) === String(ofiForm.sedeId))
                          .map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                      Nombre de la Oficina o Espacio Físico *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Mesa de Ayuda / Sala de Servidores / Ventanilla Única"
                      value={ofiForm.name}
                      onChange={(e) => setOfiForm({ ...ofiForm, name: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Piso / Nivel
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Piso 2 / Sótano / Bloque B"
                        value={ofiForm.floor}
                        onChange={(e) => setOfiForm({ ...ofiForm, floor: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>
                        Responsable Local
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Ing. Jherson Rivera"
                        value={ofiForm.responsibleUser}
                        onChange={(e) => setOfiForm({ ...ofiForm, responsibleUser: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
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
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
