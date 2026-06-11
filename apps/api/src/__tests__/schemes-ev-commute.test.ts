/**
 * Scheme, EV and commute endpoint tests: exact subsidy bands, KUSUM component
 * routing, the EV decision tree through HTTP, and the deterministic commute
 * fallback when no Maps key is configured.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './helpers';

describe('POST /api/schemes/surya-ghar', () => {
  it('hits the ₹78,000 cap band for a 350-unit household', async () => {
    const res = await request(testApp())
      .post('/api/schemes/surya-ghar')
      .send({ monthlyUnits: 350 });
    expect(res.status).toBe(200);
    const result = res.body.result;
    expect(result.recommendedKw).toBe(3);
    expect(result.subsidyInr).toBe(78_000);
    expect(result.netCostInr).toBe(87_000); // 3×55,000 − 78,000
    expect(result.paybackYears).toBe(3); // 87,000 ÷ (4,200 units × ₹7) → 3.0
    expect(result.co2AvoidedKgPerYear).toBe(3115); // 4,350 kWh × 0.716
    expect(result.portalUrl).toBe('https://pmsuryaghar.gov.in');
  });

  it('recommends 1 kW with ₹30,000 subsidy for a light user', async () => {
    const res = await request(testApp())
      .post('/api/schemes/surya-ghar')
      .send({ monthlyUnits: 100 });
    expect(res.status).toBe(200);
    expect(res.body.result.recommendedKw).toBe(1);
    expect(res.body.result.subsidyInr).toBe(30_000);
  });

  it('rejects out-of-range monthlyUnits with 400', async () => {
    const res = await request(testApp()).post('/api/schemes/surya-ghar').send({ monthlyUnits: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('POST /api/schemes/kusum', () => {
  it('routes a diesel pump to Component B with the 30/30/40 split', async () => {
    const res = await request(testApp()).post('/api/schemes/kusum').send({
      farmerType: 'individual',
      pumpType: 'diesel',
      pumpHp: 5,
      hasBarrenLand: false,
    });
    expect(res.status).toBe(200);
    const result = res.body.result;
    expect(result.component).toBe('B');
    expect(result.estCostInr).toBe(300_000);
    expect(result.farmerShareInr).toBe(120_000);
    expect(result.subsidyBreakdown.farmerUpfrontApproxInr).toBe(30_000);
    expect(result.dieselSavedLitresPerYear).toBe(720);
    expect(result.co2AvoidedKgPerYear).toBe(1930); // 720 L × 2.68 kg/L
  });

  it('routes a grid pump to Component C and suggests Component A for barren land', async () => {
    const res = await request(testApp()).post('/api/schemes/kusum').send({
      farmerType: 'individual',
      pumpType: 'grid',
      pumpHp: 5,
      hasBarrenLand: true,
      landAcres: 3,
    });
    expect(res.status).toBe(200);
    const result = res.body.result;
    expect(result.component).toBe('C');
    expect(result.dieselSavedLitresPerYear).toBe(0);
    expect(result.co2AvoidedKgPerYear).toBe(1602); // 5 HP × 0.746 kW × 600 h × 0.716
    expect(result.componentASuggestion.estLeaseIncomeInrPerYear).toBe(75_000); // 3 acres × ₹25,000
  });
});

describe('POST /api/ev/fit', () => {
  it('recommends ev-car for a mid-range commuter with home charging', async () => {
    const res = await request(testApp()).post('/api/ev/fit').send({
      dailyKm: 40,
      currentVehicle: 'car-petrol',
      hasHomeCharging: true,
      hasOfficeCharging: false,
      longTripsPerMonth: 1,
      cityTier: 1,
    });
    expect(res.status).toBe(200);
    const result = res.body.result;
    expect(result.recommendation).toBe('ev-car');
    expect(result.annualCo2SavedKg).toBe(1109); // (0.17−0.086) × 40 km × 330 days
    expect(result.annualFuelSavingInr).toBe(21_120); // (2.5−0.9) ₹/km × 13,200 km
    expect(result.confidence).toBe('high');
  });
});

describe('POST /api/commute/compare', () => {
  it('returns all 7 modes from a plain distance with source estimate', async () => {
    const res = await request(testApp()).post('/api/commute/compare').send({ distanceKm: 10 });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('estimate');
    expect(res.body.modes).toHaveLength(7);
    const car = res.body.modes.find((m: { mode: string }) => m.mode === 'car-petrol');
    const metro = res.body.modes.find((m: { mode: string }) => m.mode === 'metro');
    expect(car.co2Kg).toBe(3.4); // 0.17 × 10 km × 2 (round trip)
    expect(metro.co2Kg).toBe(0.3);
  });

  it('falls back to a deterministic estimate for origin/destination without a key', async () => {
    const app = testApp();
    const body = { origin: 'Connaught Place, Delhi', destination: 'Noida Sector 62' };
    const first = await request(app).post('/api/commute/compare').send(body);
    const second = await request(app).post('/api/commute/compare').send(body);
    expect(first.status).toBe(200);
    expect(first.body.source).toBe('estimate');
    expect(first.body.distanceKm).toBeGreaterThanOrEqual(5);
    expect(first.body.distanceKm).toBeLessThanOrEqual(25);
    // Same inputs must give identical answers — demos cannot jitter.
    expect(second.body.distanceKm).toBe(first.body.distanceKm);
  });

  it('rejects a request with neither distance nor endpoints', async () => {
    const res = await request(testApp()).post('/api/commute/compare').send({ origin: 'Delhi' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
