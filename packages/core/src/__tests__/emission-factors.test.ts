/** Emission factors: exact spec values plus provenance on every entry. */
import { describe, expect, it } from 'vitest';
import { EMISSION_FACTORS } from '../emission-factors';

describe('emission-factors', () => {
  it('matches the contracted India-specific values', () => {
    expect(EMISSION_FACTORS.gridElectricity.value).toBe(0.716);
    expect(EMISSION_FACTORS.lpgCylinder14kg.value).toBe(42.3);
    expect(EMISSION_FACTORS.suv.value).toBe(0.21);
    expect(EMISSION_FACTORS.metroPerPax.value).toBe(0.015);
    expect(EMISSION_FACTORS.evCarPerKm.value).toBe(0.086);
    expect(EMISSION_FACTORS.flightDomestic.value).toBe(0.121);
    expect(EMISSION_FACTORS.treeAbsorptionPerYear.value).toBe(21);
    expect(EMISSION_FACTORS.solarGenPerKwYear.value).toBe(1450);
    expect(EMISSION_FACTORS.indiaPerCapitaAnnual.value).toBe(2000);
    expect(EMISSION_FACTORS.indiaUrbanAffluentAnnual.value).toBe(4000);
  });

  it('every factor is positive and carries a unit and a source annotation', () => {
    for (const factor of Object.values(EMISSION_FACTORS)) {
      expect(factor.value).toBeGreaterThan(0);
      expect(factor.unit.length).toBeGreaterThan(0);
      expect(factor.source.length).toBeGreaterThan(0);
    }
  });
});
