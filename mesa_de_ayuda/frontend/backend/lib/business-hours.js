/**
 * Módulo de Horas Hábiles Laborales y Cierre Automático de Tickets
 * Regla Institucional: Los tickets resueltos pasan a Cerrado tras 8 horas laborales hábiles.
 * Horario Laboral: Lunes a Viernes de 08:00 a 17:00 (8 horas hábiles efectivas).
 */

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const TARGET_BUSINESS_HOURS = 8;

/**
 * Calcula las horas hábiles laborales transcurridas entre dos fechas.
 * Excluye fines de semana (Sábados y Domingos) y horas fuera del rango laboral.
 * 
 * @param {Date|string} startDate Fecha inicial (e.g. resolvedAt)
 * @param {Date|string} endDate Fecha final (e.g. now)
 * @param {number} startHour Hora de inicio laboral (default 8)
 * @param {number} endHour Hora de fin laboral (default 17)
 * @returns {number} Horas hábiles transcurridas
 */
function calculateElapsedBusinessHours(startDate, endDate = new Date(), startHour = WORK_START_HOUR, endHour = WORK_END_HOUR) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return 0;
  }

  let current = new Date(start);
  let totalBusinessMinutes = 0;

  while (current < end) {
    const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (isWorkday) {
      const dayStart = new Date(current);
      dayStart.setHours(startHour, 0, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(endHour, 0, 0, 0);

      const effectiveStart = current > dayStart ? current : dayStart;
      const effectiveEnd = end < dayEnd ? end : dayEnd;

      if (effectiveStart < effectiveEnd && effectiveStart < dayEnd && effectiveEnd > dayStart) {
        const windowStart = effectiveStart < dayStart ? dayStart : effectiveStart;
        const windowEnd = effectiveEnd > dayEnd ? dayEnd : effectiveEnd;
        if (windowEnd > windowStart) {
          totalBusinessMinutes += (windowEnd - windowStart) / (1000 * 60);
        }
      }
    }

    // Avanzar al inicio del siguiente día (00:00)
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return Number((totalBusinessMinutes / 60).toFixed(2));
}

/**
 * Calcula la fecha y hora exacta en la que se completarán X horas hábiles laborales desde una fecha dada.
 * 
 * @param {Date|string} startDate Fecha inicial (e.g. resolvedAt)
 * @param {number} targetHours Horas hábiles objetivo (default 8)
 * @returns {Date} Fecha futura de cumplimiento
 */
function getAutoCloseTargetDate(startDate, targetHours = TARGET_BUSINESS_HOURS) {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;

  let current = new Date(start);
  let remainingMinutes = targetHours * 60;

  while (remainingMinutes > 0) {
    const dayOfWeek = current.getDay();
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isWorkday) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    if (current.getHours() < WORK_START_HOUR) {
      current.setHours(WORK_START_HOUR, 0, 0, 0);
    } else if (current.getHours() >= WORK_END_HOUR) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }

    const dayEnd = new Date(current);
    dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

    const availableMinutesToday = (dayEnd - current) / (1000 * 60);

    if (remainingMinutes <= availableMinutesToday) {
      current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutesToday;
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START_HOUR, 0, 0, 0);
    }
  }

  return current;
}

/**
 * Ejecuta el cierre automático de todos los tickets en estado RESOLVED
 * que hayan superado las 8 horas hábiles laborales desde su fecha de resolución.
 * 
 * @param {object} prisma Cliente de Prisma
 * @returns {Promise<Array>} Lista de IDs de tickets cerrados automáticamente
 */
async function autoCloseResolvedTickets(prisma) {
  try {
    const resolvedTickets = await prisma.ticket.findMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        resolvedAt: true,
        status: true,
        assignedTo: { select: { id: true, name: true } }
      }
    });

    if (!resolvedTickets || resolvedTickets.length === 0) {
      return [];
    }

    const now = new Date();
    const closedTicketIds = [];

    for (const ticket of resolvedTickets) {
      const elapsedHours = calculateElapsedBusinessHours(ticket.resolvedAt, now);

      if (elapsedHours >= TARGET_BUSINESS_HOURS) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'CLOSED',
            closedAt: now
          }
        });

        await prisma.ticketActivity.create({
          data: {
            ticketId: ticket.id,
            user: 'Sistema Mesa de Ayuda',
            action: 'CLOSED',
            field: 'Estado',
            newValue: `Cierre automático institucional: Cumplidas 8 horas hábiles laborales desde la solución del caso (${elapsedHours.toFixed(1)} hrs hábiles transcurridas).`,
          }
        }).catch(() => null);

        closedTicketIds.push(ticket.id);
        console.log(`[Auto-Close] Ticket #${ticket.id} "${ticket.title}" cerrado automáticamente tras ${elapsedHours.toFixed(1)} horas hábiles.`);
      }
    }

    return closedTicketIds;
  } catch (error) {
    console.error('[Auto-Close] Error al procesar cierre automático de tickets:', error);
    return [];
  }
}

module.exports = {
  calculateElapsedBusinessHours,
  getAutoCloseTargetDate,
  autoCloseResolvedTickets,
  WORK_START_HOUR,
  WORK_END_HOUR,
  TARGET_BUSINESS_HOURS
};
