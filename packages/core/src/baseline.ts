/**
 * Baseline footprint calculator: converts the one-time lifestyle survey into
 * an annual per-person CO2e estimate split by category. Owns all category
 * math and tip selection. The API layer validates payloads with schemas.ts;
 * critical bounds are re-checked here because core must be safe to call
 * directly.
 */
import { EMISSION_FACTORS } from './emission-factors';
import { appError, type AppError } from './errors';
import { round2 } from './math';
import { err, ok, type Result } from './result';
import type {
  BaselineFootprintResult,
  BaselineSurveyInput,
  CommuteMode,
  DietPattern,
  FootprintByCategory,
  FootprintCategory,
  ShoppingLevel,
} from './types';

const INR_PER_UNIT_TARIFF = 7; // blended domestic tariff used to derive kWh from a rupee bill (₹/unit approximation)
const MONTHS_PER_YEAR = 12;
const WORKING_WEEKS_PER_YEAR = 48; // 52 weeks minus leave, festivals and holidays
const SHORT_FLIGHT_KM = 1100; // typical metro-to-metro domestic sector (e.g. Delhi–Mumbai)
const LONG_FLIGHT_KM = 4500; // long sector, counted as a return trip (×2) below

// Food-only annual approximations (kg CO2e) derived from the per-meal factors
// (veg 0.5 / chicken 1.0 / mutton 2.5) at typical Indian meal mixes.
const FOOD_ANNUAL_KG: Record<DietPattern, number> = {
  vegan: 450,
  vegetarian: 550,
  eggs: 650,
  'nonveg-weekly': 800,
  'nonveg-daily': 1100,
};

// Embodied-consumption approximation for goods, clothing and electronics.
const SHOPPING_ANNUAL_KG: Record<ShoppingLevel, number> = {
  low: 300,
  medium: 600,
  high: 1200,
};

// Carpooling only divides emissions when the commuter controls the vehicle.
const CAR_MODES: ReadonlySet<CommuteMode> = new Set(['car-petrol', 'car-diesel', 'car-cng']);

const COMMUTE_FACTOR_KG_PER_KM: Record<CommuteMode, number> = {
  'car-petrol': EMISSION_FACTORS.carPetrol.value,
  'car-diesel': EMISSION_FACTORS.carDiesel.value,
  'car-cng': EMISSION_FACTORS.carCng.value,
  'two-wheeler': EMISSION_FACTORS.twoWheelerPetrol.value,
  // Per-passenger share of the 0.07 vehicle-km factor at typical 2-pax sharing.
  auto: EMISSION_FACTORS.autoRickshawCng.value / 2,
  bus: EMISSION_FACTORS.busPerPax.value,
  metro: EMISSION_FACTORS.metroPerPax.value,
  train: EMISSION_FACTORS.trainPerPax.value,
  'cycle-walk': 0,
  wfh: 0,
};

function resolveMonthlyKwh(survey: BaselineSurveyInput): number | undefined {
  if (survey.monthlyElectricityKwh !== undefined) return survey.monthlyElectricityKwh;
  if (survey.monthlyBillInr !== undefined) return survey.monthlyBillInr / INR_PER_UNIT_TARIFF;
  return undefined;
}

function buildTips(
  topDriver: FootprintCategory,
  secondDriver: FootprintCategory,
  survey: BaselineSurveyInput,
): string[] {
  const categoryTips: Record<FootprintCategory, string> = {
    homeEnergy:
      'Home energy is your top emitter — rooftop solar under PM Surya Ghar typically erases most of an urban home’s electricity footprint (see the Schemes tab).',
    transport:
      'Transport leads your footprint — swapping two car commutes a week for metro or bus saves nearly 300 kg CO2e a year on a 10 km commute.',
    food: 'Food is your biggest category — swapping red meat for chicken or veg meals has the largest single-meal impact (2.5 → 0.5 kg CO2e per meal).',
    shopping:
      'Shopping drives your footprint — buying fewer, longer-lasting items and repairing electronics cuts embodied emissions fastest.',
  };
  const tips: string[] = [categoryTips[topDriver]];
  // 6+ daily AC hours: setpoint discipline beats almost any other home habit.
  tips.push(
    survey.acHoursPerDay >= 6
      ? 'Long AC hours detected — every +1 °C on the setpoint cuts cooling energy about 6%; try 24-25 °C and log it as a daily action.'
      : categoryTips[secondDriver],
  );
  const fossilCommute = CAR_MODES.has(survey.commuteMode) || survey.commuteMode === 'two-wheeler';
  tips.push(
    fossilCommute
      ? 'Your commute burns fossil fuel — check the EV Coach: an electric two-wheeler runs at about ₹0.25/km versus ₹2/km for petrol.'
      : 'Keep a daily streak — small repeated actions (veg days, LED swaps, line-drying) compound into 100+ kg CO2e a year.',
  );
  return tips;
}

function validateHousehold(survey: BaselineSurveyInput): Result<void, AppError> {
  if (
    !Number.isInteger(survey.householdSize) ||
    survey.householdSize < 1 ||
    survey.householdSize > 15
  ) {
    return err(appError('VALIDATION_FAILED', 'householdSize must be an integer between 1 and 15'));
  }
  return ok(undefined);
}

function validateConsumption(
  survey: BaselineSurveyInput,
  monthlyKwh: number | undefined,
): Result<void, AppError> {
  if (monthlyKwh === undefined) {
    return err(appError('VALIDATION_FAILED', 'Provide monthlyElectricityKwh or monthlyBillInr'));
  }
  if (
    monthlyKwh <= 0 ||
    survey.lpgCylindersPerMonth < 0 ||
    survey.commuteKmOneWay < 0 ||
    survey.flightsShortPerYear < 0 ||
    survey.flightsLongPerYear < 0
  ) {
    return err(appError('VALIDATION_FAILED', 'Consumption figures must be non-negative'));
  }
  if (survey.commuteDaysPerWeek < 0 || survey.commuteDaysPerWeek > 7) {
    return err(appError('VALIDATION_FAILED', 'commuteDaysPerWeek must be between 0 and 7'));
  }
  const carpoolSize = survey.carpoolSize ?? 1;
  if (!Number.isInteger(carpoolSize) || carpoolSize < 1 || carpoolSize > 4) {
    return err(appError('VALIDATION_FAILED', 'carpoolSize must be an integer between 1 and 4'));
  }
  return ok(undefined);
}

function calculateHomeEnergyKg(survey: BaselineSurveyInput, monthlyKwh: number): number {
  return (
    (monthlyKwh * MONTHS_PER_YEAR * EMISSION_FACTORS.gridElectricity.value +
      survey.lpgCylindersPerMonth * MONTHS_PER_YEAR * EMISSION_FACTORS.lpgCylinder14kg.value) /
    survey.householdSize
  );
}

function calculateTransportKg(survey: BaselineSurveyInput): number {
  const carpoolSize = survey.carpoolSize ?? 1;
  const carpoolDivisor = CAR_MODES.has(survey.commuteMode) ? carpoolSize : 1;
  const commuteKg =
    (COMMUTE_FACTOR_KG_PER_KM[survey.commuteMode] *
      survey.commuteKmOneWay *
      2 * // daily round trip
      survey.commuteDaysPerWeek *
      WORKING_WEEKS_PER_YEAR) /
    carpoolDivisor;
  const flightsKg =
    survey.flightsShortPerYear * SHORT_FLIGHT_KM * EMISSION_FACTORS.flightDomestic.value +
    survey.flightsLongPerYear * LONG_FLIGHT_KM * EMISSION_FACTORS.flightDomestic.value * 2; // return
  return commuteKg + flightsKg;
}

export function calculateBaselineFootprint(
  survey: BaselineSurveyInput,
): Result<BaselineFootprintResult, AppError> {
  const householdValidation = validateHousehold(survey);
  if (!householdValidation.ok) return err(householdValidation.error);

  const monthlyKwh = resolveMonthlyKwh(survey);
  const consumptionValidation = validateConsumption(survey, monthlyKwh);
  if (!consumptionValidation.ok) return err(consumptionValidation.error);

  const safeMonthlyKwh = monthlyKwh as number;

  const homeEnergyKg = calculateHomeEnergyKg(survey, safeMonthlyKwh);
  const transportKg = calculateTransportKg(survey);

  const byCategory: FootprintByCategory = {
    homeEnergy: Math.round(homeEnergyKg),
    transport: Math.round(transportKg),
    food: FOOD_ANNUAL_KG[survey.dietPattern],
    shopping: SHOPPING_ANNUAL_KG[survey.shoppingLevel],
  };
  const totalKgAnnual =
    byCategory.homeEnergy + byCategory.transport + byCategory.food + byCategory.shopping;

  // Stable sort keeps ties deterministic (declaration order wins).
  const ranked = (Object.keys(byCategory) as FootprintCategory[]).sort(
    (a, b) => byCategory[b] - byCategory[a],
  );
  const topDriver = ranked[0];
  const secondDriver = ranked[1];

  return ok({
    totalKgAnnual,
    byCategory,
    vsIndiaAverage: round2(totalKgAnnual / EMISSION_FACTORS.indiaPerCapitaAnnual.value),
    vsUrbanAffluent: round2(totalKgAnnual / EMISSION_FACTORS.indiaUrbanAffluentAnnual.value),
    topDriver,
    generatedTips: buildTips(topDriver, secondDriver, survey),
  });
}
