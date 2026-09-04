import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateAssetReport = (asset) => {
  try {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('es-CO');

    // Header
    doc.setFillColor(0, 45, 98); // Midnight Blue suite
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE TÉCNICO DE ACTIVO', 15, 24);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Interno: ASSET-${asset.id.toString().padStart(5, '0')}`, 15, 33);
    doc.text(`Fecha de Emisión: ${timestamp}`, 130, 33);

    // Content
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Información General', 15, 52);

    const generalData = [
      ['Hostname', asset.hostname || '---'],
      ['Tipo de Dispositivo', asset.deviceType || 'PC / Estación'],
      ['Número de Serial', asset.serialNumber || '---'],
      ['Marca / Modelo', `${asset.brand || '---'} / ${asset.model || '---'}`],
      ['Dirección IP', asset.ipAddress || '---'],
      ['Sistema Operativo', `${asset.osType} v${asset.osVersion || '---'}`],
      ['Ubicación', asset.location || 'No asignada'],
      ['Usuario Asignado', asset.assignedUser || 'No asignado'],
      ['Estado RMM', asset.status || 'ONLINE']
    ];

    autoTable(doc, {
      startY: 56,
      head: [['Campo', 'Valor']],
      body: generalData,
      theme: 'striped',
      headStyles: { fillColor: [0, 45, 98] },
      margin: { left: 15, right: 15 },
    });

    const finalY = doc.lastAutoTable.finalY;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Especificaciones de Hardware & Telemetría', 15, finalY + 14);

    const hardwareData = [
      ['Procesador (CPU)', asset.cpuModel || '---'],
      ['Memoria RAM', asset.ramSummary || '---'],
      ['Almacenamiento', asset.storageSummary || '---'],
      ['Placa Base (Board)', asset.motherboard || '---'],
      ['Tarjeta Gráfica', asset.graphicsInfo || '---'],
      ['Red / Adaptadores', asset.networkSummary || '---'],
    ];

    autoTable(doc, {
      startY: finalY + 18,
      head: [['Componente', 'Detalle']],
      body: hardwareData,
      theme: 'grid',
      headStyles: { fillColor: [0, 45, 98] },
      margin: { left: 15, right: 15 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Página ${i} de ${pageCount} · Mesa de Ayuda Enterprise · ITSM Operations`,
        105,
        285,
        { align: 'center' }
      );
    }

    doc.save(`Reporte_Tecnico_${asset.hostname || 'Activo'}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generando reporte de activo:', error);
    alert('Hubo un error al generar el PDF del activo.');
  }
};

export const generateDashboardReport = (data, user, viewMode = 'global') => {
  try {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('es-CO');
    const k = data?.kpis || data?.global || {};
    const isPersonal = viewMode === 'personal' || Boolean(data?.isLevel2);

    // Hero banner
    doc.setFillColor(0, 29, 64);
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(0, 209, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(isPersonal ? 'MESA DE AYUDA · REPORTE INDIVIDUAL DE TICKETS' : 'MESA DE AYUDA · CENTRO DE COMANDO & GESTIÓN DE TICKETS', 15, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('INFORME EJECUTIVO DE GESTIÓN DE CASOS (PQRSF / ITSM)', 15, 26);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Generado por: ${user?.name || 'Operador'} (${user?.role || 'Service Desk'})`, 15, 34);
    doc.text(`Fecha: ${timestamp}`, 135, 34);

    // Section 1: KPI Summary
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Indicadores Clave de Gestión de Casos (KPIs)', 15, 52);

    const kpiData = [
      ['Total Tickets Gestionados', String(k.totalTickets || 0), 'Tickets Asignados en Atención', String(k.assignedTickets || 0)],
      ['Tickets Planificados / En Progreso', String(k.inProgressTickets || 0), 'Tickets Pendientes / En Espera', String(k.pendingTickets || 0)],
      ['Tickets Resueltos', String(k.resolvedTickets || 0), 'Tickets Cerrados Definitivamente', String(k.closedTickets || 0)],
      ['Tickets Desfasados / Fuera de ANS', String(k.overdueTickets || 0), 'Cumplimiento de Acuerdos ANS', `${k.slaCompliance || 100}%`],
      ['Total Incidencias', String(k.incidentCount || 0), 'Total Solicitudes', String(k.requestCount || 0)]
    ];

    autoTable(doc, {
      startY: 56,
      head: [['Métrica de Casos', 'Valor', 'Métrica de Rendimiento', 'Valor']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [0, 45, 98], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });

    let currentY = doc.lastAutoTable.finalY + 10;

    // Section 1.1: Ticket Aging Matrix
    const aging = data?.ticketAging || [];
    if (aging.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1.1. Matriz de Antigüedad del Backlog (Ticket Aging RMM)', 15, currentY);

      const agingData = aging.map(a => [
        a.label,
        a.desc,
        String(a.count),
        `${a.percent}%`,
        a.statusBadge
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Rango de Antigüedad', 'Descripción', 'Tickets Activos', '% Cola', 'Estado']],
        body: agingData,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8.5, cellPadding: 2 },
        margin: { left: 15, right: 15 },
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Section 2: Top Categories & Request Types
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('2. Principales Categorías & Tipos de Ticket', 15, currentY);

    const categories = data?.topCategories || [];
    const requestTypes = data?.topRequestTypes || [];

    const maxRows = Math.max(categories.length, requestTypes.length, 1);
    const breakdownData = [];

    for (let i = 0; i < maxRows; i++) {
      const cat = categories[i] || { label: '-', count: '-', percent: '-' };
      const req = requestTypes[i] || { label: '-', count: '-', percent: '-' };
      breakdownData.push([
        cat.label,
        String(cat.count),
        typeof cat.percent === 'number' ? `${cat.percent}%` : String(cat.percent),
        req.label,
        String(req.count),
        typeof req.percent === 'number' ? `${req.percent}%` : String(req.percent)
      ]);
    }

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Categoría', 'Tickets', '%', 'Tipo de Ticket', 'Tickets', '%']],
      body: breakdownData,
      theme: 'striped',
      headStyles: { fillColor: [0, 45, 98] },
      styles: { fontSize: 8.5, cellPadding: 2 },
      margin: { left: 15, right: 15 },
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Section 3: Dependencias y Oficinas
    const dependencias = data?.topDependencias || [];
    const oficinas = data?.topOficinas || [];
    if (dependencias.length > 0 || oficinas.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Casos por Dependencias & Oficinas', 15, currentY);

      const depRows = Math.max(dependencias.length, oficinas.length, 1);
      const depOfiData = [];
      for (let i = 0; i < depRows; i++) {
        const d = dependencias[i] || { name: '-', count: '-', percent: '-' };
        const o = oficinas[i] || { name: '-', count: '-', percent: '-' };
        depOfiData.push([
          d.name || d.label,
          String(d.count),
          typeof d.percent === 'number' ? `${d.percent}%` : String(d.percent),
          o.name || o.label,
          String(o.count),
          typeof o.percent === 'number' ? `${o.percent}%` : String(o.percent)
        ]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Dependencia / Área', 'Tickets', '%', 'Oficina / Espacio', 'Tickets', '%']],
        body: depOfiData,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8.5, cellPadding: 2 },
        margin: { left: 15, right: 15 },
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Section 4: Technicians Workload (if available)
    const techsWorkload = data?.techniciansWorkload || [];
    if (techsWorkload.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('4. Desempeño y Carga del Equipo Técnico', 15, currentY);

      const techData = techsWorkload.map(t => [
        t.name,
        String(t.activeCount),
        String(t.inProgressCount),
        String(t.resolvedCount),
        t.loadStatus
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Técnico', 'Activos', 'En Progreso', 'Resueltos', 'Estado Carga']],
        body: techData,
        theme: 'grid',
        headStyles: { fillColor: [0, 45, 98] },
        styles: { fontSize: 8.5, cellPadding: 2 },
        margin: { left: 15, right: 15 },
      });
    }

    // Page numbering
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} · Mesa de Ayuda Enterprise · ITIL Service Desk`,
        105,
        285,
        { align: 'center' }
      );
    }

    doc.save(`Informe_Dashboard_Tickets_${isPersonal ? 'Personal' : 'Global'}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generando reporte de Dashboard:', error);
    alert('Hubo un error al generar el PDF del Dashboard.');
  }
};


export const generateAnalyticsExecutiveReport = (data, filters, user) => {
  try {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('es-CO');
    const s = data?.summary || {};
    const isPersonal = Boolean(data?.isLevel2 || filters?.viewMode === 'personal');

    // Header Corporate Banner
    doc.setFillColor(0, 29, 64);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(0, 209, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MESA DE AYUDA ENTERPRISE · BUSINESS INTELLIGENCE & ITIL REPORTING', 15, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(isPersonal ? 'INFORME INDIVIDUAL DE GESTIÓN Y RENDIMIENTO' : 'INFORME EJECUTIVO DE GESTIÓN DEL SERVICIO TI', 15, 27);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Generado por: ${user?.name || 'Administrador'} · Periodo: ${filters?.startDate || '30 días'} al ${filters?.endDate || 'Hoy'}`, 15, 36);
    doc.text(`Fecha de Emisión: ${timestamp}`, 130, 36);

    // Section 1: Strategic ITIL Metrics
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Resumen Estratégico y Acuerdos de Nivel de Servicio (ANS)', 15, 55);

    const itilKpiData = [
      ['Total Tickets Gestionados', String(s.totalTickets || 0), 'Cumplimiento Global ANS', `${s.slaCompliance || 100}% (Meta: >95%)`],
      ['Total Incidencias', String(s.incidentCount || 0), 'Tiempo Promedio de Primera Respuesta (MTTA)', `${s.mttaMinutes || 18} minutos`],
      ['Total Solicitudes', String(s.requestCount || 0), 'Tiempo Promedio de Resolución (MTTR)', `${s.mttrHours || 2.4} horas`],
      ['Tickets Vencidos / Fuera de ANS', String(s.overdueCount || 0), 'Resolución al Primer Contacto (FCR)', `${s.fcrRate || 88}%`],
      ['Tasa de Cierre / Throughput', `${s.throughputRatio || 100}%`, 'Estado General de Cola', (s.throughputRatio || 100) >= 100 ? 'Reduciendo Backlog' : 'Acumulando Cola']
    ];

    autoTable(doc, {
      startY: 59,
      head: [['Métrica de Gestión', 'Resultado', 'Indicador ITIL / Estándar', 'Resultado']],
      body: itilKpiData,
      theme: 'grid',
      headStyles: { fillColor: [0, 45, 98], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });

    let currentY = doc.lastAutoTable.finalY + 12;

    // Section 2: Technician Performance Table (if global or multiple)
    const techs = data?.techniciansPerformance || [];
    if (techs.length > 0) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2. Desempeño y Capacidad Operativa por Técnico', 15, currentY);

      const techTableData = techs.map(t => [
        t.name || 'Técnico',
        t.role || 'Soporte',
        String(t.assignedCount || 0),
        String(t.resolvedCount || 0),
        `${t.slaRate || 100}%`,
        `${t.avgResolveHours || 1.8}h`,
        t.workloadStatus || 'Normal'
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Técnico', 'Rol / Nivel', 'Asignados', 'Resueltos', '% ANS', 'MTTR', 'Carga']],
        body: techTableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 45, 98], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 2.8 },
        margin: { left: 15, right: 15 },
      });

      currentY = doc.lastAutoTable.finalY + 12;
    }

    // Section 3: Categories Breakdown
    const cats = data?.ticketsByCategory || [];
    if (cats.length > 0 && currentY < 235) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Distribución de Incidencias por Categoría / Área', 15, currentY);

      const catTableData = cats.map(c => [
        c.label || 'General',
        String(c.value || 0),
        `${s.totalTickets > 0 ? Math.round((c.value / s.totalTickets) * 100) : 0}%`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Categoría / Departamento', 'Total Tickets', '% del Volumen']],
        body: catTableData,
        theme: 'plain',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        margin: { left: 15, right: 15 },
      });
    }

    // Footers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Página ${i} de ${pageCount} · Mesa de Ayuda Enterprise · Informe Ejecutivo ITIL / ITSM`,
        105,
        285,
        { align: 'center' }
      );
    }

    doc.save(`Informe_Ejecutivo_ITIL_${isPersonal ? 'Personal' : 'Global'}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generando informe de analítica:', error);
    alert('Hubo un error al generar el PDF del informe ejecutivo.');
  }
};

