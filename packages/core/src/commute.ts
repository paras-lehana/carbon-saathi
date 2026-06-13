/**
 * Commute mode comparison: deterministic per-mode CO2 and out-of-pocket cost
 * for a one-way distance, assuming a daily round trip. Serves the compare
 * page directly and is the fallback when no Google Maps key is configured.
 */
import { EMISSION_FACTORS } from './emission-factors';
import { appError, type AppError } from './errors';
import { round2 } from './math';
import { err, ok, type Result } from './result';
import type { CommuteCompareMode, CommuteModeEstimate } from './types';

const OPERATING_DAYS_PER_YEAR = 330; // matches the EV-fit contract so cross-page numbers agree
const MAX_DISTANCE_KM = 500; // beyond this it is intercity travel, not a commute

interface ModeRow {
  readonly mode: CommuteCompareMode;
  readonly kgPerKm: number;
  readonly inrPerKm: number;
}

// Cost column is the all-in per-km cash cost (fuel/fare + consumables),
// city-average approximations kept consistent with the EV-fit savings model.
// Order is the product contract: dirtiest private modes first, active last.
const MODE_TABLE: readonly ModeRow[] = [
  { mode: 'car-petrol', kgPerKm: EMISSION_FACTORS.carPetrol.value, inrPerKm: 2.5 },
  { mode: 'car-cng', kgPerKm: EMISSION_FACTORS.carCng.value, inrPerKm: 1.5 },
  { mode: 'two-wheeler', kgPerKm: EMISSION_FACTORS.twoWheelerPetrol.value, inrPerKm: 2.0 },
  { mode: 'ev-2w', kgPerKm: EMISSION_FACTORS.ev2wPerKm.value, inrPerKm: 0.25 },
  { mode: 'bus', kgPerKm: EMISSION_FACTORS.busPerPax.value, inrPerKm: 0.6 },
  { mode: 'metro', kgPerKm: EMISSION_FACTORS.metroPerPax.value, inrPerKm: 0.4 },
  { mode: 'cycle-walk', kgPerKm: 0, inrPerKm: 0 },
];

export function estimateCommuteModes(distanceKm: number): Result<CommuteModeEstimate[], AppError> {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > MAX_DISTANCE_KM) {
    return err(
      appError('VALIDATION_FAILED', `distanceKm must be between 0 and ${MAX_DISTANCE_KM}`),
    );
  }
  return ok(
    MODE_TABLE.map((row) => {
      const dailyKg = row.kgPerKm * distanceKm * 2; // round trip
      return {
        mode: row.mode,
        co2Kg: round2(dailyKg),
        costInr: Math.round(row.inrPerKm * distanceKm * 2),
        annualKgIfDaily: Math.round(dailyKg * OPERATING_DAYS_PER_YEAR),
      };
    }),
  );
}
