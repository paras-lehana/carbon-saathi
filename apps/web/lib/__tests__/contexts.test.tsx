/**
 * Provider composition through <Providers> with a stubbed fetch: mount-time
 * restore + bootstrap re-seeding, corrupt-mirror recovery, the logAction
 * 404 → re-bootstrap → retry-once flow, the prior-days/todayLog mirror merge
 * and clearProfile wiping every mirror.
 */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ActionLogEntry,
  GamificationState,
  LevelProgress,
  UserState,
} from '@carbon-saathi/core';
import type { ActionLogResponse } from '../api-client';
import { Providers, useGamification, useProfile } from '../contexts';
import { STORAGE_KEYS, type StorageKey } from '../storage';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const YESTERDAY_ENTRY: ActionLogEntry = {
  actionId: 'veg-day',
  quantity: 1,
  co2SavedKg: 0.8,
  points: 8,
  loggedAtISO: '2026-06-11T08:00:00.000Z',
};

/** Today's wfh log — mirrored locally AND re-issued by the server's todayLog. */
const TODAY_WFH_ENTRY: ActionLogEntry = {
  actionId: 'wfh-day',
  quantity: 1,
  co2SavedKg: 2,
  points: 20,
  loggedAtISO: '2026-06-12T05:00:00.000Z',
};

const NEW_VEG_ENTRY: ActionLogEntry = {
  actionId: 'veg-day',
  quantity: 1,
  co2SavedKg: 0.8,
  points: 8,
  loggedAtISO: '2026-06-12T06:00:00.000Z',
};

const LEVEL_SEED: LevelProgress = {
  name: 'Seed',
  icon: 'seed',
  minPoints: 0,
  nextLevelAt: 100,
  progressPct: 36,
};

function storedGamification(): GamificationState {
  return {
    // 8 (yesterday's veg-day) + 20 (today's wfh-day) = 28 points mirrored.
    points: 28,
    totalCo2SavedKg: 2.8,
    streak: { current: 2, longest: 2, shields: 0, lastLogDateISO: '2026-06-12' },
    actionLog: [YESTERDAY_ENTRY, TODAY_WFH_ENTRY],
    earnedBadges: ['pehli-jeet'],
    pledge: null,
  };
}

function serverUserState(overrides: Partial<UserState> = {}): UserState {
  return {
    userId: 'u-1',
    displayName: 'Asha',
    createdAtISO: '2026-06-01T00:00:00.000Z',
    gamification: storedGamification(),
    ...overrides,
  };
}

function logResponse(): ActionLogResponse {
  return {
    impact: { co2SavedKg: 0.8, points: 8 },
    gamification: {
      // 28 mirrored + 8 for this veg-day = 36.
      points: 36,
      totalCo2SavedKg: 3.6,
      streak: { current: 2, longest: 2, shields: 0, lastLogDateISO: '2026-06-12' },
      earnedBadges: ['pehli-jeet'],
      pledge: null,
      level: LEVEL_SEED,
    },
    // The server's authoritative "today": the wfh entry plus the new veg one.
    todayLog: [TODAY_WFH_ENTRY, NEW_VEG_ENTRY],
    newBadges: [],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function seedMirrors(): void {
  window.localStorage.setItem(
    STORAGE_KEYS.profile,
    JSON.stringify({ userId: 'u-1', displayName: 'Asha', baseline: null }),
  );
  window.localStorage.setItem(STORAGE_KEYS.userId, JSON.stringify('u-1'));
  window.localStorage.setItem(STORAGE_KEYS.gamification, JSON.stringify(storedGamification()));
}

function readMirror<T>(key: StorageKey): T | null {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}

// ── Probe ────────────────────────────────────────────────────────────────────

/** Renders both contexts as plain text and exposes the two mutating calls. */
function Probe(): React.JSX.Element {
  const { userId, displayName, ready, clearProfile } = useProfile();
  const { gamification, logAction } = useGamification();
  const [lastLog, setLastLog] = useState('none');
  return (
    <div>
      <p>ready:{String(ready)}</p>
      <p>user:{userId ?? 'none'}</p>
      <p>name:{displayName ?? 'none'}</p>
      <p>points:{gamification?.points ?? 'none'}</p>
      <p>lastLog:{lastLog}</p>
      <button
        type="button"
        onClick={() => {
          void logAction('veg-day', 1).then((result) => {
            setLastLog(
              result.ok ? `ok:${result.data.impact.points}` : `error:${result.error.code}`,
            );
          });
        }}
      >
        log veg day
      </button>
      <button type="button" onClick={clearProfile}>
        clear profile
      </button>
    </div>
  );
}

function renderProviders(): void {
  render(
    <Providers>
      <Probe />
    </Providers>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Providers', () => {
  it('becomes ready with no user and no network call when storage is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderProviders();

    expect(await screen.findByText('ready:true')).toBeInTheDocument();
    expect(screen.getByText('user:none')).toBeInTheDocument();
    expect(screen.getByText('points:none')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-seeds the API from the mirrors on mount and applies the server response', async () => {
    seedMirrors();
    const restored = serverUserState({
      displayName: 'Asha Restored',
      gamification: { ...storedGamification(), points: 99 },
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(restored));
    vi.stubGlobal('fetch', fetchMock);

    renderProviders();

    expect(await screen.findByText('ready:true')).toBeInTheDocument();
    expect(screen.getByText('name:Asha Restored')).toBeInTheDocument();
    expect(screen.getByText('points:99')).toBeInTheDocument();

    // Exactly one call: the bootstrap POST carrying the mirrored state so a
    // restarted API can re-seed its in-memory store.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/users/bootstrap');
    const body = JSON.parse(String(init.body)) as {
      userId: string;
      displayName: string;
      gamification: GamificationState;
    };
    expect(body.userId).toBe('u-1');
    expect(body.displayName).toBe('Asha');
    expect(body.gamification.points).toBe(28);
    expect(body.gamification.actionLog).toHaveLength(2);

    // Both mirrors now hold the server's authoritative copy.
    expect(readMirror<{ displayName: string }>(STORAGE_KEYS.profile)?.displayName).toBe(
      'Asha Restored',
    );
    expect(readMirror<GamificationState>(STORAGE_KEYS.gamification)?.points).toBe(99);
  });

  it('recovers from a corrupt profile mirror: no throw, entry cleared, still ready', async () => {
    window.localStorage.setItem(STORAGE_KEYS.profile, '{not json');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderProviders();

    expect(await screen.findByText('ready:true')).toBeInTheDocument();
    expect(screen.getByText('user:none')).toBeInTheDocument();
    // lib/storage self-heals: the corrupt entry is dropped on first read.
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logAction success updates state and merges todayLog into the mirror without duplicates', async () => {
    seedMirrors();
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const url = String(args[0]);
      if (url === '/api/users/bootstrap') return jsonResponse(serverUserState());
      if (url === '/api/actions/log') return jsonResponse(logResponse());
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderProviders();
    expect(await screen.findByText('ready:true')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'log veg day' }));

    expect(await screen.findByText('lastLog:ok:8')).toBeInTheDocument();
    expect(screen.getByText('points:36')).toBeInTheDocument();

    const logCall = fetchMock.mock.calls.find((call) => String(call[0]) === '/api/actions/log');
    expect(JSON.parse(String(logCall?.[1]?.body))).toEqual({
      userId: 'u-1',
      actionId: 'veg-day',
      quantity: 1,
    });

    // Mirror merge: yesterday's entry survives, today's slice is replaced by
    // the authoritative todayLog — the locally mirrored wfh copy is not doubled.
    const mirror = readMirror<GamificationState>(STORAGE_KEYS.gamification);
    expect(mirror?.points).toBe(36);
    expect(mirror?.actionLog).toEqual([YESTERDAY_ENTRY, TODAY_WFH_ENTRY, NEW_VEG_ENTRY]);
  });

  it('retries logAction once after a 404 by re-bootstrapping the user', async () => {
    // Only the userId mirror survives — the API store was wiped by a restart.
    window.localStorage.setItem(STORAGE_KEYS.userId, JSON.stringify('u-1'));
    let logCalls = 0;
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const url = String(args[0]);
      if (url === '/api/users/bootstrap') return jsonResponse(serverUserState());
      if (url === '/api/actions/log') {
        logCalls += 1;
        return logCalls === 1
          ? jsonResponse({ error: { code: 'NOT_FOUND', message: 'Unknown userId.' } }, 404)
          : jsonResponse(logResponse());
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderProviders();
    expect(await screen.findByText('ready:true')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'log veg day' }));

    // The retry's success is what the caller sees, not the interim 404.
    expect(await screen.findByText('lastLog:ok:8')).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      '/api/users/bootstrap', // mount restore
      '/api/actions/log', // 404 — store was wiped
      '/api/users/bootstrap', // automatic re-seed
      '/api/actions/log', // retry succeeds
    ]);
  });

  it('clearProfile wipes all three mirrors and resets both contexts', async () => {
    seedMirrors();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(serverUserState())));

    renderProviders();
    expect(await screen.findByText('ready:true')).toBeInTheDocument();
    expect(screen.getByText('user:u-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'clear profile' }));

    expect(screen.getByText('user:none')).toBeInTheDocument();
    expect(screen.getByText('name:none')).toBeInTheDocument();
    expect(screen.getByText('points:none')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.userId)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.gamification)).toBeNull();
  });
});
