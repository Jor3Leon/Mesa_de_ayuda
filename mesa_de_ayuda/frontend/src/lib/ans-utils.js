/**
 * ANS Calculation Utilities (Canonical Business Time & Service Level Agreements)
 * Consistent with backend: Mon-Fri, 08:00-17:00 (America/Bogota)
 */

export const DEFAULT_ANS_POLICIES = {
  ALTO: { responseHours: 4, resolutionHours: 8 },
  MEDIO: { responseHours: 8, resolutionHours: 24 },
  BAJO: { responseHours: 24, resolutionHours: 48 },
};

export function calculateBusinessMinutes(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
    return 0;
  }

  let count = 0;
  let current = new Date(startDate);

  while (current < endDate) {
    const day = current.getDay();
    const hour = current.getHours();
    const min = current.getMinutes();

    // Lunes (1) a Viernes (5), 08:00 a 17:00
    const isBusinessDay = day >= 1 && day <= 5;
    const isBusinessHour = (hour >= 8 && hour < 17);

    if (isBusinessDay && isBusinessHour) {
      count++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }
  return count;
}

export function getAnsInfo(ticket) {
  if (!ticket?.createdAt) return null;

  const createdDate = new Date(ticket.createdAt);
  const endDate = ticket.closedAt ? new Date(ticket.closedAt) : (ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date());

  const prioKey = String(ticket.priority || '').toUpperCase().trim();
  const policy = DEFAULT_ANS_POLICIES[prioKey] || (
    ['HIGH', 'ALTA', 'CRITICAL', 'CRITICA', 'EMERGENCY', 'URGENTE'].includes(prioKey)
      ? DEFAULT_ANS_POLICIES.ALTO
      : (['LOW', 'BAJA'].includes(prioKey) ? DEFAULT_ANS_POLICIES.BAJO : DEFAULT_ANS_POLICIES.MEDIO)
  );

  const totalMinutesAllowed = policy.resolutionHours * 60;
  const minutesElapsed = calculateBusinessMinutes(createdDate, endDate);

  const percentage = Math.min(Math.round((minutesElapsed / totalMinutesAllowed) * 100), 100);
  const remainingMinutes = Math.max(totalMinutesAllowed - minutesElapsed, 0);

  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  return {
    percentage,
    remainingMinutes,
    remainingText: remainingMinutes === 0 ? '0h 0m' : `${remainingHours}h ${remainingMins}m`,
    isOverdue: minutesElapsed > totalMinutesAllowed,
    isAtRisk: minutesElapsed > totalMinutesAllowed * 0.75 && minutesElapsed <= totalMinutesAllowed,
    status: minutesElapsed > totalMinutesAllowed ? 'CRITICAL' : minutesElapsed > totalMinutesAllowed * 0.75 ? 'WARNING' : 'NORMAL'
  };
}

// Compatibilidad retroactiva
export const getSlaInfo = getAnsInfo;
