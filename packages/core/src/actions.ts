/**
 * Quick-log action catalog and per-log impact math. Owns the per-unit CO2
 * savings (each derived from emission-factor deltas, commented inline) and
 * the points contract. Daily caps stop bulk-logging from gaming the
 * leaderboard.
 */
import { appError, type AppError } from './errors';
import { round2 } from './math';
import { err, ok, type Result } from './result';
import type { ActionDefinition, ActionImpact } from './types';

// Points contract: 10 points per kg CO2e — computed, not hand-typed, so the
// invariant can never drift from the catalog values.
function defineAction(definition: Omit<ActionDefinition, 'pointsPerUnit'>): ActionDefinition {
  return { ...definition, pointsPerUnit: Math.round(definition.co2SavedKg * 10) };
}

export const ACTION_CATALOG: readonly ActionDefinition[] = [
  defineAction({
    id: 'metro-instead-of-car',
    label: 'Metro instead of car',
    category: 'transport',
    description: 'Swap a 10 km car trip for the metro.',
    co2SavedKg: 1.55, // (0.17 petrol car − 0.015 metro per pax) × 10 km
    unitLabel: '10 km trip',
    maxPerDay: 4,
  }),
  defineAction({
    id: 'carpool-commute',
    label: 'Carpooled the commute',
    category: 'transport',
    description: 'Share a 10 km car ride with one colleague.',
    co2SavedKg: 0.85, // half of a solo 10 km petrol drive: 0.17 × 10 ÷ 2
    unitLabel: '10 km shared ride',
    maxPerDay: 4,
  }),
  defineAction({
    id: 'cycle-or-walk-short',
    label: 'Cycled or walked a short trip',
    category: 'transport',
    description: 'Do a 5 km errand on foot or by cycle instead of driving.',
    co2SavedKg: 0.85, // 0.17 petrol car × 5 km fully displaced
    unitLabel: '5 km trip',
    maxPerDay: 6,
  }),
  defineAction({
    id: 'bus-instead-of-car',
    label: 'Bus instead of car',
    category: 'transport',
    description: 'Take the city bus for a 10 km trip you would have driven.',
    co2SavedKg: 1.2, // (0.17 petrol car − 0.05 bus per pax) × 10 km
    unitLabel: '10 km trip',
    maxPerDay: 4,
  }),
  defineAction({
    id: 'wfh-day',
    label: 'Worked from home',
    category: 'transport',
    description: 'Skip the commute entirely for a day.',
    co2SavedKg: 3.4, // 0.17 petrol car × 20 km typical round-trip commute avoided
    unitLabel: 'day',
    maxPerDay: 1,
  }),
  defineAction({
    id: 'veg-day',
    label: 'Fully vegetarian day',
    category: 'food',
    description: 'Eat vegetarian for the whole day.',
    co2SavedKg: 0.8, // conservative blend of swapping ~2 non-veg meals (chicken→veg saves 0.5/meal, mutton→veg 2.0)
    unitLabel: 'day',
    maxPerDay: 1,
  }),
  defineAction({
    id: 'home-cooked-day',
    label: 'Home-cooked meals all day',
    category: 'food',
    description: 'Skip food delivery for a day.',
    co2SavedKg: 0.5, // avoided delivery transport + packaging, approximation
    unitLabel: 'day',
    maxPerDay: 1,
  }),
  defineAction({
    id: 'ac-plus-one-degree',
    label: 'Raised AC setpoint by 1 °C',
    category: 'energy',
    description: 'Run the AC one degree warmer for the day.',
    co2SavedKg: 0.9, // ≈6% cooling-energy cut per °C ≈ 1.26 kWh on a long AC day × 0.716 grid factor
    unitLabel: 'day',
    maxPerDay: 1,
  }),
  defineAction({
    id: 'no-ac-evening',
    label: 'Fan-only evening',
    category: 'energy',
    description: 'Use fans instead of the AC for an evening.',
    co2SavedKg: 1.07, // ≈1.5 kWh avoided (1.5 kW split AC for an evening hour) × 0.716 grid factor
    unitLabel: 'evening',
    maxPerDay: 1,
  }),
  defineAction({
    id: 'led-swap',
    label: 'Swapped a bulb for LED',
    category: 'energy',
    description: 'Replace an old bulb with an LED — saving counted per month of use.',
    co2SavedKg: 0.35, // ≈0.49 kWh/month saved per bulb × 0.716 grid factor (conservative)
    unitLabel: 'bulb / month',
    maxPerDay: 10,
  }),
  defineAction({
    id: 'cold-wash-laundry',
    label: 'Cold-water laundry load',
    category: 'lifestyle',
    description: 'Wash a load in cold water instead of heated.',
    co2SavedKg: 0.36, // ≈0.5 kWh water-heating avoided per load × 0.716 grid factor
    unitLabel: 'load',
    maxPerDay: 3,
  }),
  defineAction({
    id: 'line-dry',
    label: 'Line-dried the laundry',
    category: 'lifestyle',
    description: 'Sun-dry a load instead of machine drying.',
    co2SavedKg: 0.7, // ≈1 kWh dryer cycle avoided per load × 0.716 grid factor
    unitLabel: 'load',
    maxPerDay: 3,
  }),
];

export function getActionById(actionId: string): ActionDefinition | undefined {
  return ACTION_CATALOG.find((action) => action.id === actionId);
}

export function calculateActionImpact(
  actionId: string,
  quantity: number,
): Result<ActionImpact, AppError> {
  const definition = getActionById(actionId);
  if (definition === undefined) {
    return err(appError('NOT_FOUND', `Unknown action id: ${actionId}`));
  }
  // Integers only: quantities come from UI steppers, and fractional logs would
  // make the points ledger drift from the 10-points-per-kg contract.
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return err(appError('VALIDATION_FAILED', 'quantity must be a positive integer'));
  }
  if (quantity > definition.maxPerDay) {
    return err(
      appError(
        'VALIDATION_FAILED',
        `quantity exceeds the daily cap of ${definition.maxPerDay} for ${definition.id}`,
      ),
    );
  }
  return ok({
    co2SavedKg: round2(definition.co2SavedKg * quantity),
    points: definition.pointsPerUnit * quantity,
  });
}
