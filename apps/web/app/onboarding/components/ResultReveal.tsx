/**
 * Post-submit reveal: the user's baseline footprint with an animated total,
 * category donut and benchmark bars, ending in the dashboard CTA. Entrances
 * use framer-motion, fully gated by useReducedMotion.
 */
'use client';

import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import type { BaselineFootprintResult, FootprintCategory } from '@carbon-saathi/core';
import { CategoryDonut } from '../../../components/charts/CategoryDonut';
import { ComparisonBars } from '../../../components/charts/ComparisonBars';
import { Button } from '../../../components/ui/Button';
import { CountUp } from '../../../components/ui/CountUp';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatCard } from '../../../components/ui/StatCard';
import { formatKgCo2 } from '../../../lib/format';

const CATEGORY_LABELS: Record<FootprintCategory, string> = {
  homeEnergy: 'Home energy',
  transport: 'Transport',
  food: 'Food',
  shopping: 'Shopping',
};

export interface ResultRevealProps {
  baseline: BaselineFootprintResult;
}

export function ResultReveal({ baseline }: ResultRevealProps): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const fadeUp: MotionProps =
    reduceMotion === true
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 },
        };

  return (
    <motion.div {...fadeUp} data-testid="onboarding-result" className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Your footprint is ready
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Here is your estimated annual carbon footprint — and how it compares with India.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Your annual footprint"
          value={<CountUp value={baseline.totalKgAnnual} format={formatKgCo2} />}
          sublabel="per person, estimated"
          icon="🌍"
        />
        <StatCard
          label="of the Indian average"
          value={`${baseline.vsIndiaAverage.toFixed(1)}×`}
          sublabel="India ≈ 2 t CO₂e per person each year"
          icon="🇮🇳"
        />
        <StatCard
          label="Biggest driver"
          value={CATEGORY_LABELS[baseline.topDriver]}
          sublabel="Start your cuts here"
          icon="🎯"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard as="section" aria-labelledby="result-donut-heading">
          <h2 id="result-donut-heading" className="m-0 mb-4 font-display text-lg font-bold">
            Where it comes from
          </h2>
          <CategoryDonut byCategory={baseline.byCategory} totalKgAnnual={baseline.totalKgAnnual} />
        </GlassCard>
        <GlassCard as="section" aria-labelledby="result-compare-heading">
          <h2 id="result-compare-heading" className="m-0 mb-4 font-display text-lg font-bold">
            How you compare
          </h2>
          <ComparisonBars yourKg={baseline.totalKgAnnual} />
        </GlassCard>
      </div>

      {baseline.generatedTips.length > 0 && (
        <GlassCard as="section" aria-labelledby="result-tips-heading">
          <h2 id="result-tips-heading" className="m-0 mb-3 font-display text-lg font-bold">
            🍃 Your first three moves
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

      <div className="flex flex-wrap gap-3">
        <Button href="/dashboard" size="lg">
          Go to my dashboard
        </Button>
        <Button href="/actions" variant="ghost" size="lg">
          Start logging actions
        </Button>
      </div>
    </motion.div>
  );
}
