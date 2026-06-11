/**
 * Field groups for the four data-entry steps of the onboarding wizard.
 * Pure controlled inputs — the page owns form state and validation; this
 * module owns only the labelled markup (every control goes through Field).
 */
'use client';

import { Field } from '../../../components/ui/Field';
import {
  CAR_MODES,
  COMMUTE_MODE_OPTIONS,
  DIET_OPTIONS,
  SHOPPING_OPTIONS,
  type ElectricityInputKind,
  type SurveyErrors,
  type SurveyFormState,
} from './survey-form';

export interface StepFieldsProps {
  form: SurveyFormState;
  errors: SurveyErrors;
  onChange: <K extends keyof SurveyFormState>(field: K, value: SurveyFormState[K]) => void;
}

const INPUT_CLASS =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink';

export function HomeEnergyFields({ form, errors, onChange }: StepFieldsProps): React.JSX.Element {
  const electricityLabel =
    form.electricityInputKind === 'kwh'
      ? 'Monthly electricity use (kWh units)'
      : 'Monthly electricity bill (₹)';
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        id="survey-householdSize"
        label="People in your household"
        hint="Home energy is split per person."
        error={errors.householdSize}
      >
        <input
          type="number"
          min={1}
          max={15}
          className={INPUT_CLASS}
          value={form.householdSize}
          onChange={(event) => onChange('householdSize', event.target.value)}
        />
      </Field>

      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="p-0 text-sm font-semibold">Electricity figure you know</legend>
        <div className="flex gap-4 pt-1">
          {(
            [
              { value: 'kwh', label: 'Units (kWh)' },
              { value: 'bill', label: 'Bill amount (₹)' },
            ] as ReadonlyArray<{ value: ElectricityInputKind; label: string }>
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="electricity-kind"
                value={option.value}
                checked={form.electricityInputKind === option.value}
                onChange={() => onChange('electricityInputKind', option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id="survey-monthlyElectricityValue"
        label={electricityLabel}
        hint={
          form.electricityInputKind === 'bill'
            ? 'We convert your bill to units at ₹7 per kWh.'
            : 'Find this on any monthly electricity bill.'
        }
        error={errors.monthlyElectricityValue}
      >
        <input
          type="number"
          min={1}
          className={INPUT_CLASS}
          value={form.monthlyElectricityValue}
          onChange={(event) => onChange('monthlyElectricityValue', event.target.value)}
        />
      </Field>

      <Field
        id="survey-lpgCylindersPerMonth"
        label="LPG cylinders per month"
        hint="14.2 kg domestic cylinders. Enter 0 if you cook on PNG or induction."
        error={errors.lpgCylindersPerMonth}
      >
        <input
          type="number"
          min={0}
          max={10}
          step="0.5"
          className={INPUT_CLASS}
          value={form.lpgCylindersPerMonth}
          onChange={(event) => onChange('lpgCylindersPerMonth', event.target.value)}
        />
      </Field>

      <Field
        id="survey-acHoursPerDay"
        label="AC hours on a typical day"
        hint="Shapes your tips only — AC power is already inside your bill."
        error={errors.acHoursPerDay}
      >
        <input
          type="number"
          min={0}
          max={24}
          className={INPUT_CLASS}
          value={form.acHoursPerDay}
          onChange={(event) => onChange('acHoursPerDay', event.target.value)}
        />
      </Field>
    </div>
  );
}

export function CommuteFields({ form, errors, onChange }: StepFieldsProps): React.JSX.Element {
  const isCarMode = CAR_MODES.includes(form.commuteMode);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field id="survey-commuteMode" label="Main commute mode" error={errors.commuteMode}>
        <select
          className={INPUT_CLASS}
          value={form.commuteMode}
          onChange={(event) =>
            onChange('commuteMode', event.target.value as SurveyFormState['commuteMode'])
          }
        >
          {COMMUTE_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="survey-commuteKmOneWay"
        label="One-way commute distance (km)"
        error={errors.commuteKmOneWay}
      >
        <input
          type="number"
          min={0}
          max={200}
          className={INPUT_CLASS}
          value={form.commuteKmOneWay}
          onChange={(event) => onChange('commuteKmOneWay', event.target.value)}
        />
      </Field>

      <Field
        id="survey-commuteDaysPerWeek"
        label="Commute days per week"
        error={errors.commuteDaysPerWeek}
      >
        <input
          type="number"
          min={0}
          max={7}
          className={INPUT_CLASS}
          value={form.commuteDaysPerWeek}
          onChange={(event) => onChange('commuteDaysPerWeek', event.target.value)}
        />
      </Field>

      {isCarMode && (
        <Field
          id="survey-carpoolSize"
          label="People sharing the car"
          hint="Including you — sharing divides the car's emissions."
          error={errors.carpoolSize}
        >
          <input
            type="number"
            min={1}
            max={4}
            className={INPUT_CLASS}
            value={form.carpoolSize}
            onChange={(event) => onChange('carpoolSize', event.target.value)}
          />
        </Field>
      )}

      <Field
        id="survey-flightsShortPerYear"
        label="Short flights per year"
        hint="Domestic hops up to ~2 hours, one-way segments."
        error={errors.flightsShortPerYear}
      >
        <input
          type="number"
          min={0}
          max={100}
          className={INPUT_CLASS}
          value={form.flightsShortPerYear}
          onChange={(event) => onChange('flightsShortPerYear', event.target.value)}
        />
      </Field>

      <Field
        id="survey-flightsLongPerYear"
        label="Long flights per year"
        hint="Long-haul return trips (4+ hours each way)."
        error={errors.flightsLongPerYear}
      >
        <input
          type="number"
          min={0}
          max={50}
          className={INPUT_CLASS}
          value={form.flightsLongPerYear}
          onChange={(event) => onChange('flightsLongPerYear', event.target.value)}
        />
      </Field>
    </div>
  );
}

export function FoodFields({ form, errors, onChange }: StepFieldsProps): React.JSX.Element {
  return (
    <div className="grid gap-4 md:max-w-md">
      <Field
        id="survey-dietPattern"
        label="Your usual diet"
        hint="Food-only footprints are approximations from published meal studies."
        error={errors.dietPattern}
      >
        <select
          className={INPUT_CLASS}
          value={form.dietPattern}
          onChange={(event) =>
            onChange('dietPattern', event.target.value as SurveyFormState['dietPattern'])
          }
        >
          {DIET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

export function LifestyleFields({ form, errors, onChange }: StepFieldsProps): React.JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        id="survey-shoppingLevel"
        label="Shopping and deliveries"
        hint="Covers embodied emissions of things you buy."
        error={errors.shoppingLevel}
      >
        <select
          className={INPUT_CLASS}
          value={form.shoppingLevel}
          onChange={(event) =>
            onChange('shoppingLevel', event.target.value as SurveyFormState['shoppingLevel'])
          }
        >
          {SHOPPING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="survey-stateName"
        label="State (optional)"
        hint="Used later for state-specific scheme pointers."
        error={errors.stateName}
      >
        <input
          type="text"
          maxLength={60}
          className={INPUT_CLASS}
          value={form.stateName}
          onChange={(event) => onChange('stateName', event.target.value)}
        />
      </Field>

      <Field
        id="survey-displayName"
        label="Display name (optional)"
        hint="Shown on the leaderboard. Leave blank to stay anonymous."
        error={errors.displayName}
      >
        <input
          type="text"
          maxLength={60}
          className={INPUT_CLASS}
          value={form.displayName}
          onChange={(event) => onChange('displayName', event.target.value)}
        />
      </Field>
    </div>
  );
}
