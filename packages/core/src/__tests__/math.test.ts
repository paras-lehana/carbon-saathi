/**
 * round2: the shared two-decimal rounding contract used by every calculator
 * and route that reports user-facing CO2 or money figures.
 */
import { describe, expect, it } from 'vitest';
import * as core from '../index';
import { round2 } from '../math';

describe('round2', () => {
  it('rounds to two decimal places', () => {
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(3.456)).toBe(3.46);
  });

  it('flattens binary float noise from accumulation', () => {
    // 0.1 + 0.2 === 0.30000000000000004 — ledgers sum these all day long.
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('leaves integers and exact two-decimal values untouched', () => {
    expect(round2(10)).toBe(10);
    expect(round2(7.25)).toBe(7.25);
  });

  it('is exported from the package barrel', () => {
    expect(core.round2).toBe(round2);
  });
});
