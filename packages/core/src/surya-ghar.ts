/**
 * PM Surya Ghar: Muft Bijli Yojana rooftop-solar calculator. Owns system
 * sizing, the central subsidy bands, payback and CO2 math. Callers validate
 * payloads at the API edge; bounds are re-checked here for defence in depth.
 */
import { EMISSION_FACTORS } from './emission-factors';
import { appError, type AppError } from './errors';
import { err, ok, type Result } from './result';
import type { SuryaGharInput, SuryaGharResult } from './types';

const CAPEX_PER_KW_INR = 55_000; // typical installed residential rooftop cost per kW (2024 vendor quotes, approximation)
const DEFAULT_TARIFF_INR_PER_UNIT = 7; // blended domestic tariff approximation across DISCOMs
const SQFT_PER_KW = 100; // shadow-free roof area needed per kW of panels (industry rule of thumb)
const MAX_RESIDENTIAL_KW = 10; // practical cap for residential net-metering connections
const UNITS_PER_KW_PER_MONTH = 120; // 1,450 kWh/kW/yr ÷ 12 — sizing heuristic

// Central Financial Assistance slabs notified under PM Surya Ghar (Feb 2024):
// ₹30,000/kW up to 2 kW, +₹18,000 for the 3rd kW, capped at ₹78,000.
function subsidyForKw(kw: number): number {
  if (kw >= 3) return 78_000;
  if (kw === 2) return 60_000;
  return 30_000;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function calculateSuryaGhar(input: SuryaGharInput): Result<SuryaGharResult, AppError> {
  if (
    !Number.isFinite(input.monthlyUnits) ||
    input.monthlyUnits < 30 ||
    input.monthlyUnits > 2000
  ) {
    return err(appError('VALIDATION_FAILED', 'monthlyUnits must be between 30 and 2000'));
  }
  if (input.roofAreaSqFt !== undefined && input.roofAreaSqFt < 80) {
    return err(appError('VALIDATION_FAILED', 'roofAreaSqFt must be at least 80'));
  }
  const tariff = input.tariffPerUnit ?? DEFAULT_TARIFF_INR_PER_UNIT;
  if (!Number.isFinite(tariff) || tariff <= 0 || tariff > 30) {
    return err(appError('VALIDATION_FAILED', 'tariffPerUnit must be between 0 and 30'));
  }

  let recommendedKw = Math.min(
    MAX_RESIDENTIAL_KW,
    Math.max(1, Math.round(input.monthlyUnits / UNITS_PER_KW_PER_MONTH)),
  );
  if (input.roofAreaSqFt !== undefined) {
    // Never below 1 kW — that is the smallest practical grid-tied system.
    const roofCapKw = Math.max(1, Math.floor(input.roofAreaSqFt / SQFT_PER_KW));
    recommendedKw = Math.min(recommendedKw, roofCapKw);
  }

  const subsidyInr = subsidyForKw(recommendedKw);
  const capexInr = recommendedKw * CAPEX_PER_KW_INR;
  const netCostInr = capexInr - subsidyInr;
  const annualGenerationKwh = recommendedKw * EMISSION_FACTORS.solarGenPerKwYear.value;
  // Savings are capped at actual consumption — surplus export earns far less
  // than the retail tariff, so counting it would overstate payback.
  const annualSavingInr = Math.round(
    Math.min(annualGenerationKwh, input.monthlyUnits * 12) * tariff,
  );
  const paybackYears = round1(netCostInr / annualSavingInr);
  const co2AvoidedKgPerYear = Math.round(
    annualGenerationKwh * EMISSION_FACTORS.gridElectricity.value,
  );

  return ok({
    recommendedKw,
    subsidyInr,
    capexInr,
    netCostInr,
    annualGenerationKwh,
    annualSavingInr,
    paybackYears,
    co2AvoidedKgPerYear,
    freeUnitsNote:
      'PM Surya Ghar targets up to 300 free units per month for participating households — a right-sized system can take your effective bill to zero.',
    checklist: [
      'Register on pmsuryaghar.gov.in with your state, DISCOM and consumer number.',
      'Apply for rooftop solar and wait for DISCOM feasibility approval.',
      'Install the plant through a DISCOM-empanelled vendor.',
      'Submit plant details on the portal and apply for net metering.',
      'After inspection and net-meter installation, the portal issues a commissioning certificate.',
      'Submit bank details — the central subsidy is credited within about 30 days.',
    ],
    portalUrl: 'https://pmsuryaghar.gov.in',
    loanNote:
      'Collateral-free loans at about 7% concessional interest are available for systems up to 3 kW.',
  });
}
