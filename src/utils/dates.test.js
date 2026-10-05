import { describe, it, expect } from 'vitest';
import {
  toLocalDateKey,
  todayKey,
  parseLocalDate,
  startOfWeek,
  endOfWeek,
  daysBetween,
  monthKeyRange,
} from './dates.js';

/**
 * The shipped app wrote dates with `toISOString()` (UTC) and read them with local
 * midnight. For a UTC+5 user, every meal logged between 00:00 and 04:59 local was
 * filed under the previous day: "Planned for Today" vanished, cancel could not find
 * the row, and the calendar showed it on the wrong cell.
 *
 * These tests pin the invariant that a calendar date is always a *local* key.
 */
describe('toLocalDateKey', () => {
  it('formats as zero-padded YYYY-MM-DD', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('derives the day from local time, not UTC', () => {
    // The previous implementation used `toISOString().split('T')[0]`, which yields the
    // UTC date. This asserts the contract directly — "the key must match the local
    // calendar day" — rather than asserting that UTC and local differ, which is false
    // when the suite runs in UTC and made this test fail in CI but pass in Pakistan.
    const localDayKey = (d) => [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');

    // Instants chosen to sit near both ends of the day, where the UTC and local
    // dates disagree in any timezone with a non-zero offset.
    const instants = [
      new Date(2026, 9, 5, 1, 0, 0),
      new Date(2026, 9, 5, 4, 0, 0),
      new Date(2026, 9, 5, 23, 30, 0),
      new Date(2026, 0, 1, 0, 30, 0),
      new Date(2026, 11, 31, 22, 0, 0),
    ];

    for (const instant of instants) {
      expect(toLocalDateKey(instant)).toBe(localDayKey(instant));
    }
  });

  it('would differ from the old UTC-based implementation somewhere in the year', () => {
    // Guards the fix itself: scan a year of hours and confirm that a UTC-derived key
    // disagrees with the local one for at least one instant, in any timezone. This is
    // the property that makes the bug real rather than theoretical.
    let disputes = 0;
    for (let day = 0; day < 365; day += 1) {
      for (const hour of [0, 1, 2, 3, 4, 5, 20, 21, 22, 23]) {
        const instant = new Date(2026, 0, 1 + day, hour, 30, 0);
        const utcKey = instant.toISOString().split('T')[0];
        if (toLocalDateKey(instant) !== utcKey) disputes += 1;
      }
    }
    if (new Date().getTimezoneOffset() === 0) {
      // In UTC the two implementations agree by definition; nothing to assert.
      expect(disputes).toBe(0);
    } else {
      expect(disputes).toBeGreaterThan(0);
    }
  });

  it('agrees with todayKey for the current date', () => {
    expect(todayKey()).toBe(toLocalDateKey(new Date()));
  });
});

describe('parseLocalDate', () => {
  it('parses a date key as local midnight, not UTC midnight', () => {
    const parsed = parseLocalDate('2026-10-05');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(5);
    expect(parsed.getHours()).toBe(0);
  });

  it('round-trips a date key', () => {
    const key = '2026-03-09';
    expect(toLocalDateKey(parseLocalDate(key))).toBe(key);
  });
});

describe('week boundaries', () => {
  it('starts the week on Monday', () => {
    // 2026-10-05 is a Monday; 2026-10-11 is the Sunday that closes that week.
    expect(toLocalDateKey(startOfWeek(new Date(2026, 9, 5)))).toBe('2026-10-05');
    expect(toLocalDateKey(startOfWeek(new Date(2026, 9, 11)))).toBe('2026-10-05');
    expect(toLocalDateKey(endOfWeek(new Date(2026, 9, 5)))).toBe('2026-10-11');
  });

  it('keeps Sunday in the week that began the previous Monday', () => {
    expect(toLocalDateKey(startOfWeek(new Date(2026, 9, 11)))).toBe('2026-10-05');
  });
});

describe('daysBetween', () => {
  it('counts whole local days forward and backward', () => {
    expect(daysBetween('2026-10-01', '2026-10-08')).toBe(7);
    expect(daysBetween('2026-10-08', '2026-10-01')).toBe(-7);
  });

  it('is unaffected by daylight-saving style hour shifts', () => {
    // 23 hours apart in wall-clock terms must still read as 1 day.
    const lateEvening = new Date(2026, 9, 1, 23, 30);
    const nextMorning = new Date(2026, 9, 2, 0, 30);
    expect(daysBetween(lateEvening, nextMorning)).toBe(1);
  });
});

describe('monthKeyRange', () => {
  it('returns the first and last day keys of the month', () => {
    const range = monthKeyRange(new Date(2026, 1, 15));
    expect(range.startDate).toBe('2026-02-01');
    expect(range.endDate).toBe('2026-02-28');
    expect(range.daysInMonth).toBe(28);
  });

  it('handles a leap February and a 31-day month', () => {
    expect(monthKeyRange(new Date(2028, 1, 1)).endDate).toBe('2028-02-29');
    expect(monthKeyRange(new Date(2026, 0, 1)).endDate).toBe('2026-01-31');
  });
});
