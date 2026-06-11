/**
 * Barrel surface: everything the API and web apps import from
 * '@carbon-saathi/core' must be re-exported from the package index.
 */
import { describe, expect, it } from 'vitest';
import * as core from '../index';

describe('public barrel', () => {
  it('exports every calculator entry point', () => {
    expect(typeof core.calculateBaselineFootprint).toBe('function');
    expect(typeof core.calculateActionImpact).toBe('function');
    expect(typeof core.calculateSuryaGhar).toBe('function');
    expect(typeof core.adviseKusum).toBe('function');
    expect(typeof core.calculateEvFit).toBe('function');
    expect(typeof core.estimateCommuteModes).toBe('function');
  });

  it('exports the gamification engine', () => {
    expect(typeof core.pointsForCo2).toBe('function');
    expect(typeof core.levelForPoints).toBe('function');
    expect(typeof core.updateStreak).toBe('function');
    expect(typeof core.evaluateMissions).toBe('function');
    expect(typeof core.impactAnalogies).toBe('function');
    expect(core.LEVELS.length).toBe(5);
    expect(core.WEEKLY_MISSIONS.length).toBe(3);
  });

  it('exports data catalogs, schemas and error/result helpers', () => {
    expect(Object.keys(core.EMISSION_FACTORS).length).toBeGreaterThanOrEqual(20);
    expect(core.ACTION_CATALOG.length).toBe(12);
    expect(core.GOOGLE_SERVICES.length).toBeGreaterThanOrEqual(10);
    expect(typeof core.getServiceSummary).toBe('function');
    expect(core.baselineSurveySchema.safeParse).toBeDefined();
    expect(typeof core.appError).toBe('function');
    expect(typeof core.httpStatusFor).toBe('function');
    expect(core.ok(1).ok).toBe(true);
    expect(core.err('e').ok).toBe(false);
  });

  it('exports the quiz, badge, pledge and initiative surfaces', () => {
    expect(core.QUIZ_QUESTIONS.length).toBe(5);
    expect(typeof core.quizToSurvey).toBe('function');
    expect(typeof core.estimateFromQuiz).toBe('function');
    expect(core.BADGE_CATALOG.length).toBe(8);
    expect(typeof core.evaluateBadges).toBe('function');
    expect(typeof core.applyPledgeBonus).toBe('function');
    expect(core.INITIATIVE_CATALOG.length).toBeGreaterThanOrEqual(20);
    expect(typeof core.initiativesByCategory).toBe('function');
    expect(core.ALL_INITIATIVE_CATEGORIES.length).toBe(7);
    expect(Object.keys(core.LIFE_THEMES).length).toBe(7);
    expect(core.quizAnswersSchema.safeParse).toBeDefined();
    expect(core.pledgeRequestSchema.safeParse).toBeDefined();
  });
});
