/**
 * PM-KUSUM advisor: routes a farmer to the right scheme component (A: land
 * lease, B: standalone solar pump, C: pump solarisation) and computes the
 * subsidy split, costs and avoided emissions. Owns the routing rules; the
 * API edge owns payload validation (bounds re-checked here).
 */
import { EMISSION_FACTORS } from './emission-factors';
import { appError, type AppError } from './errors';
import { err, ok, type Result } from './result';
import type { KusumComponentASuggestion, KusumInput, KusumResult, KusumSubsidyBreakdown } from './types';

const PUMP_COST_PER_HP_INR = 60_000; // ₹3.0 lakh for a 5 HP standalone solar pump, scaled linearly per HP
const DIESEL_LITRES_PER_YEAR = 720; // ≈1.2 L/hr × 600 pumping hours/yr (typical irrigation duty cycle)
const DIESEL_KG_CO2_PER_LITRE = 2.68; // IPCC default emission factor for diesel combustion
const KW_PER_HP = 0.746; // mechanical horsepower → kW conversion
const PUMPING_HOURS_PER_YEAR = 600; // typical seasonal irrigation duty, matches the diesel assumption
const LAND_LEASE_INR_PER_ACRE_YEAR = 25_000; // documented Component A lease-income benchmark
const MIN_COMPONENT_A_ACRES = 2; // below this a 0.5 MW developer plot is not viable

// Components B and C share the KUSUM guideline split: 30% central CFA + 30%
// state subsidy; the 40% farmer share is mostly bankable (~30% loan), leaving
// roughly 10% of project cost as cash upfront.
const CENTRAL_PCT = 30;
const STATE_PCT = 30;
const FARMER_PCT = 40;
const FARMER_UPFRONT_PCT = 10;

function buildSubsidyBreakdown(estCostInr: number): KusumSubsidyBreakdown {
  return {
    centralPct: CENTRAL_PCT,
    statePct: STATE_PCT,
    farmerPct: FARMER_PCT,
    centralInr: Math.round((estCostInr * CENTRAL_PCT) / 100),
    stateInr: Math.round((estCostInr * STATE_PCT) / 100),
    farmerInr: Math.round((estCostInr * FARMER_PCT) / 100),
    farmerUpfrontApproxInr: Math.round((estCostInr * FARMER_UPFRONT_PCT) / 100),
  };
}

export function adviseKusum(input: KusumInput): Result<KusumResult, AppError> {
  if (!Number.isFinite(input.pumpHp) || input.pumpHp < 1 || input.pumpHp > 10) {
    return err(appError('VALIDATION_FAILED', 'pumpHp must be between 1 and 10'));
  }
  if (input.landAcres !== undefined && (!Number.isFinite(input.landAcres) || input.landAcres <= 0)) {
    return err(appError('VALIDATION_FAILED', 'landAcres must be a positive number'));
  }

  // Routing: no grid connection (diesel or no pump) → standalone solar pump
  // (Component B); a grid-connected pump is solarised instead (Component C).
  const component = input.pumpType === 'grid' ? 'C' : 'B';
  // Component C solarisation capex is approximated with the same ₹60k/HP rule
  // as a standalone pump — panel + pump-controller costs dominate both.
  const estCostInr = Math.round(input.pumpHp * PUMP_COST_PER_HP_INR);
  const subsidyBreakdown = buildSubsidyBreakdown(estCostInr);

  // Diesel displacement applies when the counterfactual is burning diesel:
  // 'none' is treated as an avoided future diesel pump (the common alternative).
  const dieselSavedLitresPerYear = input.pumpType === 'grid' ? 0 : DIESEL_LITRES_PER_YEAR;
  const co2AvoidedKgPerYear =
    input.pumpType === 'grid'
      ? // Solarising a grid pump displaces grid electricity instead of diesel.
        Math.round(
          input.pumpHp *
            KW_PER_HP *
            PUMPING_HOURS_PER_YEAR *
            EMISSION_FACTORS.gridElectricity.value,
        )
      : Math.round(dieselSavedLitresPerYear * DIESEL_KG_CO2_PER_LITRE);

  let componentASuggestion: KusumComponentASuggestion | undefined;
  if (input.hasBarrenLand && input.landAcres !== undefined && input.landAcres >= MIN_COMPONENT_A_ACRES) {
    componentASuggestion = {
      component: 'A',
      landAcres: input.landAcres,
      estLeaseIncomeInrPerYear: Math.round(input.landAcres * LAND_LEASE_INR_PER_ACRE_YEAR),
      note: 'Component A: lease barren land for a 0.5–2 MW solar plant — documented benchmark is about ₹25,000 per acre per year in lease income.',
    };
  }

  return ok({
    component,
    subsidyBreakdown,
    estCostInr,
    farmerShareInr: subsidyBreakdown.farmerInr,
    dieselSavedLitresPerYear,
    co2AvoidedKgPerYear,
    checklist: [
      'Find your state implementing agency on the PM-KUSUM page at mnre.gov.in.',
      'Apply with land ownership papers and existing pump details.',
      'Get a quotation from an MNRE-empanelled vendor.',
      'Arrange the farmer share — banks finance most of it, leaving about 10% upfront.',
      'Installation followed by joint inspection by the DISCOM/state agency.',
      'Subsidy is settled directly with the vendor; keep your acknowledgement receipt.',
    ],
    officialLink: 'https://mnre.gov.in',
    componentASuggestion,
  });
}
