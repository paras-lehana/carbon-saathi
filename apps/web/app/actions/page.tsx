/**
 * Actions route: the quick-log catalog grouped by category tabs plus a
 * "Today" side column with running totals. Owns catalog fetching and the
 * today-log state (seeded from the local mirror, then kept authoritative by
 * each log response); per-card stepper/submit logic lives in ActionCard.
 */
'use client';

import { useEffect, useState } from 'react';
import type { ActionCategory, ActionDefinition, ActionLogEntry } from '@carbon-saathi/core';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import * as api from '../../lib/api-client';
import { useGamification, useProfile } from '../../lib/contexts';
import { ActionCard } from './components/ActionCard';

const CATEGORY_ORDER: ReadonlyArray<{ id: ActionCategory; label: string }> = [
  { id: 'transport', label: '🚌 Transport' },
  { id: 'energy', label: '⚡ Energy' },
  { id: 'food', label: '🥗 Food' },
  { id: 'lifestyle', label: '🧺 Lifestyle' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Onboard-or-seed prompt shown until a profile exists (logging needs one). */
function NoProfileNotice(): React.JSX.Element {
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const seedDemo = async (): Promise<void> => {
    setSeeding(true);
    // The debug bridge applies the profile to context itself (EmptyState pattern).
    const user = await window.__saathi?.seedDemoUser();
    setSeeding(false);
    if (user === null || user === undefined) {
      showToast('Could not create the demo profile. Is the API running?', 'error');
    } else {
      showToast('Demo profile ready — log away!', 'success');
    }
  };

  return (
    <GlassCard as="section" aria-labelledby="actions-noprofile-heading">
      <h2 id="actions-noprofile-heading" className="m-0 font-display text-lg font-bold">
        You need a profile to log actions
      </h2>
      <p className="m-0 mt-2 text-sm text-ink-muted">
        Browse the catalog freely — but to bank points, take the two-minute survey or jump in
        with a demo profile.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button href="/onboarding" size="sm">
          Start the two-minute survey
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void seedDemo()} disabled={seeding}>
          {seeding ? 'Setting up…' : 'Try a demo profile'}
        </Button>
      </div>
    </GlassCard>
  );
}

export default function ActionsPage(): React.JSX.Element {
  const { ready, userId } = useProfile();
  const { gamification } = useGamification();
  const [catalog, setCatalog] = useState<ActionDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayLog, setTodayLog] = useState<ActionLogEntry[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void api.getActionCatalog().then((result) => {
      if (cancelled) return;
      if (result.ok) setCatalog([...result.data.actions]);
      else setError(result.error.message);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
  const labelFor = (actionId: string): string =>
    catalog?.find((action) => action.id === actionId)?.label ?? actionId;

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
          Every action saves real CO₂ and earns 10 points per kilogram. Daily caps keep the
          board honest.
        </p>
      </div>

      {ready && userId === null && <NoProfileNotice />}

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="actions-catalog-heading">
          <h2 id="actions-catalog-heading" className="sr-only">
            Action catalog
          </h2>
          {error !== null ? (
            <GlassCard className="py-10 text-center">
              <p className="m-0 text-ink-muted">{error}</p>
              <Button className="mt-4" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </Button>
            </GlassCard>
          ) : catalog === null ? (
            <div role="status" aria-label="Loading the action catalog">
              <span className="sr-only">Loading the action catalog…</span>
              <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="glass-card h-48 animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <Tabs items={tabs} label="Action categories" />
          )}
        </section>

        <GlassCard as="aside" aria-labelledby="actions-today-heading">
          <h2 id="actions-today-heading" className="m-0 font-display text-lg font-bold">
            Today
          </h2>
          {entries.length === 0 ? (
            <p className="m-0 mt-2 text-sm text-ink-muted">
              Nothing logged yet today — pick an action to get started.
            </p>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {entries.map((entry, index) => (
                <li
                  key={`${entry.loggedAtISO}-${entry.actionId}-${index}`}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span>
                    {labelFor(entry.actionId)}
                    {entry.quantity > 1 ? ` ×${entry.quantity}` : ''}
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">+{entry.points} pts</span>
                </li>
              ))}
            </ul>
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
        </GlassCard>
      </div>
    </div>
  );
}
