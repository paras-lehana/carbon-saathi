/**
 * Dashboard bento grid: footprint donut, benchmark stats, points/level ring,
 * streak, missions, quick-log, activity feed, impact analogies, leaderboard
 * mini and tips. Pure composition over the fetched payload — the page owns
 * fetching; quick-log goes through the gamification context for retry logic.
 */
'use client';

import { useState } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import type { ActionDefinition, BaselineFootprintResult } from '@carbon-saathi/core';
import { CategoryDonut } from '../../../components/charts/CategoryDonut';
import { LevelBadge } from '../../../components/gamification/LevelBadge';
import { MissionCard } from '../../../components/gamification/MissionCard';
import { StreakFlame } from '../../../components/gamification/StreakFlame';
import { Button } from '../../../components/ui/Button';
import { CountUp } from '../../../components/ui/CountUp';
import { GlassCard } from '../../../components/ui/GlassCard';
import { ProgressRing } from '../../../components/ui/ProgressRing';
import { StatCard } from '../../../components/ui/StatCard';
import { useToast } from '../../../components/ui/Toast';
import type { DashboardResponse, LeaderboardResponse } from '../../../lib/api-client';
import { useGamification } from '../../../lib/contexts';
import { formatKgCo2, formatNumber } from '../../../lib/format';
import { levelIconForName, levelProgressForPoints } from '../../../lib/levels';

const QUICK_ACTION_COUNT = 4;
const MINI_BOARD_SIZE = 3;

// Built once per module — Intl construction is expensive (lib/format pattern).
const DAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export interface DashboardGridProps {
  dashboard: DashboardResponse;
  baseline: BaselineFootprintResult | null;
  actions: ActionDefinition[];
  leaderboard: LeaderboardResponse | null;
  onRefresh: () => Promise<void>;
}

export function DashboardGrid({
  dashboard,
  baseline,
  actions,
  leaderboard,
  onRefresh,
}: DashboardGridProps): React.JSX.Element {
  const { logAction } = useGamification();
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const fadeUp: MotionProps =
    reduceMotion === true
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const { gamification, missions, recentActions, analogies } = dashboard;
  const level = levelProgressForPoints(gamification.points);
  // "Top" actions = biggest CO2 savings per log — the shortest path to points.
  const quickActions = [...actions]
    .sort((a, b) => b.co2SavedKg - a.co2SavedKg)
    .slice(0, QUICK_ACTION_COUNT);
  const labelFor = (actionId: string): string =>
    actions.find((action) => action.id === actionId)?.label ?? actionId;

  const quickLog = async (action: ActionDefinition): Promise<void> => {
    setLoggingId(action.id);
    const result = await logAction(action.id, 1);
    if (!result.ok) {
      setLoggingId(null);
      showToast(result.error.message, 'error');
      return;
    }
    showToast(
      `+${result.data.impact.co2SavedKg} kg CO₂ saved · +${result.data.impact.points} points`,
      'success',
    );
    await onRefresh(); // points/streak/missions all moved — repaint from the server
    setLoggingId(null);
  };

  return (
    <motion.div {...fadeUp} className="bento-grid">
      {/* ── Footprint by category ── */}
      {baseline !== null ? (
        <GlassCard as="section" className="bento-wide" aria-labelledby="dash-footprint-heading">
          <h2 id="dash-footprint-heading" className="m-0 mb-4 font-display text-lg font-bold">
            Where your footprint comes from
          </h2>
          <CategoryDonut byCategory={baseline.byCategory} totalKgAnnual={baseline.totalKgAnnual} />
        </GlassCard>
      ) : (
        <GlassCard as="section" className="bento-wide" aria-labelledby="dash-nobaseline-heading">
          <h2 id="dash-nobaseline-heading" className="m-0 font-display text-lg font-bold">
            No baseline yet
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Take the two-minute survey to see your annual footprint split by category.
          </p>
          <Button href="/onboarding" size="sm" className="mt-3">
            Start the survey
          </Button>
        </GlassCard>
      )}

      {baseline !== null && (
        <StatCard
          label="your annual footprint"
          value={<CountUp value={baseline.totalKgAnnual} format={formatKgCo2} />}
          sublabel="per person, estimated"
          icon="🌍"
        />
      )}
      {baseline !== null && (
        <StatCard
          label="of the Indian average"
          value={`${baseline.vsIndiaAverage.toFixed(1)}×`}
          sublabel="India ≈ 2 t CO₂e per person each year"
          icon="🇮🇳"
        />
      )}

      {/* ── Points & level ── */}
      <GlassCard as="section" aria-labelledby="dash-points-heading">
        <h2 id="dash-points-heading" className="m-0 mb-3 font-display text-lg font-bold">
          Points &amp; level
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <ProgressRing pct={level.progressPct} label={`Progress to ${level.nextLevelAt === null ? 'the top level' : 'the next level'}`}>
            <span className="text-center">
              <span data-testid="dashboard-points" className="block font-display text-lg font-bold">
                {formatNumber(gamification.points)}
              </span>
              <span className="block text-xs text-ink-muted">pts</span>
            </span>
          </ProgressRing>
          <LevelBadge level={level} />
        </div>
        {/* The ring centre is decorative (aria-hidden) — say the number here. */}
        <p className="sr-only">{gamification.points} points total.</p>
      </GlassCard>

      {/* ── Streak ── */}
      <GlassCard as="section" aria-labelledby="dash-streak-heading">
        <h2 id="dash-streak-heading" className="m-0 mb-3 font-display text-lg font-bold">
          Streak
        </h2>
        <StreakFlame streak={gamification.streak} />
        <p className="m-0 mt-3 text-xs text-ink-muted">
          Log any action today to keep it alive — every 7-day run earns a shield.
        </p>
      </GlassCard>

      {/* ── Weekly missions ── */}
      <GlassCard as="section" className="bento-tall" aria-labelledby="dash-missions-heading">
        <h2 id="dash-missions-heading" className="m-0 mb-3 font-display text-lg font-bold">
          Weekly missions
        </h2>
        <div className="flex flex-col gap-3">
          {missions.map((mission) => (
            <MissionCard key={mission.missionId} mission={mission} />
          ))}
        </div>
      </GlassCard>

      {/* ── Quick log ── */}
      {quickActions.length > 0 && (
        <GlassCard as="section" className="bento-wide" aria-labelledby="dash-quicklog-heading">
          <h2 id="dash-quicklog-heading" className="m-0 mb-1 font-display text-lg font-bold">
            Quick log
          </h2>
          <p className="m-0 mb-3 text-xs text-ink-muted">
            One tap logs one unit of your highest-impact actions.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                data-testid={`action-log-${action.id}`}
                variant="ghost"
                size="sm"
                disabled={loggingId !== null}
                onClick={() => void quickLog(action)}
              >
                {/* flex-1 pushes the impact tag right inside Button's centered flex row */}
                <span className="flex-1 text-left">
                  {loggingId === action.id ? 'Logging…' : action.label}
                </span>
                <span className="text-xs text-ink-muted">+{action.co2SavedKg} kg</span>
              </Button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Recent activity ── */}
      <GlassCard as="section" className="bento-tall" aria-labelledby="dash-activity-heading">
        <h2 id="dash-activity-heading" className="m-0 mb-3 font-display text-lg font-bold">
          Recent activity
        </h2>
        {recentActions.length === 0 ? (
          <p className="m-0 text-sm text-ink-muted">
            Nothing logged yet — your first quick log will show up here.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {recentActions.map((entry, index) => (
              <li
                key={`${entry.loggedAtISO}-${entry.actionId}-${index}`}
                className="flex items-baseline justify-between gap-2 text-sm"
              >
                <span>
                  {labelFor(entry.actionId)}
                  {entry.quantity > 1 ? ` ×${entry.quantity}` : ''}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {DAY_FORMATTER.format(new Date(entry.loggedAtISO))} · +{entry.points} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {/* ── Impact analogies ── */}
      <GlassCard as="section" aria-labelledby="dash-impact-heading">
        <h2 id="dash-impact-heading" className="m-0 mb-3 font-display text-lg font-bold">
          Your impact so far
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden="true">🌳</span>
            <CountUp
              value={analogies.treesEquivalent}
              format={(n) => n.toFixed(1)}
              className="font-display font-bold"
            />
            <span>trees&rsquo; CO₂ absorption for a year</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">🚗</span>
            <CountUp value={analogies.kmNotDriven} className="font-display font-bold" />
            <span>km of petrol driving avoided</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">🔋</span>
            <CountUp value={analogies.phoneCharges} className="font-display font-bold" />
            <span>phone charges of electricity</span>
          </li>
        </ul>
      </GlassCard>

      {/* ── Leaderboard mini ── */}
      {leaderboard !== null && leaderboard.entries.length > 0 && (
        <GlassCard as="section" aria-labelledby="dash-board-heading">
          <h2 id="dash-board-heading" className="m-0 mb-3 font-display text-lg font-bold">
            Leaderboard top 3
          </h2>
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {leaderboard.entries.slice(0, MINI_BOARD_SIZE).map((entry) => (
              <li key={entry.rank} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-display font-bold">#{entry.rank}</span> {entry.name}
                  <span aria-hidden="true"> {levelIconForName(entry.level)}</span>
                </span>
                <span className="text-ink-muted">{formatNumber(entry.points)} pts</span>
              </li>
            ))}
          </ol>
          {leaderboard.userRank !== null && (
            <p className="m-0 mt-3 text-xs text-ink-muted">You are ranked #{leaderboard.userRank}.</p>
          )}
          <Button href="/leaderboard" variant="ghost" size="sm" className="mt-3">
            Full leaderboard
          </Button>
        </GlassCard>
      )}

      {/* ── Tips from the baseline ── */}
      {baseline !== null && baseline.generatedTips.length > 0 && (
        <GlassCard as="section" className="bento-wide" aria-labelledby="dash-tips-heading">
          <h2 id="dash-tips-heading" className="m-0 mb-3 font-display text-lg font-bold">
            💡 Saathi tips for you
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {baseline.generatedTips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm">
                <span aria-hidden="true" className="mt-0.5 text-primary">
                  ✓
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </motion.div>
  );
}
