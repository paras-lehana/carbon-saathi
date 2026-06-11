/**
 * Action catalog contract: all 12 actions, the 10-points-per-kg invariant,
 * per-log impact math and quantity/id rejection paths.
 */
import { describe, expect, it } from 'vitest';
import { ACTION_CATALOG, calculateActionImpact, getActionById } from '../actions';

// Spec §3.3 per-unit savings — any drift in the catalog fails here.
const EXPECTED_CO2_PER_UNIT: Record<string, number> = {
  'metro-instead-of-car': 1.55,
  'carpool-commute': 0.85,
  'cycle-or-walk-short': 0.85,
  'bus-instead-of-car': 1.2,
  'wfh-day': 3.4,
  'veg-day': 0.8,
  'home-cooked-day': 0.5,
  'ac-plus-one-degree': 0.9,
  'no-ac-evening': 1.07,
  'led-swap': 0.35,
  'cold-wash-laundry': 0.36,
  'line-dry': 0.7,
};

describe('ACTION_CATALOG', () => {
  it('contains exactly the 12 contracted actions with unique ids', () => {
    expect(ACTION_CATALOG).toHaveLength(12);
    expect(new Set(ACTION_CATALOG.map((a) => a.id)).size).toBe(12);
    for (const id of Object.keys(EXPECTED_CO2_PER_UNIT)) {
      expect(getActionById(id)?.co2SavedKg).toBe(EXPECTED_CO2_PER_UNIT[id]);
    }
  });

  it('keeps the pointsPerUnit = round(co2 × 10) invariant on every action', () => {
    for (const action of ACTION_CATALOG) {
      expect(action.pointsPerUnit).toBe(Math.round(action.co2SavedKg * 10));
      expect(action.maxPerDay).toBeGreaterThanOrEqual(1);
      expect(action.description.length).toBeGreaterThan(0);
    }
  });
});

describe('calculateActionImpact', () => {
  it('returns the catalog savings and points for quantity 1 on all 12 actions', () => {
    for (const [id, co2] of Object.entries(EXPECTED_CO2_PER_UNIT)) {
      const result = calculateActionImpact(id, 1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.co2SavedKg).toBe(co2);
        expect(result.value.points).toBe(Math.round(co2 * 10));
      }
    }
  });

  it('scales linearly with quantity (2 metro trips)', () => {
    const result = calculateActionImpact('metro-instead-of-car', 2);
    expect(result.ok && result.value.co2SavedKg).toBe(3.1);
    expect(result.ok && result.value.points).toBe(32);
  });

  it('accepts a quantity equal to the daily cap', () => {
    const cap = getActionById('led-swap')?.maxPerDay ?? 0;
    expect(calculateActionImpact('led-swap', cap).ok).toBe(true);
  });

  it('rejects an unknown action id with NOT_FOUND', () => {
    const result = calculateActionImpact('plant-a-datacenter', 1);
    expect(!result.ok && result.error.code).toBe('NOT_FOUND');
  });

  it('rejects zero, negative, fractional and over-cap quantities', () => {
    const zero = calculateActionImpact('veg-day', 0);
    expect(!zero.ok && zero.error.code).toBe('VALIDATION_FAILED');
    const negative = calculateActionImpact('veg-day', -2);
    expect(!negative.ok && negative.error.code).toBe('VALIDATION_FAILED');
    const fractional = calculateActionImpact('veg-day', 1.5);
    expect(!fractional.ok && fractional.error.code).toBe('VALIDATION_FAILED');
    const overCap = calculateActionImpact('wfh-day', 2); // maxPerDay = 1
    expect(!overCap.ok && overCap.error.code).toBe('VALIDATION_FAILED');
  });
});
