/**
 * PM Surya Ghar calculator: every subsidy band (1 kW / 2 kW / 3 kW+ /
 * roof-capped / clamped), payback math and validation paths.
 */
import { describe, expect, it } from 'vitest';
import type { AppError } from '../errors';
import type { Result } from '../result';
import { calculateSuryaGhar } from '../surya-ghar';
import type { SuryaGharResult } from '../types';

function unwrap(result: Result<SuryaGharResult, AppError>): SuryaGharResult {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

describe('calculateSuryaGhar — subsidy bands', () => {
  it('1 kW band: 100 units/month (small flat)', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 100 })); // round(100/120) = 1
    expect(r.recommendedKw).toBe(1);
    expect(r.subsidyInr).toBe(30_000);
    expect(r.capexInr).toBe(55_000);
    expect(r.netCostInr).toBe(25_000);
    expect(r.annualGenerationKwh).toBe(1450);
    // Saving capped at consumption: min(1450, 1200) × ₹7 default tariff.
    expect(r.annualSavingInr).toBe(8400);
    expect(r.paybackYears).toBe(3); // 25000 / 8400 = 2.976 → 3.0
    expect(r.co2AvoidedKgPerYear).toBe(1038); // 1450 × 0.716
  });

  it('2 kW band: 250 units/month (typical 2BHK)', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 250 })); // round(250/120) = 2
    expect(r.recommendedKw).toBe(2);
    expect(r.subsidyInr).toBe(60_000);
    expect(r.netCostInr).toBe(50_000); // 110000 − 60000
    expect(r.annualSavingInr).toBe(20_300); // min(2900, 3000) × 7
    expect(r.paybackYears).toBe(2.5); // 50000 / 20300 = 2.463 → 2.5
  });

  it('3 kW+ band caps the central subsidy at ₹78,000', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 350 })); // round(350/120) = 3
    expect(r.recommendedKw).toBe(3);
    expect(r.subsidyInr).toBe(78_000);
    expect(r.netCostInr).toBe(87_000); // 165000 − 78000
    expect(r.annualSavingInr).toBe(29_400); // min(4350, 4200) × 7
    expect(r.paybackYears).toBe(3); // 87000 / 29400 = 2.959 → 3.0
  });

  it('roof area caps the system: 600 units but only 250 sq ft → 2 kW', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 600, roofAreaSqFt: 250 }));
    expect(r.recommendedKw).toBe(2); // floor(250/100) beats round(600/120) = 5
    expect(r.subsidyInr).toBe(60_000);
  });

  it('a tiny 80 sq ft roof still yields the 1 kW minimum system', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 500, roofAreaSqFt: 80 }));
    expect(r.recommendedKw).toBe(1);
  });

  it('clamps very heavy consumers to the 10 kW residential ceiling', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 2000 })); // round(2000/120) = 17 → 10
    expect(r.recommendedKw).toBe(10);
    expect(r.subsidyInr).toBe(78_000);
    expect(r.co2AvoidedKgPerYear).toBe(10_382); // 14500 × 0.716
    expect(r.paybackYears).toBe(4.7); // 472000 / 101500 = 4.65 → 4.7
  });

  it('honours a custom tariff', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 100, tariffPerUnit: 8 }));
    expect(r.annualSavingInr).toBe(9600); // 1200 × 8
  });
});

describe('calculateSuryaGhar — guidance payload and validation', () => {
  it('ships the 6-step checklist, portal link, 300-unit note and loan note', () => {
    const r = unwrap(calculateSuryaGhar({ monthlyUnits: 300 }));
    expect(r.checklist).toHaveLength(6);
    expect(r.portalUrl).toBe('https://pmsuryaghar.gov.in');
    expect(r.freeUnitsNote).toContain('300');
    expect(r.loanNote).toContain('7%');
  });

  it('rejects monthlyUnits below 30 and above 2000', () => {
    const low = calculateSuryaGhar({ monthlyUnits: 20 });
    expect(!low.ok && low.error.code).toBe('VALIDATION_FAILED');
    const high = calculateSuryaGhar({ monthlyUnits: 2500 });
    expect(!high.ok && high.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a roof smaller than 80 sq ft', () => {
    const result = calculateSuryaGhar({ monthlyUnits: 200, roofAreaSqFt: 50 });
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });
});
