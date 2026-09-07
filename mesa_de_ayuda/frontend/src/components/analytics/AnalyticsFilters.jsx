import React from 'react';

/**
 * AnalyticsFilters - Barra de filtros unificada para Analítica
 * Diseño estético homologado con el módulo de Dashboard.
 * Filtros activos: Desde, Hasta, Tipo de Ticket, Técnico, Exportar PDF.
 */
export default function AnalyticsFilters({ 
  dateRange,
  onDateRangeChange,
  ticketType,
  onTicketTypeChange,
  technicians = [],
  selectedTechId,
  onTechnicianChange,
  onExportPdf,
  isExporting = false
}) {
  return (
    <div className="dashboard-toolbar-container" style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '1.15rem 1.5rem',
      marginBottom: '1.75rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '14px'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px' }}>
        {/* Rango de Fechas: Desde */}
        <div>
          <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Desde
          </span>
          <input
            type="date"
            className="dashboard-toolbar-input"
            value={dateRange?.startDate || ''}
            onChange={(e) => onDateRangeChange?.('startDate', e.target.value)}
            style={{
              padding: '7px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Rango de Fechas: Hasta */}
        <div>
          <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Hasta
          </span>
          <input
            type="date"
            className="dashboard-toolbar-input"
            value={dateRange?.endDate || ''}
            onChange={(e) => onDateRangeChange?.('endDate', e.target.value)}
            style={{
              padding: '7px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Tipo de Ticket */}
        <div>
          <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Tipo de Ticket
          </span>
          <select
            className="dashboard-toolbar-select"
            value={ticketType || 'all'}
            onChange={(e) => onTicketTypeChange?.(e.target.value)}
            style={{
              padding: '7px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              minWidth: '220px'
            }}
          >
            <option value="all">Todos (Incidencias & Solicitudes)</option>
            <option value="Incidencia">Incidencias</option>
            <option value="Solicitud">Solicitudes</option>
          </select>
        </div>

        {/* Técnico */}
        <div>
          <span className="dashboard-toolbar-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#002D62', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Técnico
          </span>
          <select
            className="dashboard-toolbar-select"
            value={selectedTechId || ''}
            disabled={technicians.length <= 1}
            onChange={(e) => onTechnicianChange?.(e.target.value)}
            style={{
              padding: '7px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              outline: 'none',
              cursor: technicians.length <= 1 ? 'not-allowed' : 'pointer',
              minWidth: '220px',
              opacity: technicians.length <= 1 ? 0.85 : 1
            }}
          >
            {technicians.length > 1 && (
              <option value="all">Todos los Técnicos</option>
            )}
            {technicians.map((t) => (
              <option key={t.id} value={String(t.id)}>
                👤 {t.name} ({t.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botón Exportar PDF */}
      {onExportPdf && (
        <div>
          <button
            type="button"
            className="dashboard-export-btn"
            onClick={onExportPdf}
            disabled={isExporting}
            style={{
              background: 'linear-gradient(135deg, #00D1FF 0%, #0284c7 100%)',
              color: '#001D40',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 209, 255, 0.35)',
              transition: 'transform 0.15s ease',
              height: '36px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => !isExporting && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => !isExporting && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isExporting ? 'Generando PDF...' : '📄 Exportar Informe (PDF)'}
          </button>
        </div>
      )}
    </div>
  );
}
