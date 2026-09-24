// Whether US Daylight Saving is in effect on a given date, using the US
// federal rule in effect since 2007: DST starts the 2nd Sunday of March and
// ends the 1st Sunday of November (both transitions at 2 AM US local time).
// This drives which of AttendanceSettings.expectedStartTime /
// expectedStartTimeDst applies on a given day, since this company's shift
// is aligned to fixed US client hours even though India itself never
// observes DST.
//
// This is a calendar-date approximation (it doesn't model the exact 2 AM
// US-Eastern transition instant), which is more than precise enough for a
// once-a-day attendance policy — the only days it could matter are the two
// transition days themselves, and even then only for the ~10.5-hour window
// between the US transition instant and the next IST midnight.
function nthSundayOfMonthUTC(year: number, monthIndex0: number, n: number): Date {
  const first = new Date(Date.UTC(year, monthIndex0, 1));
  const firstSundayOffset = (7 - first.getUTCDay()) % 7;
  const firstSundayDate = 1 + firstSundayOffset;
  return new Date(Date.UTC(year, monthIndex0, firstSundayDate + (n - 1) * 7));
}

export function isUsDaylightSaving(date: Date): boolean {
  const year = date.getUTCFullYear();
  const dstStart = nthSundayOfMonthUTC(year, 2, 2); // 2nd Sunday of March
  const dstEnd = nthSundayOfMonthUTC(year, 10, 1); // 1st Sunday of November
  return date.getTime() >= dstStart.getTime() && date.getTime() < dstEnd.getTime();
}
