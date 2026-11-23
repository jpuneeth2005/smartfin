'use strict';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30 in ms

/**
 * Extract IST calendar components for a given date or timestamp
 */
function getISTParts(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth() + 1,
    day: istDate.getUTCDate(),
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes(),
    seconds: istDate.getUTCSeconds(),
  };
}

/**
 * Parse 'YYYY-MM-DD' into Date at 00:00:00.000 IST
 */
function parseDateInput(input) {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const dateStr = input.slice(0, 10);
    const date = new Date(`${dateStr}T00:00:00.000+05:30`);
    if (isNaN(date.getTime())) throw new Error(`Invalid date: ${input}`);
    return date;
  }
  const { year, month, day } = getISTParts(input);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return new Date(`${year}-${m}-${d}T00:00:00.000+05:30`);
}

/**
 * Returns start of day in IST (00:00:00.000 IST)
 */
function startOfDayIST(date = new Date()) {
  const { year, month, day } = getISTParts(date);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return new Date(`${year}-${m}-${d}T00:00:00.000+05:30`);
}

/**
 * Returns end of day in IST (23:59:59.999 IST)
 */
function endOfDayIST(date = new Date()) {
  const { year, month, day } = getISTParts(date);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return new Date(`${year}-${m}-${d}T23:59:59.999+05:30`);
}

/**
 * Returns { start, end } for today in IST
 */
function todayRange() {
  const now = new Date();
  return {
    start: startOfDayIST(now),
    end: endOfDayIST(now),
  };
}

/**
 * Returns 'YYYY-MM' key for the given date in IST
 */
function currentMonthKey(date = new Date()) {
  const { year, month } = getISTParts(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Returns { start, end } for monthStr ('YYYY-MM') in IST
 */
function monthRange(monthStr) {
  const targetMonth = monthStr || currentMonthKey();
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    throw new Error(`Invalid month format "${targetMonth}". Expected YYYY-MM`);
  }
  const [y, m] = targetMonth.split('-').map(Number);
  const start = new Date(`${targetMonth}-01T00:00:00.000+05:30`);

  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  const nextStart = new Date(`${nextMonthStr}-01T00:00:00.000+05:30`);
  const end = new Date(nextStart.getTime() - 1);

  return { start, end };
}

module.exports = {
  IST_OFFSET_MS,
  getISTParts,
  parseDateInput,
  startOfDayIST,
  endOfDayIST,
  todayRange,
  monthRange,
  currentMonthKey,
};
