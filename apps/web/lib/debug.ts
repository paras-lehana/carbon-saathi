/**
 * Browser debug surface: window.__saathi, used by e2e specs for fast paths
 * (seed a demo user without the survey UI) and by manual demos. Exposed in
 * all environments on purpose — it only drives the same public API calls a
 * user could make, so it leaks nothing and mutates nothing privileged.
 */
import type { BaselineFootprintResult, GamificationState, UserState } from '@carbon-saathi/core';
import type { ActionLogResponse, ApiResult } from './api-client';

export interface SaathiDebugState {
  userId: string | null;
  displayName: string | null;
  baseline: BaselineFootprintResult | null;
  gamification: GamificationState | null;
}

export interface SaathiDebugApi {
  /** Creates a demo profile via the real baseline + bootstrap endpoints. */
  seedDemoUser: () => Promise<UserState | null>;
  getState: () => SaathiDebugState;
  /** Logs one unit of the given action through the normal context flow. */
  logAction: (actionId: string, quantity?: number) => Promise<ApiResult<ActionLogResponse>>;
}

declare global {
  interface Window {
    __saathi?: SaathiDebugApi;
  }
}

export function attachSaathiDebug(api: SaathiDebugApi): void {
  if (typeof window === 'undefined') return;
  window.__saathi = api;
}

export function detachSaathiDebug(): void {
  if (typeof window === 'undefined') return;
  delete window.__saathi;
}
