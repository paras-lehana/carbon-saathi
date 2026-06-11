/**
 * Google service catalog: entry count, status summary, and the security
 * invariant that the catalog only ever names env vars (never values).
 */
import { describe, expect, it } from 'vitest';
import { GOOGLE_SERVICES, getServiceSummary } from '../google/service-catalog';

describe('GOOGLE_SERVICES', () => {
  it('catalogs at least 10 integrations with unique ids', () => {
    expect(GOOGLE_SERVICES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(GOOGLE_SERVICES.map((s) => s.id)).size).toBe(GOOGLE_SERVICES.length);
  });

  it('every entry documents value, fallback and evidence', () => {
    for (const service of GOOGLE_SERVICES) {
      expect(service.userValue.length).toBeGreaterThan(0);
      expect(service.fallbackMode.length).toBeGreaterThan(0);
      expect(service.evidenceSignals.length).toBeGreaterThan(0);
    }
  });

  it('envVars contain only variable NAMES — never values or secrets', () => {
    for (const service of GOOGLE_SERVICES) {
      for (const envVar of service.envVars) {
        // Names are UPPER_SNAKE identifiers; anything with '=', spaces or
        // lowercase would indicate a leaked value.
        expect(envVar).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    }
  });
});

describe('getServiceSummary', () => {
  it('counts statuses across the catalog', () => {
    expect(getServiceSummary()).toEqual({
      implemented: 3, // Gemini, Cloud Run, Cloud Logging
      readyWithKey: 3, // Distance Matrix, Maps JS, GA4
      planned: 4, // Firebase Auth, Firestore, Hosting, Secret Manager
      total: 10,
    });
  });
});
