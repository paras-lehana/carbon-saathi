/**
 * Dashboard route: guards on profile state (EmptyState when there is none),
 * loads the aggregate dashboard payload plus the action catalog and the
 * leaderboard slice through useApiQuery, and hands everything to the bento
 * grid. Owns the loader (including bootstrap-and-retry); presentation lives
 * in components/.
 */
'use client';

import { useCallback } from 'react';
import type { ActionDefinition } from '@carbon-saathi/core';
import { CardSkeleton } from '@/components/ui/CardSkeleton';
import { RetryCard } from '@/components/ui/RetryCard';
import * as api from '@/lib/api-client';
import { useProfile } from '@/lib/contexts';
import { useApiQuery } from '@/lib/use-api-query';
import { DashboardGrid } from './components/DashboardGrid';
import { EmptyState } from './components/EmptyState';

interface DashboardData {
  dashboard: api.DashboardResponse;
  /** Empty when the catalog call fails — quick-log then degrades gracefully. */
  actions: ActionDefinition[];
  /** null when the board call fails — the mini card simply hides. */
  leaderboard: api.LeaderboardResponse | null;
}

function GridSkeleton(): React.JSX.Element {
  return (
    <CardSkeleton count={6} label="Loading your dashboard data" containerClassName="bento-grid" />
  );
}

export default function DashboardPage(): React.JSX.Element {
  const { ready, userId, displayName, baseline: profileBaseline, bootstrap } = useProfile();

  const load = useCallback(async (): Promise<api.ApiResult<DashboardData>> => {
    if (userId === null) {
      // Unreachable: the query below is gated on userId. Returning an error
      // (never thrown) keeps the loader inside the ApiResult contract.
      return { ok: false, error: { code: 'NOT_FOUND', message: 'No profile yet.' } };
    }
    let dashboard = await api.getDashboard(userId);
    if (!dashboard.ok && dashboard.error.code === 'NOT_FOUND') {
      // An API restart wiped the in-memory store — re-seed it from the
      // localStorage mirrors and retry once (contexts.tsx contract).
      await bootstrap();
      dashboard = await api.getDashboard(userId);
    }
    if (!dashboard.ok) return dashboard;
    // Catalog and leaderboard are enrichments: if either fails, the grid
    // degrades (no quick-log labels / mini board) instead of sinking.
    const [catalog, leaderboard] = await Promise.all([
      api.getActionCatalog(),
      api.getLeaderboard(userId),
    ]);
    return {
      ok: true,
      data: {
        dashboard: dashboard.data,
        actions: catalog.ok ? [...catalog.data.actions] : [],
        leaderboard: leaderboard.ok ? leaderboard.data : null,
      },
    };
  }, [userId, bootstrap]);

  const { data, error, retry } = useApiQuery(load, { enabled: ready && userId !== null });

  if (!ready) {
    return <GridSkeleton />;
  }
  if (userId === null) {
    // EmptyState carries its own h1 — rendering the page heading too would
    // give the document two competing titles.
    return <EmptyState />;
  }

  // The dashboard payload omits the baseline until onboarding ran on this
  // server; the profile mirror fills that gap after API restarts.
  const baseline = data?.dashboard.baseline ?? profileBaseline;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">Your dashboard</h1>
        <p className="mt-2 text-ink-muted">
          {displayName !== null ? `Namaste, ${displayName} — ` : 'Namaste — '}
          every kilogram you save counts here.
        </p>
      </div>

      {error !== null ? (
        <RetryCard
          id="dashboard-error-heading"
          title="We could not load your dashboard"
          message={error}
          onRetry={retry}
          className="mx-auto max-w-xl"
        />
      ) : data === null ? (
        <GridSkeleton />
      ) : (
        <DashboardGrid
          userId={userId}
          dashboard={data.dashboard}
          baseline={baseline ?? null}
          actions={data.actions}
          leaderboard={data.leaderboard}
          onRefresh={retry}
        />
      )}
    </div>
  );
}
