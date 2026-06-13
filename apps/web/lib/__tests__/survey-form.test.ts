/**
 * Survey form model: the client-side bounds must mirror core's
 * baselineSurveySchema exactly (drift = a server 400 after the user finishes
 * the whole wizard), the kWh-vs-bill key switch, and trimmed name handling.
 */
import { describe, expect, it } from 'vitest';
import { baselineSurveySchema } from '@carbon-saathi/core';
import {
  DEFAULT_SURVEY_FORM,
  toBaselineSurveyInput,
  validateAllSteps,
  type SurveyFormState,
} from '@/app/onboarding/components/survey-form';

describe('toBaselineSurveyInput', () => {
  it('maps a valid metro form exactly — no carpoolSize for non-car modes', () => {
    const form: SurveyFormState = { ...DEFAULT_SURVEY_FORM, stateName: '  Delhi  ' };
    expect(validateAllSteps(form)).toEqual({});

    const payload = toBaselineSurveyInput(form);
    expect(payload).toStrictEqual({
      householdSize: 4,
      monthlyElectricityKwh: 250,
      lpgCylindersPerMonth: 1,
      commuteMode: 'metro',
      commuteKmOneWay: 10,
      commuteDaysPerWeek: 5,
      flightsShortPerYear: 0,
      flightsLongPerYear: 0,
      dietPattern: 'vegetarian',
      shoppingLevel: 'medium',
      acHoursPerDay: 4,
      state: 'Delhi', // trimmed
    });
    // The sync contract this module promises: whatever passes here, core accepts.
    expect(baselineSurveySchema.safeParse(payload).success).toBe(true);
  });

  it('switches the payload key to monthlyBillInr for the bill input kind', () => {
    const form: SurveyFormState = {
      ...DEFAULT_SURVEY_FORM,
      electricityInputKind: 'bill',
      // 40,000 would fail the 5,000 kWh bound — as a bill (₹1,00,000 cap) it passes.
      monthlyElectricityValue: '40000',
    };
    expect(validateAllSteps(form)).toEqual({});

    const payload = toBaselineSurveyInput(form);
    expect(payload.monthlyBillInr).toBe(40_000);
    expect('monthlyElectricityKwh' in payload).toBe(false);
    expect(baselineSurveySchema.safeParse(payload).success).toBe(true);

    // The same number under the kWh kind is rejected — the bound follows the kind.
    expect(validateAllSteps({ ...form, electricityInputKind: 'kwh' }).monthlyElectricityValue).toBe(
      'Enter a value between 1 and 5000.',
    );
  });

  it('spreads carpoolSize only for car modes', () => {
    const form: SurveyFormState = {
      ...DEFAULT_SURVEY_FORM,
      commuteMode: 'car-petrol',
      carpoolSize: '3',
    };
    expect(validateAllSteps(form)).toEqual({});

    const payload = toBaselineSurveyInput(form);
    expect(payload.carpoolSize).toBe(3);
    expect(baselineSurveySchema.safeParse(payload).success).toBe(true);
  });

  it('drops a whitespace-only state from the payload entirely', () => {
    const payload = toBaselineSurveyInput({ ...DEFAULT_SURVEY_FORM, stateName: '   ' });
    expect('state' in payload).toBe(false);
  });
});

describe('validateAllSteps', () => {
  it('accepts every numeric field at its exact bounds', () => {
    const maxed: SurveyFormState = {
      ...DEFAULT_SURVEY_FORM,
      householdSize: '15',
      monthlyElectricityValue: '5000',
      lpgCylindersPerMonth: '10',
      acHoursPerDay: '24',
      commuteKmOneWay: '200',
      commuteDaysPerWeek: '7',
      flightsShortPerYear: '100',
      flightsLongPerYear: '50',
    };
    expect(validateAllSteps(maxed)).toEqual({});
    expect(baselineSurveySchema.safeParse(toBaselineSurveyInput(maxed)).success).toBe(true);
  });

  it('rejects each numeric field one past its bound with a field-scoped error', () => {
    // [field, value, extra overrides] — one violation per case; bounds mirror core schemas.ts.
    const violations: ReadonlyArray<[keyof SurveyFormState, string, Partial<SurveyFormState>?]> = [
      ['householdSize', '0'],
      ['householdSize', '16'],
      ['monthlyElectricityValue', '5001'], // kWh cap
      ['monthlyElectricityValue', '100001', { electricityInputKind: 'bill' }], // ₹ cap
      ['lpgCylindersPerMonth', '11'],
      ['acHoursPerDay', '25'],
      ['commuteKmOneWay', '201'],
      ['commuteDaysPerWeek', '8'],
      ['carpoolSize', '5', { commuteMode: 'car-petrol' }],
      ['flightsShortPerYear', '101'],
      ['flightsLongPerYear', '51'],
    ];
    for (const [field, value, overrides] of violations) {
      const errors = validateAllSteps({ ...DEFAULT_SURVEY_FORM, ...overrides, [field]: value });
      expect(errors[field], `${field}=${value}`).toMatch(/^Enter a value between /);
      // The violated field must be the only complaint.
      expect(Object.keys(errors), `${field}=${value}`).toEqual([field]);
    }
  });

  it('requires the electricity value and enforces whole numbers where core does', () => {
    expect(
      validateAllSteps({ ...DEFAULT_SURVEY_FORM, monthlyElectricityValue: '' })
        .monthlyElectricityValue,
    ).toBe('This field is required.');
    expect(validateAllSteps({ ...DEFAULT_SURVEY_FORM, householdSize: '2.5' }).householdSize).toBe(
      'Enter a whole number.',
    );
    expect(validateAllSteps({ ...DEFAULT_SURVEY_FORM, householdSize: 'four' }).householdSize).toBe(
      'Enter a number.',
    );
    // Fractional kilometres are legitimate — no integer rule on distance.
    expect(validateAllSteps({ ...DEFAULT_SURVEY_FORM, commuteKmOneWay: '12.5' })).toEqual({});
  });

  it('validates display and state names on their trimmed length', () => {
    // 60 real characters survive any amount of padding…
    const padded = { ...DEFAULT_SURVEY_FORM, displayName: `  ${'x'.repeat(60)}  ` };
    expect(validateAllSteps(padded)).toEqual({});
    // …61 fail, trimmed or not.
    const over = { ...DEFAULT_SURVEY_FORM, displayName: `  ${'x'.repeat(61)}  ` };
    expect(validateAllSteps(over).displayName).toBe('Keep this under 60 characters.');
    expect(validateAllSteps({ ...DEFAULT_SURVEY_FORM, stateName: 'y'.repeat(61) }).stateName).toBe(
      'Keep this under 60 characters.',
    );
  });
});
