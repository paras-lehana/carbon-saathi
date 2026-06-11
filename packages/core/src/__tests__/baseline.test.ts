/**
 * Baseline calculator contract: exact category math from EMISSION_FACTORS for
 * two realistic Indian households, plus error paths.
 */
import { describe, expect, it } from 'vitest';
import { calculateBaselineFootprint } from '../baseline';
import type { AppError } from '../errors';
import type { Result } from '../result';
import type { BaselineSurveyInput } from '../types';

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}: ${result.error.message}`);
  return result.value;
}

// A 3-person Dwarka household: metered 250 kWh, one LPG cylinder/month,
// 12 km metro commute, two short flights a year, vegetarian.
const metroCommuter: BaselineSurveyInput = {
  householdSize: 3,
  monthlyElectricityKwh: 250,
  lpgCylindersPerMonth: 1,
  commuteMode: 'metro',
  commuteKmOneWay: 12,
  commuteDaysPerWeek: 5,
  flightsShortPerYear: 2,
  flightsLongPerYear: 0,
  dietPattern: 'vegetarian',
  shoppingLevel: 'medium',
  acHoursPerDay: 4,
  state: 'Delhi',
};

// A 4-person Gurugram family running an SUV-class petrol car (the survey
// contract has no 'suv' commute mode — the 0.21 SUV factor is asserted in
// emission-factors tests). Bill-based electricity, carpool of 2.
const suvFamily: BaselineSurveyInput = {
  householdSize: 4,
  monthlyBillInr: 4200, // → 600 kWh at the ₹7/unit derivation
  lpgCylindersPerMonth: 2,
  commuteMode: 'car-petrol',
  commuteKmOneWay: 15,
  commuteDaysPerWeek: 6,
  carpoolSize: 2,
  flightsShortPerYear: 0,
  flightsLongPerYear: 1,
  dietPattern: 'nonveg-weekly',
  shoppingLevel: 'high',
  acHoursPerDay: 8,
  state: 'Haryana',
};

describe('calculateBaselineFootprint — Delhi metro commuter', () => {
  const baseline = unwrap(calculateBaselineFootprint(metroCommuter));

  it('computes homeEnergy exactly: (250×12×0.716 + 1×12×42.3) / 3', () => {
    expect(baseline.byCategory.homeEnergy).toBe(885); // 2655.6 / 3 = 885.2 → 885
  });

  it('computes transport exactly: metro 0.015×12×2×5×48 + 2 short flights', () => {
    // 86.4 commute + 2×1100×0.121 = 266.2 flights = 352.6 → 353
    expect(baseline.byCategory.transport).toBe(353);
  });

  it('uses the per-diet and shopping annual figures', () => {
    expect(baseline.byCategory.food).toBe(550);
    expect(baseline.byCategory.shopping).toBe(600);
  });

  it('totals categories and benchmarks vs India averages', () => {
    expect(baseline.totalKgAnnual).toBe(2388);
    expect(baseline.vsIndiaAverage).toBe(1.19); // 2388 / 2000
    expect(baseline.vsUrbanAffluent).toBe(0.6); // 2388 / 4000
  });

  it('identifies homeEnergy as the top driver and returns exactly 3 tips', () => {
    expect(baseline.topDriver).toBe('homeEnergy');
    expect(baseline.generatedTips).toHaveLength(3);
  });
});

describe('calculateBaselineFootprint — SUV-class family', () => {
  const baseline = unwrap(calculateBaselineFootprint(suvFamily));

  it('derives kWh from the rupee bill: (600×12×0.716 + 2×12×42.3) / 4', () => {
    expect(baseline.byCategory.homeEnergy).toBe(1543); // 6170.4 / 4 = 1542.6 → 1543
  });

  it('halves car commute emissions for a 2-person carpool and adds the return long flight', () => {
    // 0.17×15×2×6×48 / 2 = 734.4 commute + 4500×0.121×2 = 1089 flight → 1823.4 → 1823
    expect(baseline.byCategory.transport).toBe(1823);
  });

  it('totals to an affluent-urban profile with transport as top driver', () => {
    expect(baseline.totalKgAnnual).toBe(5366); // 1543 + 1823 + 800 + 1200
    expect(baseline.topDriver).toBe('transport');
    expect(baseline.vsIndiaAverage).toBe(2.68);
    expect(baseline.vsUrbanAffluent).toBe(1.34);
  });

  it('tips react to the survey: AC discipline and the EV Coach are suggested', () => {
    expect(baseline.generatedTips.some((tip) => tip.includes('AC'))).toBe(true);
    expect(baseline.generatedTips.some((tip) => tip.includes('EV Coach'))).toBe(true);
  });

  it('bill-derived kWh matches an explicitly metered 600 kWh survey', () => {
    const metered = unwrap(
      calculateBaselineFootprint({
        ...suvFamily,
        monthlyBillInr: undefined,
        monthlyElectricityKwh: 600,
      }),
    );
    expect(metered.byCategory.homeEnergy).toBe(baseline.byCategory.homeEnergy);
  });
});

describe('calculateBaselineFootprint — edge cases', () => {
  it('wfh commute contributes zero — transport is flights only', () => {
    const wfh = unwrap(
      calculateBaselineFootprint({
        ...metroCommuter,
        commuteMode: 'wfh',
        flightsShortPerYear: 1,
        flightsLongPerYear: 0,
      }),
    );
    expect(wfh.byCategory.transport).toBe(133); // 1×1100×0.121 = 133.1 → 133
  });

  it('rejects a survey with neither kWh nor bill', () => {
    const result = calculateBaselineFootprint({
      ...metroCommuter,
      monthlyElectricityKwh: undefined,
      monthlyBillInr: undefined,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects an out-of-range household size', () => {
    const result = calculateBaselineFootprint({ ...metroCommuter, householdSize: 0 });
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });
});
