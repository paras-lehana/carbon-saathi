/**
 * fieldErrorsFromZod: null on success; on failure one message per field keyed
 * by the issue's first path segment — exercised against real core schemas
 * (including a refinement) plus structural stubs for the edge cases.
 */
import { describe, expect, it } from 'vitest';
import { baselineSurveySchema, suryaGharInputSchema } from '@carbon-saathi/core';
import { fieldErrorsFromZod, type FieldSchema } from '../form-validation';

describe('fieldErrorsFromZod', () => {
  it('returns null when the values satisfy the schema', () => {
    expect(fieldErrorsFromZod(suryaGharInputSchema, { monthlyUnits: 300 })).toBeNull();
  });

  it('maps each invalid field to its message', () => {
    const errors = fieldErrorsFromZod(suryaGharInputSchema, {
      monthlyUnits: 5, // below the 30-unit floor
      roofAreaSqFt: 10, // below the 80 sq ft floor
    });
    expect(Object.keys(errors ?? {}).sort()).toEqual(['monthlyUnits', 'roofAreaSqFt']);
    expect(errors?.monthlyUnits).toMatch(/30/);
  });

  it('keys refinement issues by their declared path', () => {
    // A survey valid except for the either-kWh-or-bill refinement.
    const errors = fieldErrorsFromZod(baselineSurveySchema, {
      householdSize: 3,
      lpgCylindersPerMonth: 1,
      commuteMode: 'metro',
      commuteKmOneWay: 10,
      commuteDaysPerWeek: 5,
      flightsShortPerYear: 0,
      flightsLongPerYear: 0,
      dietPattern: 'vegetarian',
      shoppingLevel: 'medium',
      acHoursPerDay: 4,
    });
    expect(errors).toEqual({
      monthlyElectricityKwh: 'Provide monthlyElectricityKwh or monthlyBillInr',
    });
  });

  it('keeps the first message when one field carries several issues', () => {
    const stub: FieldSchema = {
      safeParse: () => ({
        success: false,
        error: {
          issues: [
            { path: ['pumpHp'], message: 'First message.' },
            { path: ['pumpHp'], message: 'Second message.' },
          ],
        },
      }),
    };
    expect(fieldErrorsFromZod(stub, {})).toEqual({ pumpHp: 'First message.' });
  });

  it('keys pathless issues under form so no failure is silent', () => {
    const stub: FieldSchema = {
      safeParse: () => ({
        success: false,
        error: { issues: [{ path: [], message: 'Provide at least one field.' }] },
      }),
    };
    expect(fieldErrorsFromZod(stub, {})).toEqual({ form: 'Provide at least one field.' });
  });
});
