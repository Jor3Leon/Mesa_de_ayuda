import React from 'react';

export default function AnalyticsFilters({ filters, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const selectStyle = {
    padding: '8px 32px 8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: 'white',
    color: '#334155',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    minWidth: '140px',
  };

  const labelStyle = {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: '#00D1FF',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '4px',
  };

  const inputStyle = {
    ...selectStyle,
    padding: '8px 12px',
    backgroundImage: 'none',
    minWidth: 'auto',
  };

  return (
    <div className="analytics-filters-container">
      <div className="analytics-filter-dates">
        <div className="analytics-filter-item">
          <span className="analytics-filter-label">Desde</span>
          <input
            type="date"
            className="analytics-filter-input"
            value={filters.startDate || ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
          />
        </div>
        <div className="analytics-filter-item">
          <span className="analytics-filter-label">Hasta</span>
          <input
            type="date"
            className="analytics-filter-input"
            value={filters.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>

      <div className="analytics-filter-item">
        <span className="analytics-filter-label">Departamento</span>
        <select
          className="analytics-filter-select"
          value={filters.department || 'all'}
          onChange={(e) => handleChange('department', e.target.value)}
        >
          <option value="all">IT Soporte</option>
          <option value="infraestructura">Infraestructura</option>
          <option value="desarrollo">Desarrollo</option>
          <option value="seguridad">Seguridad</option>
        </select>
      </div>

      <div className="analytics-filter-item">
        <span className="analytics-filter-label">Vista</span>
        <select
          className="analytics-filter-select"
          value={filters.viewMode || 'global'}
          onChange={(e) => handleChange('viewMode', e.target.value)}
        >
          <option value="global">Estadísticas Globales</option>
          <option value="personal">Mis Estadísticas</option>
        </select>
      </div>
    </div>
  );
}
