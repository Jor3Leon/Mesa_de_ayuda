/**
 * Business Time Service — Única fuente de verdad para el cálculo de tiempo hábil institucional.
 * Por defecto: Lunes a Viernes de 08:00 a 17:00 (Zona horaria: America/Bogota).
 * Excluye fines de semana y festivos institucionales/nacionales.
 */

const DEFAULT_TIMEZONE = 'America/Bogota';
const DEFAULT_WORK_START_HOUR = 8;
const DEFAULT_WORK_END_HOUR = 17;

/**
 * Convierte una fecha a la zona horaria objetivo (representación local)
 * @param {Date|string|number} date 
 * @param {string} timezone 
 * @returns {Date}
 */
function toTimeZone(date, timezone = DEFAULT_TIMEZONE) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date();
  
  try {
    const invDate = new Date(d.toLocaleString('en-US', { timeZone: timezone }));
    const diff = invDate.getTime() - d.getTime();
    return new Date(d.getTime() + diff);
  } catch {
    return d;
  }
}

/**
 * Verifica si una fecha dada corresponde a un día festivo
 * @param {Date} date 
 * @param {Array<Date|string>} holidays 
 * @returns {boolean}
 */
function isHoliday(date, holidays = []) {
  if (!holidays || !holidays.length) return false;
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  return holidays.some(h => {
    const hd = new Date(h.date || h);
    return !isNaN(hd.getTime()) && hd.getFullYear() === y && hd.getMonth() === m && hd.getDate() === d;
  });
}

/**
 * Obtiene los intervalos de trabajo aplicables para un día de la semana (1 = Lunes ... 5 = Viernes)
 * @param {number} dayOfWeek 
 * @param {object} calendar 
 * @returns {Array<{startMinutes: number, endMinutes: number}>}
 */
function getDayIntervals(dayOfWeek, calendar = null) {
  if (calendar && calendar.intervals && calendar.intervals.length > 0) {
    const dayIntervals = calendar.intervals.filter(i => i.weekday === dayOfWeek);
    if (dayIntervals.length > 0) {
      return dayIntervals.map(i => {
        const [sh, sm] = (i.startTime || '08:00').split(':').map(Number);
        const [eh, em] = (i.endTime || '17:00').split(':').map(Number);
        return {
          startMinutes: (sh || 0) * 60 + (sm || 0),
          endMinutes: (eh || 0) * 60 + (em || 0)
        };
      });
    }
  }

  // Horario institucional por defecto: Lunes a Viernes 08:00 a 17:00
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return [{
      startMinutes: DEFAULT_WORK_START_HOUR * 60,
      endMinutes: DEFAULT_WORK_END_HOUR * 60
    }];
  }

  return [];
}

/**
 * Calcula los minutos hábiles de trabajo transcurridos entre dos fechas.
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {object|null} calendar 
 * @returns {number} Minutos hábiles transcurridos
 */
function calculateBusinessMinutes(startDate, endDate = new Date(), calendar = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return 0;
  }

  const holidays = calendar?.holidays || [];
  let current = new Date(start);
  let totalMinutes = 0;

  // Recorremos día a día
  while (current < end) {
    const dayOfWeek = current.getDay(); // 0 = Domingo, 1 = Lunes ... 6 = Sábado
    const dayHoli = isHoliday(current, holidays);

    if (!dayHoli) {
      const intervals = getDayIntervals(dayOfWeek, calendar);

      for (const interval of intervals) {
        const dayIntervalStart = new Date(current);
        dayIntervalStart.setHours(Math.floor(interval.startMinutes / 60), interval.startMinutes % 60, 0, 0);

        const dayIntervalEnd = new Date(current);
        dayIntervalEnd.setHours(Math.floor(interval.endMinutes / 60), interval.endMinutes % 60, 0, 0);

        const effectiveStart = current > dayIntervalStart ? current : dayIntervalStart;
        const effectiveEnd = end < dayIntervalEnd ? end : dayIntervalEnd;

        if (effectiveStart < effectiveEnd && effectiveStart < dayIntervalEnd && effectiveEnd > dayIntervalStart) {
          const windowStart = effectiveStart < dayIntervalStart ? dayIntervalStart : effectiveStart;
          const windowEnd = effectiveEnd > dayIntervalEnd ? dayIntervalEnd : effectiveEnd;
          if (windowEnd > windowStart) {
            totalMinutes += Math.round((windowEnd - windowStart) / (1000 * 60));
          }
        }
      }
    }

    // Avanzar al inicio del siguiente día (00:00:00)
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return Math.max(0, totalMinutes);
}

/**
 * Calcula las horas hábiles de trabajo transcurridas entre dos fechas con 1 decimal.
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {object|null} calendar 
 * @returns {number} Horas hábiles
 */
function calculateBusinessHours(startDate, endDate = new Date(), calendar = null) {
  const minutes = calculateBusinessMinutes(startDate, endDate, calendar);
  return Number((minutes / 60).toFixed(1));
}

/**
 * Calcula la fecha y hora futura en la que se completarán N minutos hábiles desde una fecha inicial.
 * @param {Date|string} startDate 
 * @param {number} targetMinutes 
 * @param {object|null} calendar 
 * @returns {Date}
 */
function addBusinessMinutes(startDate, targetMinutes, calendar = null) {
  const start = new Date(startDate);
  if (isNaN(start.getTime()) || targetMinutes <= 0) {
    return new Date(start);
  }

  const holidays = calendar?.holidays || [];
  let current = new Date(start);
  let remainingMinutes = Math.round(targetMinutes);

  // Límite de seguridad de 365 días para evitar bucles infinitos
  let daysSafeguard = 365;

  while (remainingMinutes > 0 && daysSafeguard > 0) {
    const dayOfWeek = current.getDay();
    const dayHoli = isHoliday(current, holidays);

    if (dayHoli) {
      current.setDate(current.getDate() + 1);
      current.setHours(DEFAULT_WORK_START_HOUR, 0, 0, 0);
      daysSafeguard--;
      continue;
    }

    const intervals = getDayIntervals(dayOfWeek, calendar);
    if (!intervals.length) {
      current.setDate(current.getDate() + 1);
      current.setHours(DEFAULT_WORK_START_HOUR, 0, 0, 0);
      daysSafeguard--;
      continue;
    }

    for (const interval of intervals) {
      if (remainingMinutes <= 0) break;

      const dayIntervalStart = new Date(current);
      dayIntervalStart.setHours(Math.floor(interval.startMinutes / 60), interval.startMinutes % 60, 0, 0);

      const dayIntervalEnd = new Date(current);
      dayIntervalEnd.setHours(Math.floor(interval.endMinutes / 60), interval.endMinutes % 60, 0, 0);

      if (current < dayIntervalStart) {
        current = new Date(dayIntervalStart);
      }

      if (current >= dayIntervalEnd) {
        continue;
      }

      const availableMinutes = Math.floor((dayIntervalEnd - current) / (1000 * 60));

      if (remainingMinutes <= availableMinutes) {
        current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= availableMinutes;
        current = new Date(dayIntervalEnd);
      }
    }

    if (remainingMinutes > 0) {
      current.setDate(current.getDate() + 1);
      current.setHours(DEFAULT_WORK_START_HOUR, 0, 0, 0);
      daysSafeguard--;
    }
  }

  return current;
}

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
  toTimeZone,
  isHoliday,
  calculateBusinessMinutes,
  calculateBusinessHours,
  addBusinessMinutes
};
