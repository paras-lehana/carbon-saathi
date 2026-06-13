/**
 * Verdict card for the EV-coach wizard: headline recommendation with a
 * confidence badge, animated CO₂/rupee savings and the incentive note.
 * Entrance uses framer-motion, gated by useReducedMotion via useFadeUp.
 */
'use client';

import { motion } from 'framer-motion';
import { useFadeUp } from '@/lib/motion';
import type { EvFitResult, EvRecommendation } from '@carbon-saathi/core';
import { CountUp } from '@/components/ui/CountUp';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { formatInr, formatKgCo2 } from '@/lib/format';

const RECOMMENDATION_META: Record<EvRecommendation, { title: string; icon: string }> = {
  'public-transport-first': { title: 'Public transport first', icon: '🚇' },
  'ev-two-wheeler': { title: 'An electric two-wheeler fits you', icon: '🛵' },
  'ev-car': { title: 'An electric car fits you', icon: '🚗' },
  hybrid: { title: 'A strong hybrid fits you best (for now)', icon: '🔁' },
  'ev-car-with-planning': { title: 'An electric car works — with charging planning', icon: '🗺️' },
};

export interface RecommendationCardProps {
  result: EvFitResult;
}

export function RecommendationCard({ result }: RecommendationCardProps): React.JSX.Element {
  const fadeUp = useFadeUp();
  const meta = RECOMMENDATION_META[result.recommendation];

  return (
    <motion.section {...fadeUp} aria-labelledby="ev-result-heading">
      <GlassCard as="div">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ev-result-heading" className="m-0 font-display text-lg font-bold">
            <span aria-hidden="true">{meta.icon} </span>
            {meta.title}
          </h2>
          <span className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            {result.confidence === 'high' ? 'High confidence' : 'Medium confidence'}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="CO₂ saved per year"
            value={<CountUp value={result.annualCo2SavedKg} format={formatKgCo2} />}
            sublabel="vs what you use today"
            icon="🌍"
          />
          <StatCard
            label="fuel money saved per year"
            value={<CountUp value={result.annualFuelSavingInr} format={formatInr} />}
            sublabel="running costs only, estimated"
            icon="💰"
          />
        </div>
        <p className="m-0 mt-4 text-sm text-ink-muted">{result.fameNote}</p>
      </GlassCard>
    </motion.section>
  );
}
