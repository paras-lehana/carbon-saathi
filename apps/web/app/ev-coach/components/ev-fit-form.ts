/**
 * EV-coach form model: wizard step titles, the vehicle/city-tier option copy
 * and the long-trips validation (bounds come from core's EV_FIT_BOUNDS — the
 * same values the API validates with, so a value accepted here cannot be
 * rejected there). Pure data + functions — no React, no clock.
 */
import { EV_FIT_BOUNDS } from '@carbon-saathi/core';
import type { EvCurrentVehicle, EvFitInput } from '@carbon-saathi/core';

export const WIZARD_STEPS = [
  'Daily distance',
  'Current vehicle',
  'Charging & city',
  'Long trips',
] as const;

export const VEHICLE_OPTIONS: ReadonlyArray<{ value: EvCurrentVehicle; label: string }> = [
  { value: 'car-petrol', label: 'Car (petrol)' },
  { value: 'car-diesel', label: 'Car (diesel)' },
  { value: 'two-wheeler', label: 'Two-wheeler (petrol)' },
  { value: 'none', label: 'No vehicle yet — buying my first' },
];

export type CityTier = EvFitInput['cityTier'];

/** Listed in tier order so the radio group reads 1 → 3 top-down. */
export const CITY_TIERS: ReadonlyArray<CityTier> = [1, 2, 3];

export const TIER_DESCRIPTIONS: Record<CityTier, string> = {
  1: 'Tier-1 metro (Delhi, Mumbai, Bengaluru…)',
  2: 'Tier-2 city (Jaipur, Indore, Kochi…)',
  3: 'Tier-3 city or town',
};

/**
 * null when the raw long-trips text is a whole number inside core's bounds;
 * otherwise the inline error message. Blank input fails explicitly — Number('')
 * is 0, which would silently submit a value the user never typed.
 */
export function validateLongTrips(raw: string): string | null {
  const { min, max } = EV_FIT_BOUNDS.longTripsPerMonth;
  const trips = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(trips) || trips < min || trips > max) {
    return `Enter a whole number of trips, ${min} to ${max}.`;
  }
  return null;
}
