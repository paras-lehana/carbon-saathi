/**
 * Commute comparison: contracted mode ordering, exact per-mode CO2/cost math
 * for a 10 km commute, and distance validation.
 */
import { describe, expect, it } from 'vitest';
import { estimateCommuteModes } from '../commute';
import type { AppError } from '../errors';
import type { Result } from '../result';
import type { CommuteModeEstimate } from '../types';

function unwrap(result: Result<CommuteModeEstimate[], AppError>): CommuteModeEstimate[] {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

describe('estimateCommuteModes', () => {
  const modes = unwrap(estimateCommuteModes(10));

  it('returns the seven modes in the contracted order', () => {
    expect(modes.map((m) => m.mode)).toEqual([
      'car-petrol',
      'car-cng',
      'two-wheeler',
      'ev-2w',
      'bus',
      'metro',
      'cycle-walk',
    ]);
  });

  it('computes the petrol car round trip exactly', () => {
    const car = modes[0];
    expect(car.co2Kg).toBe(3.4); // 0.17 × 10 km × 2
    expect(car.costInr).toBe(50); // ₹2.5/km × 20 km
    expect(car.annualKgIfDaily).toBe(1122); // 3.4 × 330 days
  });

  it('computes the metro round trip exactly', () => {
    const metro = modes[5];
    expect(metro.co2Kg).toBe(0.3); // 0.015 × 20
    expect(metro.costInr).toBe(8); // ₹0.4/km × 20
    expect(metro.annualKgIfDaily).toBe(99);
  });

  it('prices the electric two-wheeler at ₹0.25/km', () => {
    const ev2w = modes[3];
    expect(ev2w.co2Kg).toBe(0.42); // 0.021 × 20
    expect(ev2w.costInr).toBe(5);
    expect(ev2w.annualKgIfDaily).toBe(139); // 0.42 × 330 = 138.6
  });

  it('cycle-walk is free and zero-emission', () => {
    const active = modes[6];
    expect(active.co2Kg).toBe(0);
    expect(active.costInr).toBe(0);
    expect(active.annualKgIfDaily).toBe(0);
  });

  it('rejects non-positive and absurd distances', () => {
    const zero = estimateCommuteModes(0);
    expect(!zero.ok && zero.error.code).toBe('VALIDATION_FAILED');
    const tooFar = estimateCommuteModes(600);
    expect(!tooFar.ok && tooFar.error.code).toBe('VALIDATION_FAILED');
  });
});
