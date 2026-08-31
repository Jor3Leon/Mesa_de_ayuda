import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../lib/api';

const TICKET_TYPES = [
  { key: 'Incidencia', label: 'INCIDENCIAS', singular: 'Incidencia', icon: '🚨' },
  { key: 'Solicitud', label: 'SOLICITUD', singular: 'Solicitud', icon: '📋' },
];

export const ICON_CATEGORIES = [
  {
    title: '🖥️ Equipos & Dispositivos',
    icons: ['🖥️', '💻', '📱', '⌨️', '🖱️', '💾', '🔌', '🔋', '📺', '🎧', '🖲️', '🕹️'],
  },
  {
    title: '📡 Redes & Conectividad',
    icons: ['📡', '🌐', '📶', '🖧', '🛰️', '🔗', '☁️', '🚀', '📍', '🌍', '🗺️'],
  },
  {
    title: '🖨️ Impresión & Periféricos',
    icons: ['🖨️', '📠', '📄', '📑', '📦', '📷', '📽️', '🏷️', '🔖', '🗂️'],
  },
  {
    title: '🛠️ Mantenimiento & Soporte',
    icons: ['🛠️', '🔧', '🔨', '⚙️', '🔩', '🧹', '🛡️', '⚡', '🩹', '🧰', '🪛'],
  },
  {
    title: '📂 Sistemas & Software',
    icons: ['💻', '📂', '📁', '🗄️', '📊', '📝', '💿', '🧩', '📈', '📋', '🗃️'],
  },
  {
    title: '🔑 Seguridad & Cuentas',
    icons: ['🔑', '🔒', '👤', '👥', '🆔', '🎟️', '🛡️', '🚨', '🔐', '🪪', '🕵️'],
  },
  {
    title: '📧 Comunicaciones & General',
    icons: ['📧', '✉️', '💬', '📞', '📢', '🔔', '⭐', '💡', '📌', '✨', '🏷️'],
  },
];

export function resolveSubgroupIcon(subName, customIcon) {
  if (customIcon) return customIcon;
  const n = (subName || '').toLowerCase().trim();
  if (n.includes('equipo') || n.includes('computo') || n.includes('hardware') || n.includes('laptop')) return '🖥️';
  if (n.includes('impresora') || n.includes('escáner') || n.includes('escaner') || n.includes('tinta') || n.includes('toner')) return '🖨️';
  if (n.includes('red') || n.includes('wifi') || n.includes('internet') || n.includes('conectividad')) return '📡';
  if (n.includes('mantenimiento') || n.includes('soporte') || n.includes('revision') || n.includes('revisión')) return '🛠️';
  if (n.includes('correo') || n.includes('email') || n.includes('mensaje')) return '📧';
  if (n.includes('credencial') || n.includes('usuario') || n.includes('acceso') || n.includes('contraseña') || n.includes('password')) return '🔑';
  if (n.includes('sistema') || n.includes('software') || n.includes('aplicacion') || n.includes('aplicación') || n.includes('qf') || n.includes('erp') || n.includes('universo')) return '💻';
  if (n.includes('online') || n.includes('web') || n.includes('portal')) return '🌐';
  if (n.includes('infraestructura')) return '🏗️';
  return '📁';
}

function isMatchingType(catType, targetType) {
  if (targetType === 'Incidencia') {
    return catType === 'Incidencia';
  }
  if (targetType === 'Solicitud') {
    return catType === 'Solicitud' || catType === 'Petición' || catType === 'Requerimiento';
  }
  return false;
}

// Reusable Icon Picker Component
function IconPicker({ selectedIcon, onSelectIcon }) {
  const [activeCatIdx, setActiveCatIdx] = useState(0);

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#002D62', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🎨 Personalizar Icono:</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Seleccionado:</span>
          <span style={{ fontSize: '1.2rem', background: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '8px', border: '1.5px solid #00D1FF' }}>
            {selectedIcon || '🏷️'}
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
        {ICON_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.title}
            type="button"
            onClick={() => setActiveCatIdx(idx)}
            style={{
              fontSize: '0.72rem',
              fontWeight: activeCatIdx === idx ? '700' : '500',
              background: activeCatIdx === idx ? '#002D62' : '#ffffff',
              color: activeCatIdx === idx ? '#ffffff' : '#475569',
              border: activeCatIdx === idx ? '1px solid #002D62' : '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.22rem 0.5rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Grid of Icons in selected category */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: '0.35rem', background: '#ffffff', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        {ICON_CATEGORIES[activeCatIdx].icons.map((ic) => {
          const isSelected = selectedIcon === ic;
          return (
            <button
              key={ic}
              type="button"
              onClick={() => onSelectIcon(ic)}
              style={{
                fontSize: '1.25rem',
                background: isSelected ? '#e0f8ff' : 'transparent',
                border: isSelected ? '2px solid #00D1FF' : '1px solid transparent',
                borderRadius: '8px',
                padding: '0.3rem 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.15)' : 'none',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              title={`Seleccionar ${ic}`}
            >
              {ic}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Solicitud');

  // Modal 1: Nueva Categoría Principal (Grupo Temático)
  const [showMainCategoryModal, setShowMainCategoryModal] = useState(false);
  const [mainCatForm, setMainCatForm] = useState({
    name: '',
    ticketType: 'Solicitud',
    icon: '📁',
    firstItemName: 'General',
    sla: '4 horas',
  });

  // Modal 2: Nueva Subcategoría / Ítem (Directo desde la tarjeta)
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcatForm, setSubcatForm] = useState({
    mainGroup: '',
    subpanel: '',
    name: '',
    ticketType: 'Solicitud',
    icon: '🖥️',
    sla: '4 horas',
    isActive: true,
  });

  // Modal 3: Edición de Categoría existente
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    group: '',
    ticketType: 'Solicitud',
    icon: '💻',
    sla: '4 horas',
    isActive: true,
  });

  const [saving, setSaving] = useState(false);

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

  // --- Handlers para Modal 1: Nueva Categoría Principal ---
  function handleOpenMainCategoryModal() {
    setMainCatForm({
      name: '',
      ticketType: activeTab,
      icon: '📁',
      firstItemName: '',
      sla: '4 horas',
    });
    setFeedback('');
    setError('');
    setShowMainCategoryModal(true);
  }

  async function handleCreateMainCategory(e) {
    e.preventDefault();
    if (!mainCatForm.name.trim()) {
      setError('El nombre de la categoría principal es obligatorio.');
      return;
    }
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      const itemName = mainCatForm.firstItemName.trim() || 'Servicio General';
      const created = await apiRequest('/categories', {
        method: 'POST',
        body: {
          group: mainCatForm.name.trim(),
          name: itemName,
          ticketType: mainCatForm.ticketType,
          icon: mainCatForm.icon,
          sla: mainCatForm.sla,
          isActive: true,
        },
      });
      setCategories((prev) => [...prev, created]);
      setFeedback(`Categoría principal "${mainCatForm.name}" creada exitosamente.`);
      setShowMainCategoryModal(false);
    } catch (err) {
      setError('Error al crear categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Handlers para Modal 2: Nueva Subcategoría ---
  function handleOpenSubcategoryModal(mainGroupName, defaultSubpanel = '') {
    const autoIcon = resolveSubgroupIcon(defaultSubpanel || mainGroupName);
    setSubcatForm({
      mainGroup: mainGroupName,
      subpanel: defaultSubpanel,
      name: '',
      ticketType: activeTab,
      icon: autoIcon,
      sla: '4 horas',
      isActive: true,
    });
    setFeedback('');
    setError('');
    setShowSubcategoryModal(true);
  }

  async function handleCreateSubcategory(e) {
    e.preventDefault();
    if (!subcatForm.name.trim()) {
      setError('El nombre de la subcategoría es obligatorio.');
      return;
    }
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      let finalGroup = subcatForm.mainGroup;
      if (subcatForm.subpanel.trim()) {
        finalGroup = `${subcatForm.mainGroup} - ${subcatForm.subpanel.trim()}`;
      }

      const created = await apiRequest('/categories', {
        method: 'POST',
        body: {
          group: finalGroup,
          name: subcatForm.name.trim(),
          ticketType: subcatForm.ticketType,
          icon: subcatForm.icon,
          sla: subcatForm.sla,
          isActive: subcatForm.isActive,
        },
      });
      setCategories((prev) => [...prev, created]);
      setFeedback(`Subcategoría "${subcatForm.name}" agregada exitosamente a ${subcatForm.mainGroup}.`);
      setShowSubcategoryModal(false);
    } catch (err) {
      setError('Error al crear subcategoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Handlers para Modal 3: Edición ---
  function handleOpenEditModal(category) {
    setEditForm({
      id: category.id,
      name: category.name,
      group: category.group || '',
      ticketType: isMatchingType(category.ticketType, 'Solicitud') ? 'Solicitud' : 'Incidencia',
      icon: category.icon || resolveSubgroupIcon(category.name, category.group),
      sla: category.sla || '4 horas',
      isActive: category.isActive !== false,
    });
    setFeedback('');
    setError('');
    setShowEditModal(true);
  }

  async function handleUpdateCategory(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      const updated = await apiRequest(`/categories/${editForm.id}`, {
        method: 'PUT',
        body: editForm,
      });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setFeedback(`Categoría "${editForm.name}" actualizada.`);
      setShowEditModal(false);
    } catch (err) {
      setError('Error al actualizar: ' + err.message);
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
      const matchesTab = isMatchingType(c.ticketType, activeTab);
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.group?.toLowerCase().includes(q) || c.sla?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [categories, activeTab, search]);

  // Hierarchical grouping matching exactly the official structure
  const structuredHierarchy = useMemo(() => {
    const mainGroupsMap = {};

    // Defined official order of main groups
    const order = [
      'Sistemas de la Información',
      'Credenciales de Acceso',
      'Soporte Universo Online',
      'Infraestructura',
      'Correo Institucional',
    ];

    filteredCategories.forEach((cat) => {
      const g = (cat.group || 'General').trim();
      let mainKey = g;
      let subKey = null;

      if (g.startsWith('Infraestructura')) {
        mainKey = 'Infraestructura';
        const parts = g.split(' - ');
        subKey = parts[1] || 'Equipos';
      } else if (g === 'Plan de Mantenimiento') {
        mainKey = 'Infraestructura';
        subKey = 'Plan de Mantenimiento';
      } else if (g.includes(' - ')) {
        const parts = g.split(' - ');
        mainKey = parts[0];
        subKey = parts[1];
      }

      if (!mainGroupsMap[mainKey]) {
        mainGroupsMap[mainKey] = {
          name: mainKey,
          hasSubgroups: mainKey === 'Infraestructura' || Boolean(subKey),
          directItems: [],
          subgroups: {},
        };
      }

      if (mainGroupsMap[mainKey].hasSubgroups && subKey) {
        if (!mainGroupsMap[mainKey].subgroups[subKey]) {
          mainGroupsMap[mainKey].subgroups[subKey] = [];
        }
        mainGroupsMap[mainKey].subgroups[subKey].push(cat);
      } else {
        mainGroupsMap[mainKey].directItems.push(cat);
      }
    });

    // Sort by official order
    const list = Object.values(mainGroupsMap);
    list.sort((a, b) => {
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [filteredCategories]);

  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const groupsCount = structuredHierarchy.length;

  const renderCategoryItem = (cat) => {
    const isActive = cat.isActive !== false;
    return (
      <div
        key={cat.id}
        style={{
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
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
        onMouseLeave={(e) => { if (isActive) e.currentTarget.style.borderColor = '#e2e8f0'; }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '1.05rem' }}>{cat.icon || resolveSubgroupIcon(cat.name)}</span>
            <strong style={{ color: '#0f172a', fontSize: '0.88rem', wordBreak: 'break-word' }}>
              {cat.name}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '0.12rem 0.45rem',
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
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
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
            onClick={() => handleOpenEditModal(cat)}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              color: '#002D62',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
            title="Editar subcategoría"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => handleDelete(cat.id, cat.name)}
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
            title="Eliminar subcategoría"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  };

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
              Gestión modular de categorías principales, creación directa de subcategorías y tiempos de respuesta.
            </p>
          </div>
        </div>

        {/* Botón Independiente: Nueva Categoría Principal */}
        <button
          onClick={handleOpenMainCategoryModal}
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
          Nueva Categoría Principal
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
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', border: '1px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Categorías</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>{categories.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginTop: '0.2rem' }}>En 2 tipologías de servicio</div>
          </div>
        </div>

        {/* KPI 2: Activas */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorías Activas</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>{activeCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', marginTop: '0.2rem' }}>Disponibles para radicación</div>
          </div>
        </div>

        {/* KPI 3: Grupos */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', border: '1px solid #c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grupos Principales</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>{groupsCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '600', marginTop: '0.2rem' }}>Estructura por áreas</div>
          </div>
        </div>

        {/* KPI 4: SLA */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ANS Promedio</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#002D62', lineHeight: 1.2 }}>1h - 8h</div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>Ventana de resolución</div>
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
          {TICKET_TYPES.map((t) => {
            const count = categories.filter((c) => isMatchingType(c.ticketType, t.key)).length;
            const isSelected = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: isSelected ? '#002D62' : 'transparent',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid rgba(0, 209, 255, 0.4)' : '1px solid transparent',
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 45, 98, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label} ({count})</span>
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
            placeholder={`Buscar en ${activeTab === 'Incidencia' ? 'Incidencias' : 'Solicitudes'}...`}
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

      {/* 📦 HORIZONTAL CARDS WITH DIRECT SUBCATEGORY CREATION BUTTON */}
      {loading ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#002D62', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
          Cargando catálogo oficial de categorías...
        </div>
      ) : structuredHierarchy.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '3.5rem 1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏷️</div>
          <h3 style={{ margin: '0 0 0.35rem 0', color: '#002D62', fontWeight: 800 }}>
            No hay categorías de {activeTab === 'Incidencia' ? 'Incidencias' : 'Solicitudes'}
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>
            Crea la primera categoría para clasificar tickets y establecer los tiempos de respuesta ANS.
          </p>
          <button
            onClick={handleOpenMainCategoryModal}
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
            + Crear Primera Categoría Principal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          {structuredHierarchy.map((group) => {
            const totalItemsCount = group.hasSubgroups
              ? Object.values(group.subgroups).flat().length
              : group.directItems.length;

            return (
              <div
                key={group.name}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px -2px rgba(0, 45, 98, 0.05)',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                {/* Horizontal Card Top Header */}
                <div
                  style={{
                    padding: '1.1rem 1.5rem',
                    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderBottom: '1.5px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {resolveSubgroupIcon(group.name)}
                    </span>
                    <strong style={{ color: '#002D62', fontSize: '1.05rem', fontWeight: 800 }}>
                      {group.name}:
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        background: '#e0f8ff',
                        color: '#002D62',
                        border: '1px solid rgba(0, 209, 255, 0.35)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {totalItemsCount} {totalItemsCount === 1 ? 'categoría' : 'categorías'}
                    </span>

                    {/* ➕ Botón para crear Subcategoría directamente en esta tarjeta */}
                    <button
                      type="button"
                      onClick={() => handleOpenSubcategoryModal(group.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: '#002D62',
                        color: '#ffffff',
                        border: '1px solid rgba(0, 209, 255, 0.4)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 45, 98, 0.25)',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Agregar subcategoría a ${group.name}`}
                    >
                      <span style={{ fontSize: '0.95rem', lineHeight: 1, color: '#00D1FF' }}>+</span>
                      <span>Subcategoría</span>
                    </button>
                  </div>
                </div>

                {/* Interior of Horizontal Card */}
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  {group.hasSubgroups ? (
                    /* Sub-sections layout for Infraestructura and nested groups */
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.25rem',
                      }}
                    >
                      {Object.entries(group.subgroups).map(([subName, items]) => {
                        const contextualIcon = resolveSubgroupIcon(subName);
                        return (
                          <div
                            key={subName}
                            style={{
                              background: '#f8fafc',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              padding: '1.1rem',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 800,
                                color: '#002D62',
                                fontSize: '0.92rem',
                                marginBottom: '0.75rem',
                                paddingBottom: '0.45rem',
                                borderBottom: '1.5px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>{contextualIcon}</span>
                                <span>{subName}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                                  ({items.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubcategoryModal(group.name, subName)}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '0.15rem 0.45rem',
                                    fontSize: '0.72rem',
                                    fontWeight: '700',
                                    color: '#002D62',
                                    cursor: 'pointer',
                                  }}
                                  title={`Agregar ítem a ${subName}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                              {items.map((cat) => renderCategoryItem(cat))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Direct horizontal multi-column layout for direct categories */
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                        gap: '0.75rem',
                      }}
                    >
                      {group.directItems.map((cat) => renderCategoryItem(cat))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🪟 MODAL 1: NUEVA CATEGORÍA PRINCIPAL (GRUPO) */}
      {showMainCategoryModal && (
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
          onClick={() => setShowMainCategoryModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f0f9ff',
                    color: '#002D62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid rgba(0, 209, 255, 0.4)',
                    fontSize: '1.35rem',
                  }}
                >
                  {mainCatForm.icon || '📁'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#002D62', fontWeight: '800' }}>
                    Nueva Categoría Principal
                  </h3>
                  <small style={{ color: '#64748b' }}>Crea un nuevo grupo temático independiente</small>
                </div>
              </div>
              <button
                onClick={() => setShowMainCategoryModal(false)}
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

            <form onSubmit={handleCreateMainCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Nombre de la Categoría Principal *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Seguridad Informática, Gestión Documental, etc."
                  value={mainCatForm.name}
                  onChange={(e) => setMainCatForm({ ...mainCatForm, name: e.target.value })}
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
                    value={mainCatForm.ticketType}
                    onChange={(e) => setMainCatForm({ ...mainCatForm, ticketType: e.target.value })}
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
                    <option value="Solicitud">📋 Solicitud</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    ANS Sugerido *
                  </label>
                  <select
                    value={mainCatForm.sla}
                    onChange={(e) => setMainCatForm({ ...mainCatForm, sla: e.target.value })}
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
                  </select>
                </div>
              </div>

              {/* Selector de Icono con Pool */}
              <IconPicker
                selectedIcon={mainCatForm.icon}
                onSelectIcon={(ic) => setMainCatForm({ ...mainCatForm, icon: ic })}
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Primera Subcategoría Inicial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Servicio General / Atención Técnica"
                  value={mainCatForm.firstItemName}
                  onChange={(e) => setMainCatForm({ ...mainCatForm, firstItemName: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowMainCategoryModal(false)}
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
                  {saving ? 'Creando...' : 'Crear Categoría Principal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🪟 MODAL 2: NUEVA SUBCATEGORÍA (CREACIÓN DIRECTA DESDE LA TARJETA) */}
      {showSubcategoryModal && (
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
          onClick={() => setShowSubcategoryModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f0f9ff',
                    color: '#002D62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid rgba(0, 209, 255, 0.4)',
                    fontSize: '1.35rem',
                  }}
                >
                  {subcatForm.icon || '🏷️'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#002D62', fontWeight: '800' }}>
                    Nueva Subcategoría
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    Agregando a: <strong style={{ color: '#002D62' }}>{subcatForm.mainGroup}</strong>
                  </small>
                </div>
              </div>
              <button
                onClick={() => setShowSubcategoryModal(false)}
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

            <form onSubmit={handleCreateSubcategory} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Main Group (Read only pill) */}
              <div style={{ background: '#f1f5f9', padding: '0.65rem 0.85rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Categoría Principal:</span>
                <span style={{ fontSize: '0.85rem', color: '#002D62', fontWeight: 800 }}>{subcatForm.mainGroup}</span>
              </div>

              {/* Subpanel (if applicable) */}
              {subcatForm.mainGroup === 'Infraestructura' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Subpanel / Sección de Infraestructura *
                  </label>
                  <select
                    value={subcatForm.subpanel}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      setSubcatForm({ ...subcatForm, subpanel: newSub, icon: resolveSubgroupIcon(newSub) });
                    }}
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
                    <option value="Equipos">🖥️ Equipos (Hardware / Software)</option>
                    <option value="Red">📡 Red (Internet / WiFi / Usuario)</option>
                    <option value="Impresoras/Escáneres">🖨️ Impresoras / Escáneres</option>
                    <option value="Plan de Mantenimiento">🛠️ Plan de Mantenimiento</option>
                  </select>
                </div>
              )}

              {/* Subcategory Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Nombre de la Subcategoría / Servicio *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej: Cambio de Disco Duro, Servidores, etc."
                  value={subcatForm.name}
                  onChange={(e) => setSubcatForm({ ...subcatForm, name: e.target.value })}
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

              {/* Type and SLA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Tipología *
                  </label>
                  <select
                    value={subcatForm.ticketType}
                    onChange={(e) => setSubcatForm({ ...subcatForm, ticketType: e.target.value })}
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
                    <option value="Solicitud">📋 Solicitud</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Acuerdo de Nivel de Servicio (ANS) *
                  </label>
                  <select
                    value={subcatForm.sla}
                    onChange={(e) => setSubcatForm({ ...subcatForm, sla: e.target.value })}
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
                    <option value="3 horas">⏱️ 3 horas</option>
                    <option value="4 horas">⏱️ 4 horas (Estándar)</option>
                    <option value="8 horas">📅 8 horas (1 día hábil)</option>
                    <option value="24 horas">📅 24 horas</option>
                    <option value="48 horas">📅 48 horas (2 días)</option>
                  </select>
                </div>
              </div>

              {/* Selector de Icono con Pool */}
              <IconPicker
                selectedIcon={subcatForm.icon}
                onSelectIcon={(ic) => setSubcatForm({ ...subcatForm, icon: ic })}
              />

              {/* Checkbox Activa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id="subcat-modal-isActive"
                  checked={subcatForm.isActive}
                  onChange={(e) => setSubcatForm({ ...subcatForm, isActive: e.target.checked })}
                  style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                />
                <label htmlFor="subcat-modal-isActive" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', cursor: 'pointer', margin: 0 }}>
                  Subcategoría Activa (disponible para radicar tickets)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSubcategoryModal(false)}
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
                  {saving ? 'Guardando...' : 'Crear Subcategoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🪟 MODAL 3: EDITAR SUBCATEGORÍA / CATEGORÍA */}
      {showEditModal && (
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
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f0f9ff',
                    color: '#002D62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid rgba(0, 209, 255, 0.4)',
                    fontSize: '1.35rem',
                  }}
                >
                  {editForm.icon || '🏷️'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#002D62', fontWeight: '800' }}>
                    Editar Subcategoría
                  </h3>
                  <small style={{ color: '#64748b' }}>Modificación de datos, icono y tiempos ANS</small>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
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

            <form onSubmit={handleUpdateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Nombre de la Subcategoría *
                </label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
                    Grupo / Sección *
                  </label>
                  <input
                    type="text"
                    value={editForm.group}
                    onChange={(e) => setEditForm({ ...editForm, group: e.target.value })}
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
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                    Tipología de Ticket *
                  </label>
                  <select
                    value={editForm.ticketType}
                    onChange={(e) => setEditForm({ ...editForm, ticketType: e.target.value })}
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
                    <option value="Solicitud">📋 Solicitud</option>
                  </select>
                </div>
              </div>

              {/* Selector de Icono con Pool */}
              <IconPicker
                selectedIcon={editForm.icon}
                onSelectIcon={(ic) => setEditForm({ ...editForm, icon: ic })}
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Acuerdo de Nivel de Servicio (ANS) *
                </label>
                <select
                  value={editForm.sla}
                  onChange={(e) => setEditForm({ ...editForm, sla: e.target.value })}
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
                  <option value="3 horas">⏱️ 3 horas</option>
                  <option value="4 horas">⏱️ 4 horas (Estándar)</option>
                  <option value="8 horas">📅 8 horas (1 día hábil)</option>
                  <option value="24 horas">📅 24 horas</option>
                  <option value="48 horas">📅 48 horas (2 días)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id="edit-modal-isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                />
                <label htmlFor="edit-modal-isActive" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', cursor: 'pointer', margin: 0 }}>
                  Categoría Activa (disponible para selección)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
