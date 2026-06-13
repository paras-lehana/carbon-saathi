/**
 * EV-fit advisor: maps daily usage and charging access to a vehicle
 * recommendation with annual CO2 and rupee savings. Owns the decision tree
 * and the running-cost model (kept consistent with commute.ts so numbers
 * agree across the app).
 */
import { EMISSION_FACTORS } from './emission-factors';
import { appError, type AppError } from './errors';
import { err, ok, type Result } from './result';
import type { EvCurrentVehicle, EvFitInput, EvFitResult, EvRecommendation } from './types';

const OPERATING_DAYS_PER_YEAR = 330; // personal vehicles run ~330 days/yr incl. weekend errands

const CURRENT_KG_PER_KM: Record<Exclude<EvCurrentVehicle, 'none'>, number> = {
  'car-petrol': EMISSION_FACTORS.carPetrol.value,
  'car-diesel': EMISSION_FACTORS.carDiesel.value,
  'two-wheeler': EMISSION_FACTORS.twoWheelerPetrol.value,
};

// All-in running cost per km (fuel + consumables), city-average approximations
// shared with the commute cost table so cross-page numbers never disagree.
const CURRENT_INR_PER_KM: Record<Exclude<EvCurrentVehicle, 'none'>, number> = {
  'car-petrol': 2.5,
  'car-diesel': 2.2, // cheaper fuel per km than petrol, pricier servicing — net approximation
  'two-wheeler': 2.0,
};

const ALT_KG_PER_KM: Record<EvRecommendation, number> = {
  'public-transport-first': EMISSION_FACTORS.metroPerPax.value,
  'ev-two-wheeler': EMISSION_FACTORS.ev2wPerKm.value,
  'ev-car': EMISSION_FACTORS.evCarPerKm.value,
  'ev-car-with-planning': EMISSION_FACTORS.evCarPerKm.value,
  hybrid: 0.119, // strong hybrid ≈30% below the 0.17 petrol-car factor (approximation)
};

const ALT_INR_PER_KM: Record<EvRecommendation, number> = {
  'public-transport-first': 0.4, // metro fare per km, from the commute cost table
  'ev-two-wheeler': 0.25,
  'ev-car': 0.9,
  'ev-car-with-planning': 0.9,
  hybrid: 1.75, // ≈30% fuel cut on the ₹2.5/km petrol running cost
};

// First-vehicle buyers ('none') are compared against the petrol vehicle they
// would otherwise buy: a 2W counterfactual for a 2W recommendation, else a car.
function currentCostBasis(
  vehicle: EvCurrentVehicle,
  recommendation: EvRecommendation,
): { kgPerKm: number; inrPerKm: number } {
  if (vehicle !== 'none') {
    return { kgPerKm: CURRENT_KG_PER_KM[vehicle], inrPerKm: CURRENT_INR_PER_KM[vehicle] };
  }
  const counterfactual: Exclude<EvCurrentVehicle, 'none'> =
    recommendation === 'ev-two-wheeler' ? 'two-wheeler' : 'car-petrol';
  return {
    kgPerKm: CURRENT_KG_PER_KM[counterfactual],
    inrPerKm: CURRENT_INR_PER_KM[counterfactual],
  };
}

const TIER_NOTE: Record<1 | 2 | 3, string> = {
  1: 'public charging in tier-1 metros is already dense',
  2: 'tier-2 public charging is growing fast — home charging removes all range anxiety',
  3: 'in tier-3 cities plan around home charging; DC fast chargers are still sparse',
};

function validateEvFitInput(input: EvFitInput): Result<void, AppError> {
  if (!Number.isFinite(input.dailyKm) || input.dailyKm < 1 || input.dailyKm > 300) {
    return err(appError('VALIDATION_FAILED', 'dailyKm must be between 1 and 300'));
  }
  if (
    !Number.isInteger(input.longTripsPerMonth) ||
    input.longTripsPerMonth < 0 ||
    input.longTripsPerMonth > 20
  ) {
    return err(
      appError('VALIDATION_FAILED', 'longTripsPerMonth must be an integer between 0 and 20'),
    );
  }
  return ok(undefined);
}

function getRecommendation(input: EvFitInput, hasCharging: boolean): EvRecommendation {
  if (input.dailyKm < 8 && !hasCharging) {
    // Below ~8 km/day a private EV never amortises — transit wins outright.
    return 'public-transport-first';
  }
  if (input.currentVehicle === 'two-wheeler' || input.dailyKm <= 30) {
    return 'ev-two-wheeler';
  }
  if (input.dailyKm <= 80 && hasCharging) {
    return 'ev-car';
  }
  if (input.dailyKm > 80 && input.longTripsPerMonth > 4 && !hasCharging) {
    return 'hybrid';
  }
  return 'ev-car-with-planning';
}

function getConfidence(recommendation: EvRecommendation): EvFitResult['confidence'] {
  // High confidence when no charging gamble remains: ev-car only fires with
  // charging access, a 2W charges from a regular 15 A socket, and public
  // transport needs no infrastructure at all.
  if (
    recommendation === 'ev-car' ||
    recommendation === 'ev-two-wheeler' ||
    recommendation === 'public-transport-first'
  ) {
    return 'high';
  }
  return 'medium';
}

export function calculateEvFit(input: EvFitInput): Result<EvFitResult, AppError> {
  const validation = validateEvFitInput(input);
  if (!validation.ok) return err(validation.error);

  const hasCharging = input.hasHomeCharging || input.hasOfficeCharging;
  const recommendation = getRecommendation(input, hasCharging);

  const basis = currentCostBasis(input.currentVehicle, recommendation);
  const annualKm = input.dailyKm * OPERATING_DAYS_PER_YEAR;
  const annualCo2SavedKg = Math.max(
    0,
    Math.round((basis.kgPerKm - ALT_KG_PER_KM[recommendation]) * annualKm),
  );
  const annualFuelSavingInr = Math.max(
    0,
    Math.round((basis.inrPerKm - ALT_INR_PER_KM[recommendation]) * annualKm),
  );

  const confidence = getConfidence(recommendation);

  return ok({
    recommendation,
    annualCo2SavedKg,
    annualFuelSavingInr,
    fameNote: `PM E-DRIVE (the FAME-II successor) subsidises electric two-wheelers and fleet EVs, and most states add road-tax and registration waivers — ${TIER_NOTE[input.cityTier]}.`,
    confidence,
  });
}
