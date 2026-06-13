/**
 * Client state composition: ProfileProvider (identity + baseline) and
 * GamificationProvider (points/streak/log) with schema-validated localStorage
 * mirrors and API bootstrap resilience. Pages consume via
 * useProfile()/useGamification(); <Providers> is the single wrapper mounted
 * in app/layout.tsx.
 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { baselineFootprintResultSchema, gamificationStateSchema } from '@carbon-saathi/core';
import type {
  BaselineFootprintResult,
  BaselineSurveyInput,
  GamificationState,
  UserState,
} from '@carbon-saathi/core';
import { z } from 'zod';
import * as api from './api-client';
import type { ActionLogResponse, ApiResult } from './api-client';
import { attachSaathiDebug, detachSaathiDebug } from './debug';
import {
  getStoredJson,
  removeStored,
  setStoredJson,
  STORAGE_KEYS,
  type StorageKey,
} from './storage';
import { ToastProvider } from '../components/ui/Toast';

// ── Mirror validation ─────────────────────────────────────────────────────────

interface StoredProfile {
  userId: string;
  displayName: string;
  baseline: BaselineFootprintResult | null;
}

// Security: localStorage is user-editable, so restored mirrors are untrusted
// input — storage.ts only guarantees syntactically valid JSON, never shape.
// The gamification mirror reuses core's schema; the profile and userId
// mirrors are web-only shapes, so their schemas live here.
const storedProfileSchema: z.ZodType<StoredProfile> = z.object({
  userId: z.string().min(1),
  displayName: z.string(),
  baseline: baselineFootprintResultSchema.nullable(),
});

const storedUserIdSchema = z.string().min(1);

/**
 * Read a mirror and validate its shape. An invalid payload self-heals
 * exactly like storage.ts's corrupt-JSON path: drop the entry so every
 * later read is a clean miss, and fall back to null.
 */
function readValidatedMirror<T>(
  key: StorageKey,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): T | null {
  const raw = getStoredJson<unknown>(key);
  if (raw === null) return null;
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  removeStored(key);
  return null;
}

// ── Profile ───────────────────────────────────────────────────────────────────

type GamificationSink = (gamification: GamificationState | null) => void;

export interface ProfileContextValue {
  userId: string | null;
  displayName: string | null;
  baseline: BaselineFootprintResult | null;
  /** False until the mount-time restore + bootstrap pass has settled. */
  ready: boolean;
  /** Sync a full server UserState into both contexts and the mirrors. */
  applyUserState: (state: UserState) => void;
  /** Re-seed the in-memory API store from local mirrors (restart resilience). */
  bootstrap: () => Promise<UserState | null>;
  clearProfile: () => void;
  /** Internal wiring for GamificationProvider — pages never call this. */
  registerGamificationSink: (sink: GamificationSink) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [ready, setReady] = useState(false);
  // Ref (not state): the sink is registered by a child during effects and
  // must be callable synchronously without re-rendering this provider.
  const gamificationSinkRef = useRef<GamificationSink>(() => undefined);

  const registerGamificationSink = useCallback((sink: GamificationSink) => {
    gamificationSinkRef.current = sink;
  }, []);

  const applyUserState = useCallback((state: UserState) => {
    const next: StoredProfile = {
      userId: state.userId,
      displayName: state.displayName,
      baseline: state.baseline ?? null,
    };
    setProfile(next);
    setStoredJson(STORAGE_KEYS.profile, next);
    setStoredJson(STORAGE_KEYS.userId, state.userId);
    gamificationSinkRef.current(state.gamification);
  }, []);

  const bootstrap = useCallback(async (): Promise<UserState | null> => {
    // Read mirrors (not React state) so this works from any callback age.
    const stored = readValidatedMirror(STORAGE_KEYS.profile, storedProfileSchema);
    const storedUserId =
      stored?.userId ?? readValidatedMirror(STORAGE_KEYS.userId, storedUserIdSchema);
    const storedGamification = readValidatedMirror(
      STORAGE_KEYS.gamification,
      gamificationStateSchema,
    );
    const result = await api.bootstrapUser({
      userId: storedUserId ?? undefined,
      displayName: stored?.displayName,
      baseline: stored?.baseline ?? undefined,
      gamification: storedGamification ?? undefined,
    });
    if (!result.ok) return null;
    applyUserState(result.data);
    return result.data;
  }, [applyUserState]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    removeStored(STORAGE_KEYS.profile);
    removeStored(STORAGE_KEYS.userId);
    removeStored(STORAGE_KEYS.gamification);
    gamificationSinkRef.current(null);
  }, []);

  useEffect(() => {
    // Restore instantly from mirrors, then re-seed the API's in-memory store —
    // without this, a server restart would 404 every per-user call.
    const stored = readValidatedMirror(STORAGE_KEYS.profile, storedProfileSchema);
    if (stored !== null) setProfile(stored);
    const storedUserId =
      stored?.userId ?? readValidatedMirror(STORAGE_KEYS.userId, storedUserIdSchema);
    if (storedUserId !== null) {
      void bootstrap().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [bootstrap]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      userId: profile?.userId ?? null,
      displayName: profile?.displayName ?? null,
      baseline: profile?.baseline ?? null,
      ready,
      applyUserState,
      bootstrap,
      clearProfile,
      registerGamificationSink,
    }),
    [profile, ready, applyUserState, bootstrap, clearProfile, registerGamificationSink],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === null) {
    throw new Error('useProfile must be used inside <Providers> (see app/layout.tsx).');
  }
  return context;
}

// ── Gamification ──────────────────────────────────────────────────────────────

export interface GamificationContextValue {
  gamification: GamificationState | null;
  applyGamification: (state: GamificationState | null) => void;
  /** Logs an action with one automatic re-bootstrap retry on 404. */
  logAction: (actionId: string, quantity: number) => Promise<ApiResult<ActionLogResponse>>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const profile = useProfile();
  const [gamification, setGamification] = useState<GamificationState | null>(null);

  const applyGamification = useCallback((state: GamificationState | null) => {
    setGamification(state);
    if (state === null) {
      removeStored(STORAGE_KEYS.gamification);
    } else {
      setStoredJson(STORAGE_KEYS.gamification, state);
    }
  }, []);

  useEffect(() => {
    const stored = readValidatedMirror(STORAGE_KEYS.gamification, gamificationStateSchema);
    if (stored !== null) setGamification(stored);
  }, []);

  // Child effects run before parent effects, so this registration lands
  // before ProfileProvider's mount-time bootstrap can deliver state.
  const { registerGamificationSink } = profile;
  useEffect(() => {
    registerGamificationSink(applyGamification);
  }, [registerGamificationSink, applyGamification]);

  const logAction = useCallback(
    async (actionId: string, quantity: number): Promise<ApiResult<ActionLogResponse>> => {
      const userId = profile.userId ?? readValidatedMirror(STORAGE_KEYS.userId, storedUserIdSchema);
      if (userId === null) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'No profile yet — complete onboarding first.' },
        };
      }
      let result = await api.logAction({ userId, actionId, quantity });
      if (!result.ok && result.error.code === 'NOT_FOUND') {
        // The API's in-memory store was wiped (restart). Re-seed and retry once.
        await profile.bootstrap();
        result = await api.logAction({ userId, actionId, quantity });
      }
      if (result.ok) {
        // The server trims actionLog from its summary; rebuild the local
        // mirror's log by replacing today's slice with the authoritative
        // todayLog so the "Today" views stay correct across devices/restarts.
        const todayPrefix = result.data.todayLog[0]?.loggedAtISO.slice(0, 10);
        const priorDays = (gamification?.actionLog ?? []).filter(
          (entry) => entry.loggedAtISO.slice(0, 10) !== todayPrefix,
        );
        applyGamification({
          points: result.data.gamification.points,
          totalCo2SavedKg: result.data.gamification.totalCo2SavedKg,
          streak: result.data.gamification.streak,
          actionLog: [...priorDays, ...result.data.todayLog],
          earnedBadges: result.data.gamification.earnedBadges ?? [],
          pledge: result.data.gamification.pledge ?? null,
        });
      }
      return result;
    },
    [profile, applyGamification, gamification],
  );

  const value = useMemo<GamificationContextValue>(
    () => ({ gamification, applyGamification, logAction }),
    [gamification, applyGamification, logAction],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const context = useContext(GamificationContext);
  if (context === null) {
    throw new Error('useGamification must be used inside <Providers> (see app/layout.tsx).');
  }
  return context;
}

// ── Debug bridge (window.__saathi — e2e fast paths) ──────────────────────────

// Deterministic demo persona: a Delhi metro-commuting family of four. The
// numbers exercise every footprint category without being extreme.
const DEMO_SURVEY: BaselineSurveyInput = {
  householdSize: 4,
  monthlyElectricityKwh: 250,
  lpgCylindersPerMonth: 1,
  commuteMode: 'metro',
  commuteKmOneWay: 12,
  commuteDaysPerWeek: 5,
  flightsShortPerYear: 1,
  flightsLongPerYear: 0,
  dietPattern: 'nonveg-weekly',
  shoppingLevel: 'medium',
  acHoursPerDay: 4,
};

function SaathiDebugBridge(): null {
  const profile = useProfile();
  const { gamification, logAction } = useGamification();

  useEffect(() => {
    attachSaathiDebug({
      seedDemoUser: async () => {
        const baselineResult = await api.calculateBaseline(DEMO_SURVEY);
        if (!baselineResult.ok) return null;
        const userResult = await api.bootstrapUser({
          displayName: 'Demo Saathi',
          baseline: baselineResult.data.baseline,
        });
        if (!userResult.ok) return null;
        profile.applyUserState(userResult.data);
        return userResult.data;
      },
      getState: () => ({
        userId: profile.userId,
        displayName: profile.displayName,
        baseline: profile.baseline,
        gamification,
      }),
      logAction: (actionId: string, quantity = 1) => logAction(actionId, quantity),
    });
    return detachSaathiDebug;
  }, [profile, gamification, logAction]);

  return null;
}

// ── Composition root ──────────────────────────────────────────────────────────

/** Mounted once in app/layout.tsx; every page gets all three contexts. */
export function Providers({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <ToastProvider>
      <ProfileProvider>
        <GamificationProvider>
          <SaathiDebugBridge />
          {children}
        </GamificationProvider>
      </ProfileProvider>
    </ToastProvider>
  );
}
