/**
 * Quick-quiz contract: question/option catalog shape, the per-answer mapping
 * table behind quizToSurvey (incl. the no-AC → 0 hours case), and the
 * estimateFromQuiz guarantee that the quiz path computes exactly what the
 * full calculator would for the mapped survey.
 */
import { describe, expect, it } from 'vitest';
import { calculateBaselineFootprint } from '../baseline';
import { estimateFromQuiz, quizToSurvey, QUIZ_QUESTIONS } from '../quick-quiz';
import type { QuizAnswers } from '../types';

/** Mid-range answer set used wherever a full set is needed. */
const METRO_ANSWERS: QuizAnswers = {
  commute: 'metro-bus',
  ac: 'few-hours',
  diet: 'eggs',
  flights: 'one-two',
  shopping: 'monthly',
};

describe('QUIZ_QUESTIONS contract', () => {
  it('asks exactly 5 questions with unique ids', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5);
    const ids = QUIZ_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual(['commute', 'ac', 'diet', 'flights', 'shopping']);
  });

  it('gives every option an id, label, emoji and blurb', () => {
    for (const question of QUIZ_QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      const optionIds = question.options.map((option) => option.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
      for (const option of question.options) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(option.emoji.length).toBeGreaterThan(0);
        expect(option.blurb.length).toBeGreaterThan(0);
      }
    }
  });

  it('maps every displayed option id through quizToSurvey without falling over', () => {
    // Cross product would be 5×4×4×3×3 — sampling each axis independently
    // against the metro baseline covers every individual option id.
    for (const question of QUIZ_QUESTIONS) {
      for (const option of question.options) {
        const answers = { ...METRO_ANSWERS, [question.id]: option.id } as QuizAnswers;
        const survey = quizToSurvey(answers);
        expect(survey.householdSize).toBe(4);
      }
    }
  });
});

describe('quizToSurvey mapping table', () => {
  it('maps commute answers to survey modes', () => {
    expect(quizToSurvey({ ...METRO_ANSWERS, commute: 'car' }).commuteMode).toBe('car-petrol');
    expect(quizToSurvey({ ...METRO_ANSWERS, commute: 'car' }).carpoolSize).toBe(1);
    expect(quizToSurvey({ ...METRO_ANSWERS, commute: 'metro-bus' }).commuteMode).toBe('metro');
    expect(quizToSurvey({ ...METRO_ANSWERS, commute: 'cycle-walk' }).commuteMode).toBe(
      'cycle-walk',
    );
  });

  it('zeroes the commute for work-from-home', () => {
    const survey = quizToSurvey({ ...METRO_ANSWERS, commute: 'wfh' });
    expect(survey.commuteMode).toBe('wfh');
    expect(survey.commuteDaysPerWeek).toBe(0);
  });

  it('maps no-ac to ZERO hours — not the few-hours default', () => {
    // Regression pin: `|| 4` once turned the 0 into 4, silently scoring
    // AC-free homes as 4 hours of nightly AC.
    expect(quizToSurvey({ ...METRO_ANSWERS, ac: 'no-ac' }).acHoursPerDay).toBe(0);
    expect(quizToSurvey({ ...METRO_ANSWERS, ac: 'all-night' }).acHoursPerDay).toBe(10);
    expect(quizToSurvey({ ...METRO_ANSWERS, ac: 'rarely' }).acHoursPerDay).toBe(1);
  });

  it('maps flights to short/long-haul counts', () => {
    expect(quizToSurvey({ ...METRO_ANSWERS, flights: 'none' }).flightsShortPerYear).toBe(0);
    expect(quizToSurvey({ ...METRO_ANSWERS, flights: 'none' }).flightsLongPerYear).toBe(0);
    expect(quizToSurvey({ ...METRO_ANSWERS, flights: 'three-plus' }).flightsShortPerYear).toBe(1);
    expect(quizToSurvey({ ...METRO_ANSWERS, flights: 'three-plus' }).flightsLongPerYear).toBe(1);
  });

  it('maps diet and shopping to the survey enums', () => {
    expect(quizToSurvey({ ...METRO_ANSWERS, diet: 'veg' }).dietPattern).toBe('vegetarian');
    expect(quizToSurvey({ ...METRO_ANSWERS, diet: 'nonveg-daily' }).dietPattern).toBe(
      'nonveg-daily',
    );
    expect(quizToSurvey({ ...METRO_ANSWERS, shopping: 'minimal' }).shoppingLevel).toBe('low');
    expect(quizToSurvey({ ...METRO_ANSWERS, shopping: 'love-shopping' }).shoppingLevel).toBe(
      'high',
    );
  });
});

describe('estimateFromQuiz', () => {
  it('equals calculateBaselineFootprint over the mapped survey exactly', () => {
    const estimate = estimateFromQuiz(METRO_ANSWERS);
    const direct = calculateBaselineFootprint(quizToSurvey(METRO_ANSWERS));
    expect(estimate.ok && direct.ok).toBe(true);
    if (estimate.ok && direct.ok) {
      expect(estimate.value.baseline).toEqual(direct.value);
      expect(estimate.value.survey).toEqual(quizToSurvey(METRO_ANSWERS));
    }
  });

  it('orders footprints sensibly: greenest answers < heaviest answers', () => {
    const greenest = estimateFromQuiz({
      commute: 'cycle-walk',
      ac: 'no-ac',
      diet: 'veg',
      flights: 'none',
      shopping: 'minimal',
    });
    const heaviest = estimateFromQuiz({
      commute: 'car',
      ac: 'all-night',
      diet: 'nonveg-daily',
      flights: 'three-plus',
      shopping: 'love-shopping',
    });
    expect(greenest.ok && heaviest.ok).toBe(true);
    if (greenest.ok && heaviest.ok) {
      // Transport, food and shopping all separate the two profiles. Home
      // energy does NOT — the quiz pins electricity at the 250 kWh default
      // and the AC answer only steers generated tips.
      expect(greenest.value.baseline.totalKgAnnual).toBeLessThan(
        heaviest.value.baseline.totalKgAnnual,
      );
      expect(greenest.value.baseline.byCategory.transport).toBeLessThan(
        heaviest.value.baseline.byCategory.transport,
      );
      expect(greenest.value.baseline.byCategory.food).toBeLessThan(
        heaviest.value.baseline.byCategory.food,
      );
    }
  });
});
