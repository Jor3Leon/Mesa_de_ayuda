/**
 * AnsEngine — Motor oficial de Acuerdos de Nivel de Servicio (ANS).
 * Garantiza una única fuente de verdad para plazos, advertencias y cálculo de cumplimiento.
 */

const { calculateBusinessMinutes, addBusinessMinutes } = require('./business-time');

// Políticas institucionales predeterminadas por prioridad
const DEFAULT_ANS_POLICIES = {
  ALTO: {
    priority: 'ALTO',
    name: 'ANS Prioridad Alta',
    responseMinutes: 60,       // 1 hora hábil para primera respuesta
    resolutionMinutes: 480,    // 8 horas hábiles para solución
    warningThresholdMinutes: 60
  },
  MEDIO: {
    priority: 'MEDIO',
    name: 'ANS Prioridad Media',
    responseMinutes: 120,      // 2 horas hábiles para primera respuesta
    resolutionMinutes: 1440,   // 24 horas hábiles para solución
    warningThresholdMinutes: 180
  },
  BAJO: {
    priority: 'BAJO',
    name: 'ANS Prioridad Baja',
    responseMinutes: 240,      // 4 horas hábiles para primera respuesta
    resolutionMinutes: 2880,   // 48 horas hábiles para solución
    warningThresholdMinutes: 360
  }
};

/**
 * Normaliza la prioridad ingresada a la clave canónica (ALTO, MEDIO, BAJO)
 * @param {string} priority 
 * @returns {'ALTO'|'MEDIO'|'BAJO'}
 */
function normalizePriority(priority) {
  const p = String(priority || '').toUpperCase().trim();
  if (['ALTO', 'HIGH', 'ALTA', 'CRITICAL', 'CRITICA', 'EMERGENCY', 'URGENTE'].includes(p)) {
    return 'ALTO';
  }
  if (['BAJO', 'LOW', 'BAJA'].includes(p)) {
    return 'BAJO';
  }
  return 'MEDIO';
}

/**
 * Obtiene la política predeterminada según la prioridad
 * @param {string} priority 
 * @returns {object}
 */
function getDefaultPolicy(priority) {
  const norm = normalizePriority(priority);
  return DEFAULT_ANS_POLICIES[norm] || DEFAULT_ANS_POLICIES.MEDIO;
}

/**
 * Resuelve la política aplicable para un ticket (desde base de datos o fallback)
 * @param {object} prisma 
 * @param {string} priority 
 * @param {string|null} organizationId 
 * @returns {Promise<object>}
 */
async function resolvePolicy(prisma, priority, organizationId = null) {
  const norm = normalizePriority(priority);
  try {
    if (prisma?.ansPolicy) {
      const dbPolicy = await prisma.ansPolicy.findFirst({
        where: {
          priority: norm,
          isActive: true,
          ...(organizationId ? { organizationId } : {})
        },
        include: {
          businessCalendar: {
            include: { intervals: true, holidays: true }
          }
        }
      });
      if (dbPolicy) {
        return {
          priority: norm,
          name: dbPolicy.name || `ANS ${norm}`,
          responseMinutes: dbPolicy.responseMinutes || DEFAULT_ANS_POLICIES[norm].responseMinutes,
          resolutionMinutes: dbPolicy.resolutionMinutes || DEFAULT_ANS_POLICIES[norm].resolutionMinutes,
          calendar: dbPolicy.businessCalendar || null,
          warningThresholdMinutes: Math.round((dbPolicy.resolutionMinutes || 480) * 0.2)
        };
      }
    }
  } catch {
    // Si la tabla no está disponible o falla, retornar default
  }

  return getDefaultPolicy(norm);
}

/**
 * Evalúa el estado completo de ANS para un ticket dado.
 * @param {object} ticket 
 * @param {object|null} calendar 
 * @param {object|null} customPolicy 
 * @returns {object} Evaluación ANS
 */
function evaluateTicketAns(ticket, calendar = null, customPolicy = null) {
  if (!ticket || !ticket.createdAt) {
    return null;
  }

  const createdAt = new Date(ticket.createdAt);
  const now = new Date();
  const policy = customPolicy || getDefaultPolicy(ticket.priority);

  const responseLimit = ticket.responseAnsMinutes || policy.responseMinutes;
  const resolutionLimit = ticket.resolutionAnsMinutes || policy.resolutionMinutes;

  const responseDeadline = addBusinessMinutes(createdAt, responseLimit, calendar);
  const resolutionDeadline = addBusinessMinutes(createdAt, resolutionLimit, calendar);

  // 1. Evaluación de Primera Respuesta
  const firstRespAt = ticket.firstResponseAt ? new Date(ticket.firstResponseAt) : null;
  const hasResponded = Boolean(firstRespAt);
  const responseElapsed = calculateBusinessMinutes(createdAt, firstRespAt || now, calendar);
  const isResponseBreached = hasResponded ? responseElapsed > responseLimit : responseElapsed > responseLimit;
  const responseCompliant = hasResponded && !isResponseBreached;

  // 2. Evaluación de Solución
  const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;
  const isResolved = Boolean(resolvedAt) || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const resolutionEnd = resolvedAt || (ticket.closedAt ? new Date(ticket.closedAt) : now);
  const resolutionElapsed = calculateBusinessMinutes(createdAt, resolutionEnd, calendar);
  const isResolutionBreached = isResolved ? resolutionElapsed > resolutionLimit : resolutionElapsed > resolutionLimit;
  const resolutionCompliant = isResolved && !isResolutionBreached;

  // 3. Minutos y porcentajes
  const remainingResolutionMinutes = Math.max(0, resolutionLimit - resolutionElapsed);
  const resolutionConsumedPercent = Math.min(100, Math.round((resolutionElapsed / Math.max(resolutionLimit, 1)) * 100));

  // 4. Estado de Nivel de Servicio (ANS Status)
  let ansStatus = 'ON_TRACK'; // En tiempo
  if (isResolutionBreached || (!hasResponded && isResponseBreached)) {
    ansStatus = 'BREACHED'; // Incumplido / Vencido
  } else if (isResolved) {
    ansStatus = 'COMPLETED'; // Cumplido
  } else if (remainingResolutionMinutes <= (policy.warningThresholdMinutes || 60) || resolutionConsumedPercent >= 80) {
    ansStatus = 'AT_RISK'; // En riesgo
  }

  return {
    priority: normalizePriority(ticket.priority),
    responseLimitMinutes: responseLimit,
    resolutionLimitMinutes: resolutionLimit,
    responseDeadline,
    resolutionDeadline,
    hasResponded,
    firstResponseAt: firstRespAt,
    responseElapsedMinutes: responseElapsed,
    isResponseBreached,
    responseCompliant,
    isResolved,
    resolvedAt,
    resolutionElapsedMinutes: resolutionElapsed,
    isResolutionBreached,
    resolutionCompliant,
    remainingResolutionMinutes,
    resolutionConsumedPercent,
    ansStatus,
    isOverdue: isResolutionBreached,
    isAtRisk: ansStatus === 'AT_RISK'
  };
}

module.exports = {
  DEFAULT_ANS_POLICIES,
  normalizePriority,
  getDefaultPolicy,
  resolvePolicy,
  evaluateTicketAns
};
