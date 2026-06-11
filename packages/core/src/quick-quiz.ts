/**
 * 30-second footprint quiz. Questions map to survey inputs with middle-of-road
 * defaults for fields not directly answerable. Pure function, deterministic.
 */
import type { BaselineSurveyInput, CommuteMode, DietPattern, QuizAnswers, QuizQuestion } from './types';

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

// Deterministic mapping: quiz answers → survey input. The unmapped fields
// default to a middle-of-road Delhi household of four.
export function quizToSurvey(answers: QuizAnswers): BaselineSurveyInput {
  const commuteMap: Record<string, CommuteMode> = {
    car: 'car-petrol',
    'two-wheeler': 'two-wheeler',
    'metro-bus': 'metro',
    'cycle-walk': 'cycle-walk',
    wfh: 'wfh',
  };

  const dietMap: Record<string, DietPattern> = {
    'nonveg-daily': 'nonveg-daily',
    'nonveg-weekly': 'nonveg-weekly',
    eggs: 'eggs',
    veg: 'vegetarian',
  };

  const acHoursMap: Record<string, number> = {
    'all-night': 10,
    'few-hours': 4,
    rarely: 1,
    'no-ac': 0,
  };

  const shoppingMap: Record<string, 'low' | 'medium' | 'high'> = {
    minimal: 'low',
    monthly: 'medium',
    'love-shopping': 'high',
  };

  // Short-haul: 0 (mostly local); long-haul: one every 1-2 years on average.
  const flightsMap: Record<string, { short: number; long: number }> = {
    none: { short: 0, long: 0 },
    'one-two': { short: 1, long: 0 },
    'three-plus': { short: 1, long: 1 },
  };

  const flights = flightsMap[answers.flights] || { short: 0, long: 0 };

  return {
    householdSize: 4,
    monthlyElectricityKwh: 250, // ~3,000 kWh/yr, typical urban household
    lpgCylindersPerMonth: 1,
    commuteMode: commuteMap[answers.commute] || 'metro',
    commuteKmOneWay: 10, // ~20 km round-trip, Delhi metro-commute distance
    commuteDaysPerWeek: answers.commute === 'wfh' ? 0 : 5,
    carpoolSize: answers.commute === 'car' ? 1 : undefined,
    flightsShortPerYear: flights.short,
    flightsLongPerYear: flights.long,
    dietPattern: dietMap[answers.diet] || 'vegetarian',
    shoppingLevel: shoppingMap[answers.shopping] || 'medium',
    acHoursPerDay: acHoursMap[answers.ac] || 4,
    state: 'Delhi',
  };
}

export function estimateFromQuiz(answers: QuizAnswers) {
  // Import at call time to avoid circular deps during module load.
  const { calculateBaselineFootprint } = require('./baseline');
  const survey = quizToSurvey(answers);
  const baseline = calculateBaselineFootprint(survey);
  return { baseline, survey };
}
