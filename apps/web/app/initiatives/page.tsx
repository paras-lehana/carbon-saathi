/**
 * Initiatives Hub: Mission LiFE's 7 official action themes displayed as a
 * category nav + card grid. Every card shows benefit, CO2 avoided, rupees
 * saved and a how-to-start step. Sourced claims from docs/research-claims.txt.
 */
'use client';

import { useState } from 'react';
import {
  allCategories,
  initiativesByCategory,
  INITIATIVE_CATALOG,
  LIFE_THEMES,
  type InitiativeCategory,
} from '@carbon-saathi/core';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';

function formatKg(kg?: number): string | null {
  if (kg === undefined) return null;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}

function formatRupees(r?: number): string | null {
  if (r === undefined) return null;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(0)}k`;
  return `₹${r}`;
}

export default function InitiativesPage(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<InitiativeCategory | 'all'>('all');

  const categories = allCategories();
  const initiatives =
    activeCategory === 'all' ? INITIATIVE_CATALOG : initiativesByCategory(activeCategory);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Mission LiFE — 7 themes
        </p>
        <h1 className="mt-1 font-display text-[length:var(--text-2xl)] font-bold">
          India&apos;s Climate Action Hub
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Every initiative below maps to one of <strong>Mission LiFE&apos;s 7 official themes</strong> —
          the Government of India&apos;s framework for individual climate action. 7.3 crore Indians
          have already pledged. Add your actions and earn points.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://merilife.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-pill bg-primary text-white px-3 py-1 text-xs font-semibold hover:opacity-90"
          >
            🌿 Take the LiFE pledge at merilife.gov.in →
          </a>
        </div>
      </div>

      {/* Category tabs */}
      <nav aria-label="Initiative categories" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={[
            'rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors',
            activeCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface-alt text-ink hover:bg-primary-soft',
          ].join(' ')}
          aria-pressed={activeCategory === 'all'}
        >
          All ({INITIATIVE_CATALOG.length})
        </button>
        {categories.map((cat) => {
          const theme = LIFE_THEMES[cat];
          const count = initiativesByCategory(cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={[
                'rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors',
                activeCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-surface-alt text-ink hover:bg-primary-soft',
              ].join(' ')}
              aria-pressed={activeCategory === cat}
            >
              {theme.emoji} {theme.title} ({count})
            </button>
          );
        })}
      </nav>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initiatives.map((initiative) => {
          const theme = LIFE_THEMES[initiative.category];
          const co2Str = formatKg(initiative.co2AvoidedKgAnnual);
          const rupeeStr = formatRupees(initiative.rupeesSavedAnnual);
          return (
            <GlassCard key={initiative.id} as="article" className="flex flex-col gap-3">
              {/* Category tag */}
              <div className="flex items-center gap-2">
                <span
                  className="rounded-pill bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {theme.emoji} {theme.lifeTheme}
                </span>
                {initiative.scheme !== undefined && (
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {initiative.scheme.split(' ')[0]}
                  </span>
                )}
              </div>

              <h2 className="m-0 font-display text-base font-bold leading-snug">
                {initiative.title}
              </h2>
              <p className="m-0 text-xs text-ink-muted">{initiative.subtitle}</p>

              {/* Benefit metrics */}
              {(co2Str !== null || rupeeStr !== null) && (
                <div className="flex flex-wrap gap-3">
                  {co2Str !== null && (
                    <div className="flex flex-col">
                      <span className="font-display text-lg font-bold text-primary">{co2Str}</span>
                      <span className="text-[10px] text-ink-muted">CO₂ avoided/yr</span>
                    </div>
                  )}
                  {rupeeStr !== null && (
                    <div className="flex flex-col">
                      <span className="font-display text-lg font-bold text-accent">{rupeeStr}</span>
                      <span className="text-[10px] text-ink-muted">saved/yr</span>
                    </div>
                  )}
                </div>
              )}

              {/* Benefit blurb */}
              <p className="m-0 flex-1 text-xs text-ink">{initiative.benefit}</p>

              {/* How to start */}
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-primary">
                  How to start →
                </summary>
                <p className="mt-2 text-ink-muted">{initiative.howToStart}</p>
              </details>

              {/* Portal link */}
              {initiative.portalUrl !== undefined && (
                <a
                  href={initiative.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                  aria-label={`Official portal for ${initiative.title} (opens in new tab)`}
                >
                  Official portal ↗
                </a>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Footer CTA */}
      <GlassCard className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="m-0 font-display text-xl font-bold">
          Ready to act?
        </h2>
        <p className="m-0 max-w-md text-ink-muted">
          Log your actions on the actions page to earn points, maintain streaks,
          and climb the leaderboard.
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
