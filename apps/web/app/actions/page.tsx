/**
 * Actions route: the quick-log catalog grouped by category tabs plus a
 * "Today" side column with running totals. Owns catalog fetching (via
 * useApiQuery) and the today-log state (seeded from the local mirror, then
 * kept authoritative by each log response); per-card stepper/submit logic
 * lives in ActionCard.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { round2 } from '@carbon-saathi/core';
import type { ActionCategory, ActionLogEntry } from '@carbon-saathi/core';
import { ActionLogList } from '@/components/gamification/ActionLogList';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/CardSkeleton';
import { RetryCard } from '@/components/ui/RetryCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Tabs } from '@/components/ui/Tabs';
import * as api from '@/lib/api-client';
import { useGamification, useProfile } from '@/lib/contexts';
import { useApiQuery } from '@/lib/use-api-query';
import { useSeedDemo } from '@/lib/use-seed-demo';
import { ActionCard } from './components/ActionCard';

const CATEGORY_ORDER: ReadonlyArray<{ id: ActionCategory; label: string }> = [
  { id: 'transport', label: '🚌 Transport' },
  { id: 'energy', label: '⚡ Energy' },
  { id: 'food', label: '🥗 Food' },
  { id: 'lifestyle', label: '🧺 Lifestyle' },
];

/** Onboard-or-seed prompt shown until a profile exists (logging needs one). */
function NoProfileNotice(): React.JSX.Element {
  const { seeding, seedDemo } = useSeedDemo();

  return (
    <SectionCard
      id="actions-noprofile-heading"
      title="You need a profile to log actions"
      // The pitch paragraph below owns the spacing (mt-2), not the heading.
      headingClassName="m-0 font-display text-lg font-bold"
    >
      <p className="m-0 mt-2 text-sm text-ink-muted">
        Browse the catalog freely — but to bank points, take the two-minute survey or jump in with a
        demo profile.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button href="/onboarding" size="sm">
          Start the two-minute survey
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void seedDemo()} disabled={seeding}>
          {seeding ? 'Setting up…' : 'Try a demo profile'}
        </Button>
      </div>
    </SectionCard>
  );
}

export default function ActionsPage(): React.JSX.Element {
  const { ready, userId } = useProfile();
  const { gamification } = useGamification();
  const [todayLog, setTodayLog] = useState<ActionLogEntry[] | null>(null);

  const loadCatalog = useCallback(() => api.getActionCatalog(), []);
  const { data, error, retry } = useApiQuery(loadCatalog);
  const catalog = data?.actions ?? null;

  useEffect(() => {
    // Seed today's column once from the local mirror; afterwards each log
    // response replaces it with the server's authoritative view. Defensive
    // Array check: restored snapshots may predate the actionLog field.
    if (todayLog !== null || gamification === null) return;
    const log = Array.isArray(gamification.actionLog) ? gamification.actionLog : [];
    const todayISO = new Date().toISOString().slice(0, 10);
    setTodayLog(log.filter((entry) => entry.loggedAtISO.slice(0, 10) === todayISO));
  }, [gamification, todayLog]);

  const entries = todayLog ?? [];
  const todayCo2 = round2(entries.reduce((sum, entry) => sum + entry.co2SavedKg, 0));
  const todayPoints = entries.reduce((sum, entry) => sum + entry.points, 0);

  const tabs = CATEGORY_ORDER.map((category) => ({
    id: category.id,
    label: category.label,
    content: (
      <div className="grid gap-4 sm:grid-cols-2">
        {(catalog ?? [])
          .filter((action) => action.category === category.id)
          .map((action) => (
            <ActionCard key={action.id} action={action} onLogged={setTodayLog} />
          ))}
      </div>
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Log your actions
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Every action saves real CO₂ and earns 10 points per kilogram. Daily caps keep the board
          honest.
        </p>
      </div>

      {ready && userId === null && <NoProfileNotice />}

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="actions-catalog-heading">
          <h2 id="actions-catalog-heading" className="sr-only">
            Action catalog
          </h2>
          {error !== null ? (
            <RetryCard message={error} onRetry={retry} />
          ) : catalog === null ? (
            <CardSkeleton
              count={4}
              heightClass="h-48"
              label="Loading the action catalog"
              containerClassName="grid gap-4 sm:grid-cols-2"
            />
          ) : (
            <Tabs items={tabs} label="Action categories" />
          )}
        </section>

        <SectionCard
          id="actions-today-heading"
          title="Today"
          as="aside"
          // The list/empty copy below owns the spacing, not the heading.
          headingClassName="m-0 font-display text-lg font-bold"
        >
          {entries.length === 0 ? (
            <p className="m-0 mt-2 text-sm text-ink-muted">
              Nothing logged yet today — pick an action to get started.
            </p>
          ) : (
            <ActionLogList entries={entries} actions={catalog ?? []} className="mt-3" />
          )}
          <dl className="m-0 mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <div>
              <dt className="text-xs text-ink-muted">CO₂ saved today</dt>
              <dd className="m-0 font-display text-lg font-bold text-primary">{todayCo2} kg</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Points today</dt>
              <dd className="m-0 font-display text-lg font-bold text-primary">{todayPoints}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
