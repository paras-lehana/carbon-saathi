/**
 * Field groups for the four questions of the EV-coach wizard. Pure controlled
 * inputs — the page owns answer state and submission; this module owns only
 * the labelled markup, with numeric bounds from core's EV_FIT_BOUNDS.
 */
'use client';

import { EV_FIT_BOUNDS } from '@carbon-saathi/core';
import type { EvCurrentVehicle } from '@carbon-saathi/core';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/input-styles';
import { CITY_TIERS, TIER_DESCRIPTIONS, VEHICLE_OPTIONS, type CityTier } from './ev-fit-form';

export interface DailyDistanceFieldsProps {
  dailyKm: number;
  onChange: (value: number) => void;
}

export function DailyDistanceFields({
  dailyKm,
  onChange,
}: DailyDistanceFieldsProps): React.JSX.Element {
  return (
    <div className="max-w-md">
      <Field
        id="ev-dailyKm"
        label="How far do you ride or drive on a typical day?"
        hint="Commute plus errands, both ways."
      >
        <input
          type="range"
          min={EV_FIT_BOUNDS.dailyKm.min}
          max={EV_FIT_BOUNDS.dailyKm.max}
          step={1}
          value={dailyKm}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-[var(--primary)]"
        />
      </Field>
      {/* The range input announces its own value — this echo is visual. */}
      <p aria-hidden="true" className="m-0 mt-2 font-display text-lg font-bold text-primary">
        {dailyKm} km / day
      </p>
    </div>
  );
}

export interface CurrentVehicleFieldsProps {
  value: EvCurrentVehicle;
  onChange: (value: EvCurrentVehicle) => void;
}

export function CurrentVehicleFields({
  value,
  onChange,
}: CurrentVehicleFieldsProps): React.JSX.Element {
  return (
    <div className="max-w-md">
      <Field id="ev-currentVehicle" label="What do you mostly use today?">
        <select
          className={INPUT_CLASS}
          value={value}
          onChange={(event) => {
            // Look the raw DOM string up in the options it was rendered from —
            // narrows to EvCurrentVehicle without a cast.
            const selected = VEHICLE_OPTIONS.find((option) => option.value === event.target.value);
            if (selected !== undefined) onChange(selected.value);
          }}
        >
          {VEHICLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

export interface ChargingCityFieldsProps {
  hasHomeCharging: boolean;
  hasOfficeCharging: boolean;
  cityTier: CityTier;
  onHomeChargingChange: (value: boolean) => void;
  onOfficeChargingChange: (value: boolean) => void;
  onCityTierChange: (value: CityTier) => void;
}

export function ChargingCityFields({
  hasHomeCharging,
  hasOfficeCharging,
  cityTier,
  onHomeChargingChange,
  onOfficeChargingChange,
  onCityTierChange,
}: ChargingCityFieldsProps): React.JSX.Element {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <fieldset className="m-0 border-0 p-0">
        <legend className="p-0 text-sm font-semibold">Where could you charge?</legend>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasHomeCharging}
              onChange={(event) => onHomeChargingChange(event.target.checked)}
            />
            At home (own parking with a socket)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasOfficeCharging}
              onChange={(event) => onOfficeChargingChange(event.target.checked)}
            />
            At the office
          </label>
        </div>
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className="p-0 text-sm font-semibold">Your city</legend>
        <div className="mt-2 flex flex-col gap-2">
          {CITY_TIERS.map((tier) => (
            <label key={tier} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ev-cityTier"
                value={tier}
                checked={cityTier === tier}
                onChange={() => onCityTierChange(tier)}
              />
              {TIER_DESCRIPTIONS[tier]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export interface LongTripsFieldsProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function LongTripsFields({
  value,
  error,
  onChange,
}: LongTripsFieldsProps): React.JSX.Element {
  return (
    <div className="max-w-md">
      <Field
        id="ev-longTrips"
        label="Long trips per month (300+ km)"
        hint="Highway runs change the charging math."
        error={error}
      >
        <input
          type="number"
          min={EV_FIT_BOUNDS.longTripsPerMonth.min}
          max={EV_FIT_BOUNDS.longTripsPerMonth.max}
          className={INPUT_CLASS}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </div>
  );
}
