/**
 * IST day arithmetic shared by every route that reasons about "today" or
 * "this week". India is UTC+5:30 and this is an India-only product: slicing
 * raw UTC ISO strings would roll streaks, daily caps, pledges and weekly
 * missions over at 05:30 IST instead of midnight — so all day boundaries
 * shift to IST before slicing. Pure functions of the injected clock.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30, no DST in India

/** Calendar date (YYYY-MM-DD) in IST for the given epoch milliseconds. */
export function istDayISO(nowMs: number): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Monday of the current IST week (YYYY-MM-DD) — anchors weekly missions. */
export function istWeekStartISO(nowMs: number): string {
  const ist = new Date(nowMs + IST_OFFSET_MS);
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  const monday = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate() - daysSinceMonday,
  );
  return new Date(monday).toISOString().slice(0, 10);
}
