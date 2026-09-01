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
    const g = data?.global || {};
    const p = data?.personal || {};
    const isPersonal = viewMode === 'personal' || Boolean(data?.isLevel2);

    // Hero banner
    doc.setFillColor(0, 29, 64);
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(0, 209, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(isPersonal ? 'MESA DE AYUDA · REPORTE OPERACIONAL INDIVIDUAL' : 'MESA DE AYUDA · CENTRO DE COMANDO OPERATIVO', 15, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('RESUMEN DE TURNO OPERACIONAL', 15, 26);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Generado por: ${user?.name || 'Operador'} (${user?.role || 'Service Desk'})`, 15, 34);
    doc.text(`Fecha: ${timestamp}`, 135, 34);

    // Section 1: KPI Summary
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Indicadores Operacionales Clave (ITIL / ITSM)', 15, 52);

    const kpiData = [
      ['Tickets Abiertos / En Gestión', String(g.openTickets || 0), 'Incidentes Activos (Fallas)', String(g.incidentCount || 0)],
      ['Requerimientos Activos (Peticiones)', String(g.requestCount || 0), 'Incidentes Críticos / Emergencias', String(g.criticalTickets || 0)],
      ['Tickets Vencidos / SLA en Riesgo', String(g.overdueTickets || g.slaRiskCount || 0), 'Cumplimiento ANS Estimado', `${g.slaCompliance || 98}%`],
      ['Total Activos RMM', String(g.totalAssets || 0), 'Equipos Online / Salud RMM', `${g.onlineAssets || 0} (${g.healthScore || 100}%)`]
    ];

    autoTable(doc, {
      startY: 56,
      head: [['Métrica Operativa', 'Valor', 'Métrica de Servicio', 'Valor']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [0, 45, 98], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });

    let currentY = doc.lastAutoTable.finalY + 12;

    // Section 2: Severity and Status
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('2. Distribución de Carga por Severidad & Estado', 15, currentY);

    const prio = g.ticketsByPriority || {};
    const stats = g.ticketsByStatus || {};

    const distributionData = [
      ['Crítico / Emergencia', String(prio.CRITICAL || prio.CRITICA || 0), 'Nuevos / Ingresados', String(stats.NEW || 0)],
      ['Alta Prioridad', String(prio.HIGH || prio.ALTA || 0), 'En Progreso / Atención', String(stats.IN_PROGRESS || g.inProgressTickets || 0)],
      ['Media Prioridad', String(prio.MEDIUM || prio.MEDIA || 0), 'En Espera / Terceros', String(stats.PENDING || 0)],
      ['Baja Prioridad', String(prio.LOW || prio.BAJA || 0), 'Resueltos / Cerrados', String((stats.RESOLVED || 0) + (stats.CLOSED || 0))]
    ];

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Nivel de Prioridad', 'Cantidad', 'Estado Operacional', 'Cantidad']],
      body: distributionData,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });

    currentY = doc.lastAutoTable.finalY + 12;

    // Section 3: Recent Activity
    const activities = data?.recentActivities || [];
    if (activities.length > 0 && currentY < 230) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Registro Reciente de Intervenciones y Eventos', 15, currentY);

      const actData = activities.slice(0, 8).map(a => [
        new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        a.user || 'Sistema',
        a.action || 'Actualización',
        a.ticket?.title || `Ticket #${a.ticketId || '---'}`
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Hora', 'Usuario / Técnico', 'Acción Realizada', 'Ticket / Asunto']],
        body: actData,
        theme: 'plain',
        headStyles: { fillColor: [0, 45, 98], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2.5 },
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
        `Página ${i} de ${pageCount} · Mesa de Ayuda Enterprise · Resumen de Turno Operacional`,
        105,
        285,
        { align: 'center' }
      );
    }

    doc.save(`Resumen_Turno_${isPersonal ? 'Personal' : 'Global'}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generando reporte de turno:', error);
    alert('Hubo un error al generar el PDF de resumen operacional.');
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
    doc.text('1. Resumen Estratégico y Acuerdos de Nivel de Servicio (ANS / SLA)', 15, 55);

    const itilKpiData = [
      ['Total Tickets Gestionados', String(s.totalTickets || 0), 'Cumplimiento Global ANS (SLA)', `${s.slaCompliance || 98}% (Meta: >95%)`],
      ['Total Incidentes (Fallas)', String(s.incidentCount || 0), 'Tiempo Promedio de Primera Respuesta (MTTA)', `${s.mttaMinutes || 18} minutos`],
      ['Total Requerimientos (Solicitudes)', String(s.requestCount || 0), 'Tiempo Promedio de Resolución (MTTR)', `${s.mttrHours || 2.4} horas`],
      ['Tickets Vencidos / Fuera de ANS', String(s.overdueCount || 0), 'Resolución al Primer Contacto (FCR)', `${s.fcrRate || 88}%`]
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

