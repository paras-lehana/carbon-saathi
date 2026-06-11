/**
 * 30-second footprint quiz: question catalog plus the deterministic mapping
 * from quiz answers to a full baseline survey. Owns the middle-of-road
 * defaults for fields the quiz does not ask about; the API edge owns answer
 * validation (quizAnswersSchema), so the maps here assume well-typed input —
 * the literal-union answer types make an unknown id a compile error.
 */
import { calculateBaselineFootprint } from './baseline';
import type { AppError } from './errors';
import type { Result } from './result';
import { mapResult } from './result';
import type {
  BaselineFootprintResult,
  BaselineSurveyInput,
  CommuteMode,
  DietPattern,
  QuizAcAnswer,
  QuizAnswers,
  QuizCommuteAnswer,
  QuizDietAnswer,
  QuizFlightsAnswer,
  QuizQuestion,
  QuizShoppingAnswer,
} from './types';

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'commute',
    prompt: 'How do you usually get around?',
    options: [
      { id: 'car', label: 'Car', emoji: '🚗', blurb: 'Daily driver' },
      { id: 'two-wheeler', label: 'Two-wheeler', emoji: '🏍️', blurb: 'Bike or scooter' },
      { id: 'metro-bus', label: 'Metro/Bus', emoji: '🚌', blurb: 'Public transit' },
      { id: 'cycle-walk', label: 'Cycle/Walk', emoji: '🚴', blurb: 'Human-powered' },
      { id: 'wfh', label: 'Work from home', emoji: '🏠', blurb: 'No commute' },
    ],
  },
  {
    id: 'ac',
    prompt: 'AC on a hot night?',
    options: [
      { id: 'all-night', label: 'All night', emoji: '❄️', blurb: 'Always running' },
      { id: 'few-hours', label: 'A few hours', emoji: '🌬️', blurb: 'Sometimes' },
      { id: 'rarely', label: 'Rarely', emoji: '🌡️', blurb: 'Open windows' },
      { id: 'no-ac', label: 'No AC', emoji: '🌴', blurb: 'Not available' },
    ],
  },
  {
    id: 'diet',
    prompt: 'Your plate, most days?',
    options: [
      { id: 'nonveg-daily', label: 'Meat daily', emoji: '🥩', blurb: 'Non-veg' },
      { id: 'nonveg-weekly', label: 'Meat weekly', emoji: '🍗', blurb: 'Sometimes' },
      { id: 'eggs', label: 'Eggs + veg', emoji: '🥚', blurb: 'Mostly veg' },
      { id: 'veg', label: 'Vegetarian', emoji: '🥬', blurb: 'Plant-based' },
    ],
  },
  {
    id: 'flights',
    prompt: 'Flights in a typical year?',
    options: [
      { id: 'none', label: 'None', emoji: '🚶', blurb: 'Stay grounded' },
      { id: 'one-two', label: '1–2 flights', emoji: '✈️', blurb: 'Occasional' },
      { id: 'three-plus', label: '3+ flights', emoji: '🛫', blurb: 'Frequent flyer' },
    ],
  },
  {
    id: 'shopping',
    prompt: 'New stuff you buy?',
    options: [
      { id: 'minimal', label: 'Minimal', emoji: '👕', blurb: 'Only essentials' },
      { id: 'monthly', label: 'Monthly habits', emoji: '🛍️', blurb: 'Regular buys' },
      { id: 'love-shopping', label: 'Love shopping', emoji: '💳', blurb: 'Frequent shopper' },
    ],
  },
];

// Answer → survey lookup tables. Exhaustive over the literal unions, so a new
// quiz option fails to compile until every table is extended.
const COMMUTE_ANSWER_TO_MODE: Record<QuizCommuteAnswer, CommuteMode> = {
  car: 'car-petrol', // petrol dominates the Indian private-car fleet
  'two-wheeler': 'two-wheeler',
  'metro-bus': 'metro',
  'cycle-walk': 'cycle-walk',
  wfh: 'wfh',
};

const DIET_ANSWER_TO_PATTERN: Record<QuizDietAnswer, DietPattern> = {
  'nonveg-daily': 'nonveg-daily',
  'nonveg-weekly': 'nonveg-weekly',
  eggs: 'eggs',
  veg: 'vegetarian',
};

const AC_ANSWER_TO_HOURS: Record<QuizAcAnswer, number> = {
  'all-night': 10, // a full sleeping night of compressor time
  'few-hours': 4,
  rarely: 1,
  'no-ac': 0,
};

const SHOPPING_ANSWER_TO_LEVEL: Record<QuizShoppingAnswer, BaselineSurveyInput['shoppingLevel']> = {
  minimal: 'low',
  monthly: 'medium',
  'love-shopping': 'high',
};

// Short-haul dominates Indian leisure travel; long-haul appears only for
// frequent flyers (3+ flights implies at least one international segment).
const FLIGHTS_ANSWER_TO_COUNTS: Record<QuizFlightsAnswer, { short: number; long: number }> = {
  none: { short: 0, long: 0 },
  'one-two': { short: 1, long: 0 },
  'three-plus': { short: 1, long: 1 },
};

/**
 * Deterministic mapping: quiz answers → full survey input. Fields the quiz
 * does not ask about default to a middle-of-road urban Delhi household of
 * four (250 kWh/month ≈ the metro-city average; 10 km one-way commute ≈ the
 * Delhi Metro average trip length).
 */
export function quizToSurvey(answers: QuizAnswers): BaselineSurveyInput {
  const flights = FLIGHTS_ANSWER_TO_COUNTS[answers.flights];
  return {
    householdSize: 4,
    monthlyElectricityKwh: 250,
    lpgCylindersPerMonth: 1,
    commuteMode: COMMUTE_ANSWER_TO_MODE[answers.commute],
    commuteKmOneWay: 10,
    commuteDaysPerWeek: answers.commute === 'wfh' ? 0 : 5,
    carpoolSize: answers.commute === 'car' ? 1 : undefined,
    flightsShortPerYear: flights.short,
    flightsLongPerYear: flights.long,
    dietPattern: DIET_ANSWER_TO_PATTERN[answers.diet],
    shoppingLevel: SHOPPING_ANSWER_TO_LEVEL[answers.shopping],
    acHoursPerDay: AC_ANSWER_TO_HOURS[answers.ac],
    state: 'Delhi',
  };
}

/**
 * One-call quiz scoring: maps answers to a survey and runs the baseline
 * calculator on it. Returns the calculator's Result unchanged (an err here
 * means the quiz defaults breached a calculator bound — a programming error,
 * not a user one), pairing the footprint with the survey it came from so the
 * caller can persist both.
 */
export function estimateFromQuiz(
  answers: QuizAnswers,
): Result<{ baseline: BaselineFootprintResult; survey: BaselineSurveyInput }, AppError> {
  const survey = quizToSurvey(answers);
  return mapResult(calculateBaselineFootprint(survey), (baseline) => ({ baseline, survey }));
}
