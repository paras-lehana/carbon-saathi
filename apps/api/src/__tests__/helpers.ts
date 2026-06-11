/**
 * Shared fixtures for the API integration tests: env-free config, silent log
 * sink, and a canonical survey. Every test builds its own app instance so
 * rate-limit buckets and stores never leak between files.
 */
import type { BaselineSurveyInput } from '@carbon-saathi/core';
import type { Express } from 'express';
import { APP_VERSION, type AppConfig } from '../config';
import { buildApp, type AppDeps } from '../server';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    nodeEnv: 'test',
    // Single source of truth: tests must never pin a literal that can drift.
    version: APP_VERSION,
    demoMode: true,
    geminiApiKey: undefined,
    geminiModel: 'gemini-2.0-flash',
    mapsApiKey: undefined,
    allowedOrigins: ['http://localhost:3000'],
    rateLimitWindowMs: 60_000,
    rateLimitMax: 60,
    assistantRateLimitMax: 10,
    ...overrides,
  };
}

export function testApp(configOverrides: Partial<AppConfig> = {}, deps: AppDeps = {}): Express {
  return buildApp(testConfig(configOverrides), { logSink: () => undefined, ...deps });
}

/** Delhi metro commuter in a 3-person household — numbers asserted exactly in tests. */
export const METRO_COMMUTER_SURVEY: BaselineSurveyInput = {
  householdSize: 3,
  monthlyElectricityKwh: 250,
  lpgCylindersPerMonth: 1,
  commuteMode: 'metro',
  commuteKmOneWay: 12,
  commuteDaysPerWeek: 5,
  flightsShortPerYear: 2,
  flightsLongPerYear: 0,
  dietPattern: 'vegetarian',
  shoppingLevel: 'medium',
  acHoursPerDay: 4,
};
