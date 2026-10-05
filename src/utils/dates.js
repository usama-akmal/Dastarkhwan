/**
 * Local-date helpers.
 *
 * Why this module exists: the app originally mixed UTC and local calendar dates.
 * `new Date().toISOString().split('T')[0]` yields the UTC date, while every read
 * path (week boundaries, calendar cells, "is this today?") uses local midnight.
 * For a Pakistan (UTC+5) user that meant every meal logged between 00:00 and 04:59
 * local was stored under the *previous* day, hiding the "Planned for Today" state,
 * breaking cancel, and misplacing the entry on the calendar.
 *
 * Rule for the whole codebase: a calendar date is always a local `YYYY-MM-DD`
 * string, produced by `toLocalDateKey` and consumed by `parseLocalDate`.
 * Never call `.toISOString()` on a date that represents a calendar day.
 */

/** Format a Date as a local `YYYY-MM-DD` key. */
export function toLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local `YYYY-MM-DD` key. */
export function todayKey() {
  return toLocalDateKey(new Date());
}

/**
 * Parse a `YYYY-MM-DD` key as *local* midnight.
 * `new Date('2026-10-05')` parses as UTC midnight, which shifts the day for every
 * timezone behind UTC; this avoids that.
 */
export function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/** Start of the local day containing `date`. */
export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of the local day containing `date`. */
export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Monday-based start of the local week containing `date`. */
export function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
}

/** Sunday-based end of the local week containing `date`. */
export function endOfWeek(date = new Date()) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Whole days between two calendar dates, counted on local midnights. */
export function daysBetween(from, to) {
  const a = startOfDay(parseLocalDate(from));
  const b = startOfDay(parseLocalDate(to));
  return Math.round((b - a) / 86400000);
}

/** Local `YYYY-MM-01` .. `YYYY-MM-<last>` keys for the month containing `date`. */
export function monthKeyRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return {
    startDate: `${prefix}-01`,
    endDate: `${prefix}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
    firstDayOfWeek: new Date(year, month, 1).getDay(),
  };
}
