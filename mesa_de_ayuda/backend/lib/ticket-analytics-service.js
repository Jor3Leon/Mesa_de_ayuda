/**
 * TicketAnalyticsService — Servicio Centralizado de Analítica de Tickets e Indicadores ANS
 * Elimina discrepancias, números aleatorios y valores artificiales.
 * Única fuente de verdad para Dashboard y Analytics.
 */

const { calculateBusinessMinutes } = require('./business-time');
const { evaluateTicketAns, getDefaultPolicy } = require('./ans-engine');

function calculatePercentile(sortedValues, percentile) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * (percentile / 100)));
  return sortedValues[index];
}

/**
 * Obtiene métricas analíticas e indicadores de operación y gestión de tickets.
 * @param {object} prisma 
 * @param {object} options 
 * @returns {Promise<object>}
 */
async function getTicketPerformanceMetrics(prisma, options = {}) {
  const {
    organizationId = null,
    startDate = null,
    endDate = null,
    ticketType = 'all',
    category = 'all',
    priority = 'all',
    technicianId = 'all',
    status = 'all',
    viewMode = 'global',
    user = null
  } = options;

  const now = new Date();
  const orgFilter = organizationId ? { organizationId } : {};

  // 1. Rango de Fechas
  let start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let end = endDate ? new Date(endDate) : new Date(now);
  if (endDate && String(endDate).length <= 10) {
    end.setHours(23, 59, 59, 999);
  }

  // 2. Filtro Base
  const baseFilter = {
    ...orgFilter,
    createdAt: { gte: start, lte: end }
  };

  if (ticketType && ticketType !== 'all') {
    baseFilter.ticketType = ticketType;
  }
  if (category && category !== 'all') {
    baseFilter.category = category;
  }
  if (priority && priority !== 'all') {
    baseFilter.priority = priority;
  }
  if (status && status !== 'all') {
    baseFilter.status = status;
  }

  // Alcance según rol y modo de vista
  const isPersonal = viewMode === 'personal' && user;
  if (isPersonal) {
    baseFilter.OR = [
      { assignedToId: user.id },
      { secondaryAssignedToId: user.id },
      { createdById: user.id }
    ];
  } else if (technicianId && technicianId !== 'all') {
    const parsedTechId = parseInt(technicianId, 10);
    if (!isNaN(parsedTechId)) {
      baseFilter.OR = [
        { assignedToId: parsedTechId },
        { secondaryAssignedToId: parsedTechId }
      ];
    }
  }

  // 3. Consultas en Paralelo
  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    pendingTickets,
    resolvedTickets,
    closedTickets,
    unassignedTickets,
    incidentCount,
    requestCount,
    allTickets,
    activeTicketsForRadar,
    categoriesRaw,
    prioritiesRaw,
    statusesRaw,
    usersRaw,
    sedesRaw,
    dependenciasRaw,
    oficinasRaw
  ] = await Promise.all([
    prisma.ticket.count({ where: baseFilter }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'PENDING'] } } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, status: { in: ['IN_PROGRESS', 'PLANIFICADO'] } } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, status: { in: ['PENDING', 'WAITING', 'EN_ESPERA'] } } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, status: 'RESOLVED' } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, status: 'CLOSED' } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, assignedToId: null, status: { in: ['NEW', 'OPEN'] } } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, ticketType: { in: ['Incidencia', 'Incidente', 'Falla'] } } }).catch(() => 0),
    prisma.ticket.count({ where: { ...baseFilter, ticketType: { notIn: ['Incidencia', 'Incidente', 'Falla'] } } }).catch(() => 0),
    
    // Todos los tickets en el rango para cálculo estadístico fino (MTTA, MTTR, ANS)
    prisma.ticket.findMany({
      where: baseFilter,
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        ticketType: true,
        category: true,
        createdAt: true,
        assignedAt: true,
        firstResponseAt: true,
        resolvedAt: true,
        closedAt: true,
        assignedToId: true,
        secondaryAssignedToId: true,
        responseAnsMinutes: true,
        resolutionAnsMinutes: true,
        reopenCount: true,
        locationId: true
      },
      orderBy: { createdAt: 'asc' }
    }).catch(() => []),

    // Tickets activos para Aging y Radar de urgencia
    prisma.ticket.findMany({
      where: {
        ...baseFilter,
        status: { notIn: ['RESOLVED', 'CLOSED'] }
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        ticketType: true,
        category: true,
        createdAt: true,
        assignedAt: true,
        firstResponseAt: true,
        responseAnsMinutes: true,
        resolutionAnsMinutes: true,
        assignedTo: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    }).catch(() => []),

    // Agrupaciones
    prisma.ticket.groupBy({
      by: ['category'],
      where: baseFilter,
      _count: { id: true }
    }).catch(() => []),
    prisma.ticket.groupBy({
      by: ['priority'],
      where: baseFilter,
      _count: { id: true }
    }).catch(() => []),
    prisma.ticket.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { id: true }
    }).catch(() => []),

    // Técnicos y su carga
    prisma.user.findMany({
      where: {
        ...orgFilter,
        isActive: true,
        role: {
          name: {
            in: [
              'ADMIN', 'ADMINISTRADOR', 'NIVEL 1', 'NIVEL 2', 'NIVEL 3',
              'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'TECNICO', 'TÉCNICO',
              'TECNICO NIVEL 1', 'TECNICO NIVEL 2', 'TECNICO NIVEL 3'
            ]
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } }
      },
      orderBy: { name: 'asc' }
    }).catch(() => []),

    // Jerarquía de Sedes, Dependencias y Oficinas
    prisma.sede.findMany({
      where: orgFilter,
      orderBy: { name: 'asc' }
    }).catch(() => []),
    prisma.dependencia.findMany({
      where: orgFilter,
      include: { sede: true },
      orderBy: { name: 'asc' }
    }).catch(() => []),
    prisma.oficina.findMany({
      where: orgFilter,
      include: { dependencia: true, sede: true },
      orderBy: { name: 'asc' }
    }).catch(() => [])
  ]);

  // 4. Cálculo Estadístico Real de MTTA y MTTR (P50 y P90)
  const mttaMinutesList = [];
  const mttrHoursList = [];
  const mttAssignMinutesList = [];

  let responseEligibleCount = 0;
  let responseCompliantCount = 0;
  let responseDelayedCount = 0;

  let resolutionEligibleCount = 0;
  let resolutionCompliantCount = 0;
  let resolutionDelayedCount = 0;

  let fcrEligibleCount = 0;
  let fcrResolvedCount = 0;
  let reopenedTicketsCount = 0;

  allTickets.forEach(ticket => {
    const evalAns = evaluateTicketAns(ticket);

    // MTTA: firstResponseAt - createdAt (en minutos hábiles)
    if (ticket.firstResponseAt && ticket.createdAt) {
      const mtta = calculateBusinessMinutes(ticket.createdAt, ticket.firstResponseAt);
      mttaMinutesList.push(mtta);
    }

    // MTTAssignment: assignedAt - createdAt
    if (ticket.assignedAt && ticket.createdAt) {
      const mttAssign = calculateBusinessMinutes(ticket.createdAt, ticket.assignedAt);
      mttAssignMinutesList.push(mttAssign);
    }

    // MTTR: resolvedAt - createdAt (en horas hábiles)
    if (ticket.resolvedAt && ticket.createdAt) {
      const mttrMin = calculateBusinessMinutes(ticket.createdAt, ticket.resolvedAt);
      mttrHoursList.push(Number((mttrMin / 60).toFixed(1)));
    }

    // ANS Primera Respuesta
    if (ticket.firstResponseAt) {
      responseEligibleCount++;
      if (evalAns.responseCompliant) {
        responseCompliantCount++;
      } else {
        responseDelayedCount++;
      }
    } else if (evalAns.isResponseBreached) {
      responseEligibleCount++;
      responseDelayedCount++;
    }

    // ANS Solución
    if (evalAns.isResolved) {
      resolutionEligibleCount++;
      if (evalAns.resolutionCompliant) {
        resolutionCompliantCount++;
      } else {
        resolutionDelayedCount++;
      }

      // FCR Real: Resuelto sin reaperturas y dentro del límite
      fcrEligibleCount++;
      if ((ticket.reopenCount || 0) === 0 && evalAns.resolutionCompliant) {
        fcrResolvedCount++;
      }
    } else if (evalAns.isResolutionBreached) {
      resolutionEligibleCount++;
      resolutionDelayedCount++;
    }

    if ((ticket.reopenCount || 0) > 0) {
      reopenedTicketsCount++;
    }
  });

  // Ordenar para percentiles
  mttaMinutesList.sort((a, b) => a - b);
  mttrHoursList.sort((a, b) => a - b);
  mttAssignMinutesList.sort((a, b) => a - b);

  const mttaP50Minutes = calculatePercentile(mttaMinutesList, 50);
  const mttaP90Minutes = calculatePercentile(mttaMinutesList, 90);
  const avgMttaMinutes = mttaMinutesList.length > 0 
    ? Math.round(mttaMinutesList.reduce((a, b) => a + b, 0) / mttaMinutesList.length) 
    : 0;

  const mttrP50Hours = calculatePercentile(mttrHoursList, 50);
  const mttrP90Hours = calculatePercentile(mttrHoursList, 90);
  const avgMttrHours = mttrHoursList.length > 0
    ? Number((mttrHoursList.reduce((a, b) => a + b, 0) / mttrHoursList.length).toFixed(1))
    : 0;

  // Tasas de Cumplimiento 100% Reales (Sin Math.random y sin Math.max artificial)
  const responseAnsCompliance = responseEligibleCount > 0
    ? Number(((responseCompliantCount / responseEligibleCount) * 100).toFixed(1))
    : 100;

  const resolutionAnsCompliance = resolutionEligibleCount > 0
    ? Number(((resolutionCompliantCount / resolutionEligibleCount) * 100).toFixed(1))
    : 100;

  // Global ANS: promedio ponderado de respuesta y solución
  const globalAnsCompliance = (responseEligibleCount + resolutionEligibleCount) > 0
    ? Number((((responseCompliantCount + resolutionCompliantCount) / (responseEligibleCount + resolutionEligibleCount)) * 100).toFixed(1))
    : 100;

  const fcrRate = fcrEligibleCount > 0
    ? Number(((fcrResolvedCount / fcrEligibleCount) * 100).toFixed(1))
    : 0;

  const reopenRate = totalTickets > 0
    ? Number(((reopenedTicketsCount / totalTickets) * 100).toFixed(1))
    : 0;

  // 5. Backlog Aging
  const agingBuckets = [
    { key: 'less24h', label: '< 24 Horas', count: 0, percent: 0, color: '#10b981', statusBadge: 'Fresco', desc: 'Atención dentro del día' },
    { key: 'days1to3', label: '1 - 3 Días', count: 0, percent: 0, color: '#00D1FF', statusBadge: 'En Tiempo', desc: 'En curso normal' },
    { key: 'days4to7', label: '4 - 7 Días', count: 0, percent: 0, color: '#f59e0b', statusBadge: 'Atención', desc: 'Seguimiento prioritario' },
    { key: 'days8to15', label: '8 - 15 Días', count: 0, percent: 0, color: '#ea580c', statusBadge: 'En Riesgo', desc: 'Alerta de retraso' },
    { key: 'more15d', label: '> 15 Días', count: 0, percent: 0, color: '#dc2626', statusBadge: 'Estancado', desc: 'Intervención inmediata' }
  ];

  const totalActiveCount = activeTicketsForRadar.length;
  activeTicketsForRadar.forEach(t => {
    const elapsedHours = (now - new Date(t.createdAt)) / (1000 * 60 * 60);
    if (elapsedHours < 24) agingBuckets[0].count++;
    else if (elapsedHours < 72) agingBuckets[1].count++;
    else if (elapsedHours < 168) agingBuckets[2].count++;
    else if (elapsedHours < 360) agingBuckets[3].count++;
    else agingBuckets[4].count++;
  });

  agingBuckets.forEach(b => {
    b.percent = totalActiveCount > 0 ? Math.round((b.count / totalActiveCount) * 100) : 0;
  });

  // 6. Radar Operacional de Casos Urgentes (En Riesgo o Vencidos de ANS)
  const urgentTicketsRadar = activeTicketsForRadar
    .map(t => {
      const evalAns = evaluateTicketAns(t);
      const elapsedHours = Math.round((now - new Date(t.createdAt)) / (1000 * 60 * 60));
      return {
        id: t.id,
        title: t.title,
        priority: evalAns.priority,
        status: t.status,
        ticketType: t.ticketType || 'Incidencia',
        assignedTo: t.assignedTo?.name || 'Sin Asignar',
        elapsedHours,
        createdAt: t.createdAt,
        ansStatus: evalAns.ansStatus,
        isOverdue: evalAns.isOverdue,
        isAtRisk: evalAns.isAtRisk,
        remainingMinutes: evalAns.remainingResolutionMinutes
      };
    })
    .filter(t => t.isOverdue || t.isAtRisk || t.assignedTo === 'Sin Asignar')
    .sort((a, b) => {
      // Prioridad a los vencidos, luego en riesgo
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.remainingMinutes - b.remainingMinutes;
    })
    .slice(0, 5);

  // 7. Carga de Técnicos Optimizada (Agregada en memoria sin N+1)
  const techTicketMap = new Map();
  allTickets.forEach(t => {
    [t.assignedToId, t.secondaryAssignedToId].filter(Boolean).forEach(techId => {
      if (!techTicketMap.has(techId)) {
        techTicketMap.set(techId, { assigned: 0, unresolved: 0, inProgress: 0, pending: 0, resolved: 0 });
      }
      const entry = techTicketMap.get(techId);
      entry.assigned++;
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        entry.resolved++;
      } else {
        entry.unresolved++;
        if (t.status === 'IN_PROGRESS' || t.status === 'PLANIFICADO' || t.status === 'OPEN') {
          entry.inProgress++;
        } else if (t.status === 'PENDING' || t.status === 'EN_ESPERA') {
          entry.pending++;
        }
      }
    });
  });

  const techniciansWorkload = usersRaw.map(tech => {
    const counts = techTicketMap.get(tech.id) || { assigned: 0, unresolved: 0, inProgress: 0, pending: 0, resolved: 0 };
    const isAvailable = counts.unresolved === 0;
    return {
      id: tech.id,
      name: tech.name,
      email: tech.email,
      role: tech.role?.name || 'Técnico',
      assignedCount: counts.assigned,
      unresolvedCount: counts.unresolved,
      activeCount: counts.unresolved,
      inProgressCount: counts.inProgress,
      pendingCount: counts.pending,
      resolvedCount: counts.resolved,
      isAvailable,
      loadStatus: isAvailable ? 'Disponible' : 'No Disponible',
      loadColor: isAvailable ? '#10b981' : (counts.unresolved > 3 ? '#dc2626' : '#f59e0b'),
      loadBadge: isAvailable ? 'Libre' : `${counts.unresolved} pendiente${counts.unresolved > 1 ? 's' : ''}`
    };
  });

  // 8. Jerarquía Exacta de Sedes, Dependencias y Oficinas (Conserva compatibilidad 100%)
  const sedeMap = new Map();
  sedesRaw.forEach(s => {
    sedeMap.set(s.id, {
      id: s.id,
      name: s.name,
      label: s.name,
      address: s.address || '',
      count: 0,
      percent: 0,
      dependencias: []
    });
  });

  if (sedeMap.size === 0) {
    sedeMap.set(1, {
      id: 1,
      name: 'Sede Principal',
      label: 'Sede Principal',
      address: '',
      count: 0,
      percent: 0,
      dependencias: []
    });
  }

  const depMap = new Map();
  dependenciasRaw.forEach(d => {
    const targetSedeId = d.sedeId || (sedeMap.keys().next().value);
    const parentSede = sedeMap.get(targetSedeId) || sedeMap.values().next().value;
    const depObj = {
      id: d.id,
      name: d.name,
      label: d.name,
      code: d.code || '',
      sedeId: targetSedeId,
      sedeName: d.sede?.name || parentSede?.name || 'Sede Principal',
      count: 0,
      percent: 0,
      oficinas: []
    };
    depMap.set(d.id, depObj);
    if (parentSede) {
      parentSede.dependencias.push(depObj);
    }
  });

  oficinasRaw.forEach(o => {
    const parentDep = o.dependenciaId ? depMap.get(o.dependenciaId) : null;
    const ofiObj = {
      id: o.id,
      name: o.name,
      label: o.name,
      code: o.code || '',
      floor: o.floor || '',
      dependenciaId: o.dependenciaId,
      depName: parentDep?.name || 'General',
      sedeId: o.sedeId,
      count: 0,
      percentOfDependencia: 0,
      percentOfTotal: 0
    };
    if (parentDep) {
      parentDep.oficinas.push(ofiObj);
    }
  });

  // Mapear tickets por locationId
  const locationTicketsCount = new Map();
  allTickets.forEach(t => {
    if (t.locationId) {
      locationTicketsCount.set(t.locationId, (locationTicketsCount.get(t.locationId) || 0) + 1);
    }
  });

  // Distribuir conteos de sedes y dependencias
  depMap.forEach(dep => {
    const sumOfi = dep.oficinas.reduce((s, o) => s + o.count, 0);
    dep.count = Math.max(dep.count, sumOfi);
    dep.percent = totalTickets > 0 ? Math.round((dep.count / totalTickets) * 100) : 0;
  });

  sedeMap.forEach(sede => {
    const sumDep = sede.dependencias.reduce((s, d) => s + d.count, 0);
    sede.count = Math.max(sede.count, sumDep);
    sede.percent = totalTickets > 0 ? Math.round((sede.count / totalTickets) * 100) : 0;
  });

  const sedesHierarchy = Array.from(sedeMap.values());
  const dependenciasTree = Array.from(depMap.values());

  // 9. Evolución Diaria (Últimos 30 Días)
  const dailyMap = {};
  const daysDiff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const daysToProcess = Math.min(daysDiff, 30);

  for (let i = 0; i < daysToProcess; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    dailyMap[dStr] = {
      date: dStr,
      name: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      created: 0,
      incidents: 0,
      requests: 0,
      resolved: 0
    };
  }

  allTickets.forEach(t => {
    const cStr = t.createdAt.toISOString().split('T')[0];
    if (dailyMap[cStr]) {
      dailyMap[cStr].created++;
      if (['Incidencia', 'Incidente', 'Falla'].includes(t.ticketType)) {
        dailyMap[cStr].incidents++;
      } else {
        dailyMap[cStr].requests++;
      }
    }
    if (t.resolvedAt) {
      const rStr = t.resolvedAt.toISOString().split('T')[0];
      if (dailyMap[rStr]) {
        dailyMap[rStr].resolved++;
      }
    }
  });

  const thirtyDaysTrend = Object.keys(dailyMap).sort().map(k => dailyMap[k]);

  // 10. Mapa de Calor Horario (0-6 días x 0-23 horas)
  const hourlyHeatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  allTickets.forEach(t => {
    const d = new Date(t.createdAt);
    const day = d.getDay();
    const hour = d.getHours();
    if (hourlyHeatmap[day] && hourlyHeatmap[day][hour] !== undefined) {
      hourlyHeatmap[day][hour]++;
    }
  });

  return {
    summary: {
      total: totalTickets,
      active: openTickets,
      open: openTickets,
      inProgress: inProgressTickets,
      pending: pendingTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
      backlog: openTickets,
      unassigned: unassignedTickets,
      incidents: incidentCount,
      requests: requestCount,
      mttaP50Minutes,
      mttaP90Minutes,
      avgMttaMinutes,
      mttrP50Hours,
      mttrP90Hours,
      avgMttrHours,
      responseAnsCompliance,
      resolutionAnsCompliance,
      globalAnsCompliance,
      delayedResponse: responseDelayedCount,
      delayedResolution: resolutionDelayedCount,
      overdueTickets: resolutionDelayedCount,
      fcrRate,
      reopenRate
    },
    timeline: thirtyDaysTrend,
    ticketAging: agingBuckets,
    urgentTicketsRadar,
    techniciansWorkload,
    sedesHierarchy,
    dependenciasTree,
    categories: categoriesRaw.map(c => ({ label: c.category || 'General', count: c._count.id })),
    priorities: prioritiesRaw.map(p => ({ label: p.priority || 'Medio', count: p._count.id })),
    statuses: statusesRaw.map(s => ({ label: s.status, count: s._count.id })),
    hourlyHeatmap
  };
}

module.exports = {
  getTicketPerformanceMetrics
};
