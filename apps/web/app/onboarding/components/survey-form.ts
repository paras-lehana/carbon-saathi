/**
 * Onboarding survey form model: string-typed field state (text inputs), the
 * per-step validators (bounds mirror core's baselineSurveySchema so the API
 * never rejects a form this module passed) and the conversion to the
 * BaselineSurveyInput payload. Pure data + functions — no React, no clock.
 */
import type {
  BaselineSurveyInput,
  CommuteMode,
  DietPattern,
  ShoppingLevel,
} from '@carbon-saathi/core';

export type ElectricityInputKind = 'kwh' | 'bill';

export interface SurveyFormState {
  householdSize: string;
  electricityInputKind: ElectricityInputKind;
  monthlyElectricityValue: string;
  lpgCylindersPerMonth: string;
  acHoursPerDay: string;
  commuteMode: CommuteMode;
  commuteKmOneWay: string;
  commuteDaysPerWeek: string;
  carpoolSize: string;
  flightsShortPerYear: string;
  flightsLongPerYear: string;
  dietPattern: DietPattern;
  shoppingLevel: ShoppingLevel;
  stateName: string;
  /** Optional leaderboard name — sent to bootstrap, not part of the survey. */
  displayName: string;
}

export type SurveyErrors = Partial<Record<keyof SurveyFormState, string>>;

export const SURVEY_STEPS = ['Home energy', 'Commute', 'Food', 'Lifestyle', 'Review'] as const;

// Pre-filled with a plausible urban-household default so a demo run only has
// to adjust what differs — every value still passes validation untouched.
export const DEFAULT_SURVEY_FORM: SurveyFormState = {
  householdSize: '4',
  electricityInputKind: 'kwh',
  monthlyElectricityValue: '250',
  lpgCylindersPerMonth: '1',
  acHoursPerDay: '4',
  commuteMode: 'metro',
  commuteKmOneWay: '10',
  commuteDaysPerWeek: '5',
  carpoolSize: '1',
  flightsShortPerYear: '0',
  flightsLongPerYear: '0',
  dietPattern: 'vegetarian',
  shoppingLevel: 'medium',
  stateName: '',
  displayName: '',
};

export const COMMUTE_MODE_OPTIONS: ReadonlyArray<{ value: CommuteMode; label: string }> = [
  { value: 'car-petrol', label: 'Car (petrol)' },
  { value: 'car-diesel', label: 'Car (diesel)' },
  { value: 'car-cng', label: 'Car (CNG)' },
  { value: 'two-wheeler', label: 'Two-wheeler' },
  { value: 'auto', label: 'Auto-rickshaw' },
  { value: 'bus', label: 'Bus' },
  { value: 'metro', label: 'Metro' },
  { value: 'train', label: 'Local train' },
  { value: 'cycle-walk', label: 'Cycle / walk' },
  { value: 'wfh', label: 'Work from home' },
];

export const DIET_OPTIONS: ReadonlyArray<{ value: DietPattern; label: string }> = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggs', label: 'Vegetarian + eggs' },
  { value: 'nonveg-weekly', label: 'Non-veg a few times a week' },
  { value: 'nonveg-daily', label: 'Non-veg daily' },
];

export const SHOPPING_OPTIONS: ReadonlyArray<{ value: ShoppingLevel; label: string }> = [
  { value: 'low', label: 'Low — mostly essentials' },
  { value: 'medium', label: 'Medium — typical urban household' },
  { value: 'high', label: 'High — frequent upgrades and deliveries' },
];

/** Carpool size only affects emissions for car modes (core baseline rule). */
export const CAR_MODES: readonly CommuteMode[] = ['car-petrol', 'car-diesel', 'car-cng'];

export function optionLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

interface NumberBounds {
  min: number;
  max: number;
  integer?: boolean;
}

function checkNumber(raw: string, bounds: NumberBounds): string | null {
  if (raw.trim() === '') return 'This field is required.';
  const value = Number(raw);
  if (!Number.isFinite(value)) return 'Enter a number.';
  if (bounds.integer === true && !Number.isInteger(value)) return 'Enter a whole number.';
  if (value < bounds.min || value > bounds.max) {
    return `Enter a value between ${bounds.min} and ${bounds.max}.`;
  }
  return null;
}

/** Bounds below mirror core schemas.ts exactly — keep both in sync. */
export function validateStep(step: number, form: SurveyFormState): SurveyErrors {
  const errors: SurveyErrors = {};
  const fail = (field: keyof SurveyFormState, message: string | null): void => {
    if (message !== null) errors[field] = message;
  };
  if (step === 0) {
    fail('householdSize', checkNumber(form.householdSize, { min: 1, max: 15, integer: true }));
    fail(
      'monthlyElectricityValue',
      checkNumber(
        form.monthlyElectricityValue,
        // kWh capped at 5,000 / bill at ₹1,00,000 — residential sanity bounds.
        form.electricityInputKind === 'kwh' ? { min: 1, max: 5000 } : { min: 1, max: 100_000 },
      ),
    );
    fail('lpgCylindersPerMonth', checkNumber(form.lpgCylindersPerMonth, { min: 0, max: 10 }));
    fail('acHoursPerDay', checkNumber(form.acHoursPerDay, { min: 0, max: 24 }));
  } else if (step === 1) {
    fail('commuteKmOneWay', checkNumber(form.commuteKmOneWay, { min: 0, max: 200 }));
    fail(
      'commuteDaysPerWeek',
      checkNumber(form.commuteDaysPerWeek, { min: 0, max: 7, integer: true }),
    );
    if (CAR_MODES.includes(form.commuteMode)) {
      fail('carpoolSize', checkNumber(form.carpoolSize, { min: 1, max: 4, integer: true }));
    }
    fail(
      'flightsShortPerYear',
      checkNumber(form.flightsShortPerYear, { min: 0, max: 100, integer: true }),
    );
    fail(
      'flightsLongPerYear',
      checkNumber(form.flightsLongPerYear, { min: 0, max: 50, integer: true }),
    );
  } else if (step === 3) {
    if (form.stateName.trim().length > 60) errors.stateName = 'Keep this under 60 characters.';
    if (form.displayName.trim().length > 60) {
      errors.displayName = 'Keep this under 60 characters.';
    }
  }
  return errors;
}

/** Union of every step's errors — the final guard before submission. */
export function validateAllSteps(form: SurveyFormState): SurveyErrors {
  return {
    ...validateStep(0, form),
    ...validateStep(1, form),
    ...validateStep(2, form),
    ...validateStep(3, form),
  };
}

/** Assumes validateAllSteps returned no errors — parsing cannot fail here. */
export function toBaselineSurveyInput(form: SurveyFormState): BaselineSurveyInput {
  const electricityValue = Number(form.monthlyElectricityValue);
  const stateName = form.stateName.trim();
  return {
    householdSize: Number(form.householdSize),
    ...(form.electricityInputKind === 'kwh'
      ? { monthlyElectricityKwh: electricityValue }
      : { monthlyBillInr: electricityValue }),
    lpgCylindersPerMonth: Number(form.lpgCylindersPerMonth),
    commuteMode: form.commuteMode,
    commuteKmOneWay: Number(form.commuteKmOneWay),
    commuteDaysPerWeek: Number(form.commuteDaysPerWeek),
    ...(CAR_MODES.includes(form.commuteMode) ? { carpoolSize: Number(form.carpoolSize) } : {}),
    flightsShortPerYear: Number(form.flightsShortPerYear),
    flightsLongPerYear: Number(form.flightsLongPerYear),
    dietPattern: form.dietPattern,
    shoppingLevel: form.shoppingLevel,
    acHoursPerDay: Number(form.acHoursPerDay),
    ...(stateName !== '' ? { state: stateName } : {}),
  };
}
