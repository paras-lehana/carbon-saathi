/**
 * Initiatives Hub: the Mission LiFE-mapped catalog as a filterable card grid.
 * Pure presentation over core's INITIATIVE_CATALOG — filtering is the only
 * client state (hence 'use client'); all content and numbers live in core
 * with their sources. Filter pills use aria-pressed (filters over one grid,
 * not tabs over panels) and changes are announced via a polite live region.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  initiativesByCategory,
  ALL_INITIATIVE_CATEGORIES,
  INITIATIVE_CATALOG,
  LIFE_THEMES,
  type InitiativeCategory,
} from '@carbon-saathi/core';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { formatInrCompact, formatKgCompact } from '../../lib/format';

// The catalog is static, so per-category counts never change — build once.
const CATEGORY_COUNTS: ReadonlyMap<InitiativeCategory, number> = new Map(
  ALL_INITIATIVE_CATEGORIES.map((category) => [category, initiativesByCategory(category).length]),
);

function pillClasses(active: boolean): string {
  return [
    'rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors',
    active ? 'bg-primary text-white' : 'bg-surface-alt text-ink hover:bg-primary-soft',
  ].join(' ');
}

export default function InitiativesPage(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<InitiativeCategory | 'all'>('all');

  const initiatives = useMemo(
    () =>
      activeCategory === 'all' ? [...INITIATIVE_CATALOG] : initiativesByCategory(activeCategory),
    [activeCategory],
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mission LiFE</p>
        <h1 className="mt-1 font-display text-[length:var(--text-2xl)] font-bold">
          India&apos;s Climate Action Hub
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Every initiative below maps to a <strong>Mission LiFE theme</strong> — the Government of
          India&apos;s framework for individual climate action (missionlife-moefcc.nic.in). Crores
          of Indians have already pledged. Pick yours, then log the actions for points.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://merilife.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-pill bg-primary px-3 py-1 text-xs font-semibold text-white no-underline hover:opacity-90"
          >
            🌿 Take the LiFE pledge at merilife.gov.in
            <span aria-hidden="true">→</span>
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </div>
      </div>

      {/* Filter pills — aria-pressed toggles over a single grid. */}
      <nav aria-label="Initiative categories" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={pillClasses(activeCategory === 'all')}
          aria-pressed={activeCategory === 'all'}
        >
          All ({INITIATIVE_CATALOG.length})
        </button>
        {ALL_INITIATIVE_CATEGORIES.map((category) => {
          const theme = LIFE_THEMES[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={pillClasses(activeCategory === category)}
              aria-pressed={activeCategory === category}
            >
              {theme.emoji} {theme.title} ({CATEGORY_COUNTS.get(category)})
            </button>
          );
        })}
      </nav>
      {/* Grid swaps are silent for screen readers without this announcement. */}
      <p aria-live="polite" className="sr-only">
        Showing {initiatives.length} initiatives
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initiatives.map((initiative) => {
          const theme = LIFE_THEMES[initiative.category];
          const co2 =
            initiative.co2AvoidedKgAnnual !== undefined
              ? formatKgCompact(initiative.co2AvoidedKgAnnual)
              : null;
          const rupees =
            initiative.rupeesSavedAnnual !== undefined
              ? formatInrCompact(initiative.rupeesSavedAnnual)
              : null;
          return (
            <GlassCard key={initiative.id} as="article" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {theme.emoji} {theme.lifeTheme}
                </span>
                {initiative.scheme !== undefined && (
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold">
                    {initiative.scheme.split(' (')[0]}
                  </span>
                )}
              </div>

              <h2 className="m-0 font-display text-base font-bold leading-snug">
                {initiative.title}
              </h2>
              <p className="m-0 text-xs text-ink-muted">{initiative.subtitle}</p>

              {(co2 !== null || rupees !== null) && (
                <div className="flex flex-wrap items-end gap-3">
                  {co2 !== null && (
                    <div className="flex flex-col">
                      <span className="font-display text-lg font-bold text-primary">{co2}</span>
                      <span className="text-xs text-ink-muted">
                        CO₂ avoided/yr
                        {initiative.scale === 'community' ? ' (community-scale)' : ''}
                      </span>
                    </div>
                  )}
                  {rupees !== null && (
                    <div className="flex flex-col">
                      {/* Ink, not amber: --accent is ~2:1 on surface — decorative only. */}
                      <span className="font-display text-lg font-bold text-ink">{rupees}</span>
                      <span className="text-xs text-ink-muted">
                        saved/yr{initiative.scale === 'community' ? ' (community-scale)' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="m-0 flex-1 text-xs text-ink">{initiative.benefit}</p>

              {/* Native disclosure — keyboard and SR support for free. */}
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-primary">
                  How to start
                </summary>
                <p className="mt-2 text-ink-muted">{initiative.howToStart}</p>
              </details>

              {initiative.portalUrl !== undefined && (
                <a
                  href={initiative.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Official portal <span aria-hidden="true">↗</span>
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              )}
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="m-0 font-display text-xl font-bold">Ready to act?</h2>
        <p className="m-0 max-w-md text-ink-muted">
          Log your actions on the actions page to earn points, maintain streaks, and climb the
          leaderboard.
        </p>
        <div className="flex gap-3">
          <Button href="/actions" size="sm">
            Log actions
          </Button>
          <Button href="/onboarding" variant="ghost" size="sm">
            Get my baseline first
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
