export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Working-day count between start and end inclusive, excluding Sat/Sun and
// any date present in holidayDates (a Set of "YYYY-MM-DD" strings).
export function countWorkingDays(start: Date, end: Date, holidayDates: Set<string>): number {
  let count = 0;
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur <= last) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6 && !holidayDates.has(toISODate(cur))) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

// Completed months credited toward MONTHLY accrual within asOf's calendar
// year: the month someone joins in counts as month 1. Capped 0-12.
export function monthsElapsedInYear(joinDate: Date | null | undefined, asOf: Date): number {
  const yearStart = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1));
  const start = joinDate && joinDate > yearStart ? joinDate : yearStart;
  if (start > asOf) return 0;
  const months =
    (asOf.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - start.getUTCMonth()) +
    1;
  return Math.max(0, Math.min(12, months));
}
