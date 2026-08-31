import React, { useState, useRef, useEffect, useMemo } from 'react';

export default function CategorySelector({ categoriesConfig, ticketType, value, onChange, required, disabled }) {
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

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (category) => {
    onChange(category);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selector Button */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          background: disabled ? '#f8fafc' : '#fff',
          border: isOpen ? '1px solid #3b82f6' : '1px solid #ced4da',
          borderRadius: '6px',
          padding: '0.55rem 0.75rem',
          fontSize: '0.9rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.7 : 1
        }}
      >
        <span style={{ color: value ? '#1e293b' : '#94a3b8', fontWeight: value ? 500 : 400 }}>
          {value || 'Seleccionar Categoría...'}
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
          borderRadius: '8px',
          marginTop: '6px',
          zIndex: 9999,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
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
                  borderRadius: '4px', outline: 'none' 
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}>
            {Object.keys(groupedCategories).length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No se encontraron categorías.
              </div>
            ) : (
              Object.entries(groupedCategories).map(([group, cats]) => (
                <div key={group} style={{ marginBottom: '0.25rem' }}>
                  <div style={{ 
                    padding: '0.5rem 1rem 0.25rem 1rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    color: '#000', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    {group}
                  </div>
                  {cats.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      style={{
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem', 
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: value === c.name ? '#0f172a' : '#334155',
                        background: value === c.name ? '#f1f5f9' : 'transparent',
                        fontWeight: value === c.name ? 500 : 400
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
                      <span>{c.name}</span>
                      {value === c.name && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
