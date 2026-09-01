import React from 'react';

export default function AnalyticsFilters({ 
  filters, 
  onChange, 
  isLevel2 = false,
  technicians = [],
  onExportPdf,
  isExporting = false
}) {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="analytics-filters-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
      <div className="analytics-filter-dates" style={{ display: 'flex', gap: '8px' }}>
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
        <span className="analytics-filter-label">Tipo de Ticket</span>
        <select
          className="analytics-filter-select"
          value={filters.ticketType || 'all'}
          onChange={(e) => handleChange('ticketType', e.target.value)}
        >
          <option value="all">Todos (Incidencias & Solicitudes)</option>
          <option value="Incidencia">Solo Incidencias</option>
          <option value="Solicitud">Solo Solicitudes</option>
        </select>
      </div>

      <div className="analytics-filter-item">
        <span className="analytics-filter-label">Departamento</span>
        <select
          className="analytics-filter-select"
          value={filters.department || 'all'}
          onChange={(e) => handleChange('department', e.target.value)}
        >
          <option value="all">Todos los Departamentos</option>
          <option value="Soporte Técnico">Soporte Técnico</option>
          <option value="Infraestructura">Infraestructura & Redes</option>
          <option value="Desarrollo">Desarrollo & Apps</option>
          <option value="Seguridad TI">Seguridad TI</option>
          <option value="Hardware">Hardware & Periféricos</option>
        </select>
      </div>

      {!isLevel2 && filters.viewMode !== 'personal' && technicians.length > 0 && (
        <div className="analytics-filter-item">
          <span className="analytics-filter-label">Técnico</span>
          <select
            className="analytics-filter-select"
            value={filters.technicianId || 'all'}
            onChange={(e) => handleChange('technicianId', e.target.value)}
          >
            <option value="all">Todos los Técnicos</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
            ))}
          </select>
        </div>
      )}

      <div className="analytics-filter-item">
        <span className="analytics-filter-label">Vista de Alcance</span>
        <select
          className="analytics-filter-select"
          value={isLevel2 ? 'personal' : (filters.viewMode || 'global')}
          disabled={isLevel2}
          onChange={(e) => handleChange('viewMode', e.target.value)}
          style={{ opacity: isLevel2 ? 0.95 : 1 }}
          title={isLevel2 ? 'Vista fija en métricas personales para Técnico Nivel 2' : 'Seleccionar vista'}
        >
          {isLevel2 ? (
            <option value="personal">Mis Estadísticas (Nivel 2)</option>
          ) : (
            <>
              <option value="global">Estadísticas Globales</option>
              <option value="personal">Mis Estadísticas Individuales</option>
            </>
          )}
        </select>
      </div>

      {onExportPdf && (
        <div className="analytics-filter-item" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting}
            style={{
              background: 'linear-gradient(135deg, #00D1FF 0%, #0099ff 100%)',
              color: '#001D40',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 209, 255, 0.3)',
              transition: 'transform 0.15s ease',
              height: '36px'
            }}
            onMouseEnter={(e) => !isExporting && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => !isExporting && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isExporting ? 'Generando PDF...' : '📑 Exportar Informe (PDF)'}
          </button>
        </div>
      )}
    </div>
  );
}

