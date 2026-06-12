/**
 * IST day arithmetic: day and week boundaries must roll at midnight IST
 * (18:30 UTC), not midnight UTC — streaks, daily caps, pledges and weekly
 * missions all hang off these two functions.
 */
import { describe, expect, it } from 'vitest';
import { istDayISO, istWeekStartISO } from '../services/time';

describe('istDayISO', () => {
  it('keeps a plain mid-day instant on its own date', () => {
    // 06:30Z + 5:30 = 12:00 IST, same calendar day.
    expect(istDayISO(Date.parse('2026-06-12T06:30:00.000Z'))).toBe('2026-06-12');
  });

  it('rolls to the next IST day from 18:30 UTC onwards', () => {
    // 19:30Z + 5:30 = 01:00 IST on the 12th — IST is already tomorrow.
    expect(istDayISO(Date.parse('2026-06-11T19:30:00.000Z'))).toBe('2026-06-12');
  });

  it('stays on the same IST day one second before the boundary', () => {
    // 18:29:59Z + 5:30 = 23:59:59 IST — still the 11th.
    expect(istDayISO(Date.parse('2026-06-11T18:29:59.000Z'))).toBe('2026-06-11');
  });
});

describe('istWeekStartISO', () => {
  it('anchors a mid-week instant to that week’s IST Monday', () => {
    // 2026-06-10 is a Wednesday (noon IST) → the week began Monday the 8th.
    expect(istWeekStartISO(Date.parse('2026-06-10T06:30:00.000Z'))).toBe('2026-06-08');
  });

  it('flips to the new week at Sunday 18:30 UTC — Monday 00:00 IST', () => {
    // 2026-06-14 is a Sunday in UTC; +5:30 lands exactly on Monday 00:00 IST,
    // so the IST week starting 2026-06-15 has begun.
    expect(istWeekStartISO(Date.parse('2026-06-14T18:30:00.000Z'))).toBe('2026-06-15');
    // One minute earlier it is still Sunday 23:59 IST → the prior Monday.
    expect(istWeekStartISO(Date.parse('2026-06-14T18:29:00.000Z'))).toBe('2026-06-08');
  });
});
