/**
 * Dashboard route: guards on profile state (EmptyState when there is none),
 * loads the aggregate dashboard payload plus the action catalog and the
 * leaderboard slice, and hands everything to the bento grid. Owns fetching
 * and retry; all presentation lives in components/.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ActionDefinition } from '@carbon-saathi/core';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import * as api from '../../lib/api-client';
import { useProfile } from '../../lib/contexts';
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
    <div role="status" aria-label="Loading your dashboard data">
      <span className="sr-only">Loading your dashboard data…</span>
      <div aria-hidden="true" className="bento-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="glass-card h-44 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage(): React.JSX.Element {
  const { ready, userId, displayName, baseline: profileBaseline, bootstrap } = useProfile();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (uid: string): Promise<void> => {
      setError(null);
      let dashboard = await api.getDashboard(uid);
      if (!dashboard.ok && dashboard.error.code === 'NOT_FOUND') {
        // An API restart wiped the in-memory store — re-seed it from the
        // localStorage mirrors and retry once (contexts.tsx contract).
        await bootstrap();
        dashboard = await api.getDashboard(uid);
      }
      if (!dashboard.ok) {
        setError(dashboard.error.message);
        return;
      }
      // Catalog and leaderboard are enrichments: if either fails, the grid
      // degrades (no quick-log labels / mini board) instead of sinking.
      const [catalog, leaderboard] = await Promise.all([
        api.getActionCatalog(),
        api.getLeaderboard(uid),
      ]);
      setData({
        dashboard: dashboard.data,
        actions: catalog.ok ? [...catalog.data.actions] : [],
        leaderboard: leaderboard.ok ? leaderboard.data : null,
      });
    },
    [bootstrap],
  );

  useEffect(() => {
    if (!ready || userId === null) return;
    void load(userId);
  }, [ready, userId, load]);

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
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Your dashboard
        </h1>
        <p className="mt-2 text-ink-muted">
          {displayName !== null ? `Namaste, ${displayName} — ` : 'Namaste — '}
          every kilogram you save counts here.
        </p>
      </div>

      {error !== null ? (
        <GlassCard
          as="section"
          className="mx-auto max-w-xl py-10 text-center"
          aria-labelledby="dashboard-error-heading"
        >
          <h2 id="dashboard-error-heading" className="m-0 font-display text-lg font-bold">
            We could not load your dashboard
          </h2>
          <p className="mx-auto mt-2 max-w-md text-ink-muted">{error}</p>
          <Button className="mt-4" onClick={() => void load(userId)}>
            Try again
          </Button>
        </GlassCard>
      ) : data === null ? (
        <GridSkeleton />
      ) : (
        <DashboardGrid
          userId={userId}
          dashboard={data.dashboard}
          baseline={baseline ?? null}
          actions={data.actions}
          leaderboard={data.leaderboard}
          onRefresh={() => load(userId)}
        />
      )}
    </div>
  );
}
