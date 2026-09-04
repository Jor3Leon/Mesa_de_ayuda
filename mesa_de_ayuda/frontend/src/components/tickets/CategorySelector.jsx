import React, { useState, useRef, useEffect, useMemo } from 'react';

function resolveCategoryIcon(name, group) {
  const n = ((group || '') + ' ' + (name || '')).toLowerCase();
  if (n.includes('equipo') || n.includes('computo') || n.includes('hardware') || n.includes('laptop')) return '🖥️';
  if (n.includes('impresora') || n.includes('escáner') || n.includes('escaner') || n.includes('tinta') || n.includes('toner')) return '🖨️';
  if (n.includes('red') || n.includes('wifi') || n.includes('internet') || n.includes('conectividad')) return '📡';
  if (n.includes('mantenimiento') || n.includes('soporte') || n.includes('revision') || n.includes('revisión')) return '🛠️';
  if (n.includes('correo') || n.includes('email') || n.includes('mensaje')) return '📧';
  if (n.includes('credencial') || n.includes('usuario') || n.includes('acceso') || n.includes('contraseña') || n.includes('password')) return '🔑';
  if (n.includes('sistema') || n.includes('software') || n.includes('aplicacion') || n.includes('aplicación') || n.includes('qf') || n.includes('erp') || n.includes('universo')) return '💻';
  if (n.includes('online') || n.includes('web') || n.includes('portal')) return '🌐';
  return '📁';
}

export default function CategorySelector({ categoriesConfig, ticketType, value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Filter out irrelevant categories based on ticket type
  const filteredCategories = useMemo(() => {
    let list = categoriesConfig || [];
    if (ticketType) {
      const isSolicitud = ticketType === 'Solicitud' || ticketType === 'Petición' || ticketType === 'Requerimiento';
      list = list.filter(c => {
        if (isSolicitud) {
          return c.ticketType === 'Solicitud' || c.ticketType === 'Petición' || c.ticketType === 'Requerimiento';
        }
        return c.ticketType === ticketType;
      });
    }
    
    // Filter by search
    if (searchTerm.trim()) {
      list = list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [categoriesConfig, ticketType, searchTerm]);

  // Group the categories
  const groupedCategories = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => {
      const g = cat.group || 'General';
      if (!acc[g]) acc[g] = [];
      acc[g].push(cat);
      return acc;
    }, {});
  }, [filteredCategories]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      if (!prev) setSearchTerm('');
      return !prev;
    });
  };

  const handleSelect = (category) => {
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selector Button */}
      <div 
        onClick={handleToggle}
        style={{
          background: disabled ? '#f8fafc' : '#fff',
          border: isOpen ? '1px solid #002D62' : '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.88rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '0 0 0 3px rgba(0, 209, 255, 0.15)' : 'none',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.7 : 1
        }}
      >
        <span style={{ color: value ? '#0f172a' : '#94a3b8', fontWeight: value ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {value ? (
            <>
              <span>{resolveCategoryIcon(value, '')}</span>
              <span>{value}</span>
            </>
          ) : (
            'Seleccionar Categoría...'
          )}
        </span>
        <svg 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#64748b' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          marginTop: '6px',
          zIndex: 9999,
          boxShadow: '0 10px 25px -5px rgba(0, 45, 98, 0.15), 0 8px 10px -6px rgba(0, 45, 98, 0.1)',
          maxHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Search Input */}
          <div style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <div style={{ position: 'relative' }}>
              <svg 
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar categoría..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{ 
                  width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', 
                  fontSize: '0.85rem', border: '1px solid #cbd5e1', 
                  borderRadius: '8px', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.35rem 0' }}>
            {Object.keys(groupedCategories).length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No se encontraron categorías.
              </div>
            ) : (
              Object.entries(groupedCategories).map(([group, cats]) => (
                <div key={group} style={{ marginBottom: '0.35rem' }}>
                  <div style={{ 
                    padding: '0.45rem 1rem 0.25rem 1rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    color: '#002D62', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}>
                    <span>{resolveCategoryIcon('', group)}</span>
                    <span>{group}</span>
                  </div>

                  {cats.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      style={{
                        padding: '0.5rem 1rem 0.5rem 1.75rem', 
                        fontSize: '0.85rem', 
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: value === c.name ? '#002D62' : '#334155',
                        background: value === c.name ? '#f0f9ff' : 'transparent',
                        fontWeight: value === c.name ? 700 : 400,
                        transition: 'all 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (value !== c.name) {
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (value !== c.name) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{resolveCategoryIcon(c.name, c.group)}</span>
                        <span>{c.name}</span>
                      </span>
                      {value === c.name && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#002D62" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
