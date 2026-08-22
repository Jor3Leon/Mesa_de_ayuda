import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateAssetReport = (asset) => {
  try {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Header
    doc.setFillColor(15, 157, 58); // Color primary (verde)
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE TÉCNICO DE ACTIVO', 15, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Interno: ASSET-${asset.id.toString().padStart(5, '0')}`, 15, 33);
    doc.text(`Fecha de Emisión: ${timestamp}`, 140, 33);

    // Content
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(16);
    doc.text('Información General', 15, 55);

    const generalData = [
      ['Hostname', asset.hostname || '---'],
      ['Número de Serial', asset.serialNumber || '---'],
      ['Marca / Modelo', `${asset.brand || '---'} / ${asset.model || '---'}`],
      ['Dirección IP', asset.ipAddress || '---'],
      ['Sistema Operativo', `${asset.osType} v${asset.osVersion || '---'}`],
      ['Ubicación', asset.location || 'No asignada'],
      ['Usuario Asignado', asset.assignedUser || 'No asignado'],
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Campo', 'Valor']],
      body: generalData,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 15, right: 15 },
    });

    // doc.lastAutoTable exists after calling autoTable(doc, ...)
    const finalY = doc.lastAutoTable.finalY;

    doc.setFontSize(16);
    doc.text('Especificaciones de Hardware', 15, finalY + 15);

    const hardwareData = [
      ['Procesador (CPU)', asset.cpuModel || '---'],
      ['Memoria RAM', asset.ramSummary || '---'],
      ['Almacenamiento', asset.storageSummary || '---'],
      ['Placa Base (Board)', asset.motherboard || '---'],
      ['Tarjeta Gráfica', asset.graphicsInfo || '---'],
      ['Red / Adaptadores', asset.networkSummary || '---'],
    ];

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Componente', 'Detalle']],
      body: hardwareData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 15, right: 15 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - Generado por Mesa de Ayuda Pro (iFoxSitO)`,
        105,
        285,
        { align: 'center' }
      );
    }

    doc.save(`Reporte_Tecnico_${asset.hostname || 'Activo'}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generando reporte:', error);
    alert('Hubo un error al generar el PDF. Revisa la consola para más detalles.');
  }
};
