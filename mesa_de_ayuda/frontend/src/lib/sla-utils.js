/**
 * SLA Calculation Utilities
 * Based on business hours: Mon-Fri, 8:00-12:00 and 14:00-17:30
 */

export function getSlaInfo(ticket) {
  if (!ticket?.createdAt) return null;

  const createdDate = new Date(ticket.createdAt);
  const endDate = ticket.closedAt ? new Date(ticket.closedAt) : (ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date());
  
  // Priority to hours mapping (Alto: 8h, Medio: 24h, Bajo: 48h)
  const priorityHours = {
    ALTO: 8,
    MEDIO: 24,
    BAJO: 48,
    ALTA: 8,
    MEDIA: 24,
    BAJA: 48,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 48,
    CRITICA: 8,
    CRITICAL: 8,
    EMERGENCY: 8,
    URGENTE: 8,
  };

  const prioKey = String(ticket.priority || '').toUpperCase().trim();
  const totalHoursAllowed = priorityHours[prioKey] || 24;

  // Simplified business hours calculation
  // For a real production system, this should be more robust (handling holidays, etc.)
  function calculateBusinessMinutes(start, end) {
    let count = 0;
    let current = new Date(start);

    while (current < end) {
      const day = current.getDay();
      const hour = current.getHours();
      const min = current.getMinutes();

      const isBusinessDay = day >= 1 && day <= 5;
      const isMorning = (hour > 8 || (hour === 8 && min >= 0)) && (hour < 12);
      const isAfternoon = (hour > 14 || (hour === 14 && min >= 0)) && (hour < 17 || (hour === 17 && min < 30));

      if (isBusinessDay && (isMorning || isAfternoon)) {
        count++;
      }
      current.setMinutes(current.getMinutes() + 1);
    }
    return count;
  }

  const minutesElapsed = calculateBusinessMinutes(createdDate, endDate);
  const totalMinutesAllowed = totalHoursAllowed * 60;
  
  const percentage = Math.min(Math.round((minutesElapsed / totalMinutesAllowed) * 100), 100);
  const remainingMinutes = Math.max(totalMinutesAllowed - minutesElapsed, 0);
  
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  return {
    percentage,
    remainingText: `${remainingHours}h ${remainingMins}m`,
    isOverdue: percentage >= 100,
    status: percentage > 80 ? 'CRITICAL' : percentage > 50 ? 'WARNING' : 'NORMAL'
  };
}
