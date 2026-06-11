/**
 * EV-fit advisor: every branch of the decision tree with exact CO2 and rupee
 * savings, the first-vehicle counterfactual, and validation paths.
 */
import { describe, expect, it } from 'vitest';
import type { AppError } from '../errors';
import { calculateEvFit } from '../ev-fit';
import type { Result } from '../result';
import type { EvFitInput, EvFitResult } from '../types';

function unwrap(result: Result<EvFitResult, AppError>): EvFitResult {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

const base: EvFitInput = {
  dailyKm: 25,
  currentVehicle: 'car-petrol',
  hasHomeCharging: false,
  hasOfficeCharging: false,
  longTripsPerMonth: 0,
  cityTier: 1,
};

describe('calculateEvFit — decision branches', () => {
  it('< 8 km/day with no charging → public-transport-first', () => {
    const r = unwrap(calculateEvFit({ ...base, dailyKm: 5 }));
    expect(r.recommendation).toBe('public-transport-first');
    expect(r.annualCo2SavedKg).toBe(256); // (0.17 − 0.015 metro) × 5 × 330 = 255.75
    expect(r.annualFuelSavingInr).toBe(3465); // (2.5 − 0.4) × 5 × 330
    expect(r.confidence).toBe('high');
  });

  it('current two-wheeler rider → ev-two-wheeler even at 50 km/day', () => {
    const r = unwrap(
      calculateEvFit({ ...base, currentVehicle: 'two-wheeler', dailyKm: 50, hasHomeCharging: true }),
    );
    expect(r.recommendation).toBe('ev-two-wheeler');
    expect(r.annualCo2SavedKg).toBe(396); // (0.045 − 0.021) × 50 × 330
    expect(r.annualFuelSavingInr).toBe(28_875); // (2.0 − 0.25) × 50 × 330
    expect(r.confidence).toBe('high');
  });

  it('car driver at ≤30 km/day → ev-two-wheeler (downsizing beats electrifying the car)', () => {
    const r = unwrap(calculateEvFit({ ...base, dailyKm: 25 }));
    expect(r.recommendation).toBe('ev-two-wheeler');
    expect(r.annualCo2SavedKg).toBe(1229); // (0.17 − 0.021) × 25 × 330 = 1229.25
    expect(r.annualFuelSavingInr).toBe(18_563); // (2.5 − 0.25) × 25 × 330 = 18562.5
  });

  it('≤80 km/day with home charging → ev-car', () => {
    const r = unwrap(calculateEvFit({ ...base, dailyKm: 60, hasHomeCharging: true }));
    expect(r.recommendation).toBe('ev-car');
    expect(r.annualCo2SavedKg).toBe(1663); // (0.17 − 0.086) × 60 × 330 = 1663.2
    expect(r.annualFuelSavingInr).toBe(31_680); // (2.5 − 0.9) × 60 × 330
    expect(r.confidence).toBe('high');
  });

  it('>80 km/day, frequent long trips, no charging → hybrid', () => {
    const r = unwrap(
      calculateEvFit({ ...base, currentVehicle: 'car-diesel', dailyKm: 100, longTripsPerMonth: 6 }),
    );
    expect(r.recommendation).toBe('hybrid');
    expect(r.annualCo2SavedKg).toBe(1353); // (0.16 − 0.119 hybrid) × 100 × 330
    expect(r.annualFuelSavingInr).toBe(14_850); // (2.2 diesel − 1.75) × 100 × 330
    expect(r.confidence).toBe('medium');
  });

  it('>80 km/day, few long trips, no charging → ev-car-with-planning', () => {
    const r = unwrap(calculateEvFit({ ...base, dailyKm: 100, longTripsPerMonth: 2 }));
    expect(r.recommendation).toBe('ev-car-with-planning');
    expect(r.annualCo2SavedKg).toBe(2772); // (0.17 − 0.086) × 100 × 330
    expect(r.annualFuelSavingInr).toBe(52_800); // (2.5 − 0.9) × 100 × 330
    expect(r.confidence).toBe('medium');
  });

  it('office charging counts as charging access', () => {
    const r = unwrap(calculateEvFit({ ...base, dailyKm: 60, hasOfficeCharging: true }));
    expect(r.recommendation).toBe('ev-car');
  });
});

describe('calculateEvFit — first-vehicle counterfactual and notes', () => {
  it("'none' at 20 km/day compares against the petrol 2W they would buy", () => {
    const r = unwrap(calculateEvFit({ ...base, currentVehicle: 'none', dailyKm: 20 }));
    expect(r.recommendation).toBe('ev-two-wheeler');
    expect(r.annualCo2SavedKg).toBe(158); // (0.045 − 0.021) × 20 × 330 = 158.4
    expect(r.annualFuelSavingInr).toBe(11_550); // (2.0 − 0.25) × 20 × 330
  });

  it('fameNote names PM E-DRIVE and adapts to the city tier', () => {
    const tier3 = unwrap(calculateEvFit({ ...base, cityTier: 3 }));
    expect(tier3.fameNote).toContain('PM E-DRIVE');
    expect(tier3.fameNote).toContain('tier-3');
  });

  it('rejects out-of-range dailyKm and longTripsPerMonth', () => {
    const km = calculateEvFit({ ...base, dailyKm: 0 });
    expect(!km.ok && km.error.code).toBe('VALIDATION_FAILED');
    const trips = calculateEvFit({ ...base, longTripsPerMonth: 25 });
    expect(!trips.ok && trips.error.code).toBe('VALIDATION_FAILED');
  });
});
