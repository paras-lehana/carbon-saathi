/**
 * PM-KUSUM advisor: component routing (A/B/C), the 30/30/40 subsidy split,
 * diesel displacement math and validation paths.
 */
import { describe, expect, it } from 'vitest';
import type { AppError } from '../errors';
import { adviseKusum } from '../kusum';
import type { Result } from '../result';
import type { KusumResult } from '../types';

function unwrap(result: Result<KusumResult, AppError>): KusumResult {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

describe('adviseKusum — component routing', () => {
  it('diesel pump → Component B with the 30/30/40 split on a 5 HP pump', () => {
    const r = unwrap(
      adviseKusum({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: false,
      }),
    );
    expect(r.component).toBe('B');
    expect(r.estCostInr).toBe(300_000); // ₹60k/HP × 5
    expect(r.subsidyBreakdown.centralPct).toBe(30);
    expect(r.subsidyBreakdown.statePct).toBe(30);
    expect(r.subsidyBreakdown.farmerPct).toBe(40);
    expect(r.subsidyBreakdown.centralInr).toBe(90_000);
    expect(r.subsidyBreakdown.stateInr).toBe(90_000);
    expect(r.subsidyBreakdown.farmerInr).toBe(120_000);
    expect(r.subsidyBreakdown.farmerUpfrontApproxInr).toBe(30_000); // ~10% cash after bank loan
    expect(r.farmerShareInr).toBe(120_000);
  });

  it('diesel pump displaces 720 L/yr → 1930 kg CO2 at 2.68 kg/L', () => {
    const r = unwrap(
      adviseKusum({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: false,
      }),
    );
    expect(r.dieselSavedLitresPerYear).toBe(720);
    expect(r.co2AvoidedKgPerYear).toBe(1930); // 720 × 2.68 = 1929.6
  });

  it('grid pump → Component C, displacing grid electricity instead of diesel', () => {
    const r = unwrap(
      adviseKusum({ farmerType: 'individual', pumpType: 'grid', pumpHp: 5, hasBarrenLand: false }),
    );
    expect(r.component).toBe('C');
    expect(r.dieselSavedLitresPerYear).toBe(0);
    expect(r.co2AvoidedKgPerYear).toBe(1602); // 5 × 0.746 kW × 600 hr × 0.716
  });

  it('no pump → Component B (avoided future diesel pump), cost scaled to 3 HP', () => {
    const r = unwrap(
      adviseKusum({ farmerType: 'group', pumpType: 'none', pumpHp: 3, hasBarrenLand: false }),
    );
    expect(r.component).toBe('B');
    expect(r.estCostInr).toBe(180_000);
    expect(r.farmerShareInr).toBe(72_000);
    expect(r.dieselSavedLitresPerYear).toBe(720);
  });
});

describe('adviseKusum — Component A suggestion', () => {
  it('suggests Component A for 4 acres of barren land at ₹25k/acre/yr', () => {
    const r = unwrap(
      adviseKusum({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: true,
        landAcres: 4,
      }),
    );
    expect(r.componentASuggestion?.component).toBe('A');
    expect(r.componentASuggestion?.estLeaseIncomeInrPerYear).toBe(100_000);
  });

  it('skips Component A below 2 acres or without barren land', () => {
    const small = unwrap(
      adviseKusum({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: true,
        landAcres: 1,
      }),
    );
    expect(small.componentASuggestion).toBeUndefined();
    const noLand = unwrap(
      adviseKusum({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: false,
        landAcres: 4,
      }),
    );
    expect(noLand.componentASuggestion).toBeUndefined();
  });
});

describe('adviseKusum — guidance and validation', () => {
  it('ships a 6-step checklist and the MNRE link', () => {
    const r = unwrap(
      adviseKusum({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: false,
      }),
    );
    expect(r.checklist).toHaveLength(6);
    expect(r.officialLink).toBe('https://mnre.gov.in');
  });

  it('rejects pump horsepower outside 1-10', () => {
    const low = adviseKusum({
      farmerType: 'individual',
      pumpType: 'diesel',
      pumpHp: 0,
      hasBarrenLand: false,
    });
    expect(!low.ok && low.error.code).toBe('VALIDATION_FAILED');
    const high = adviseKusum({
      farmerType: 'individual',
      pumpType: 'diesel',
      pumpHp: 12,
      hasBarrenLand: false,
    });
    expect(!high.ok && high.error.code).toBe('VALIDATION_FAILED');
  });
});
