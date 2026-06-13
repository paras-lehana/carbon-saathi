/**
 * Post-submit reveal: the user's baseline footprint with an animated total,
 * category donut and benchmark bars, ending in the dashboard CTA. Entrances
 * use framer-motion, fully gated by useReducedMotion.
 */
'use client';

import { motion } from 'framer-motion';
import { useFadeUp } from '@/lib/motion';
import type { BaselineFootprintResult, FootprintCategory } from '@carbon-saathi/core';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { ComparisonBars } from '@/components/charts/ComparisonBars';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';
import { TipsList } from '@/components/ui/TipsList';
import { formatKgCo2 } from '@/lib/format';

const CATEGORY_LABELS: Record<FootprintCategory, string> = {
  homeEnergy: 'Home energy',
  transport: 'Transport',
  food: 'Food',
  shopping: 'Shopping',
};

// The chart cards breathe with mb-4 under their headings, one step looser
// than SectionCard's default mb-3.
const CHART_HEADING_CLASS = 'm-0 mb-4 font-display text-lg font-bold';

export interface ResultRevealProps {
  baseline: BaselineFootprintResult;
}

export function ResultReveal({ baseline }: ResultRevealProps): React.JSX.Element {
  const fadeUp = useFadeUp();

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
        <SectionCard
          id="result-donut-heading"
          title="Where it comes from"
          headingClassName={CHART_HEADING_CLASS}
        >
          <CategoryDonut byCategory={baseline.byCategory} totalKgAnnual={baseline.totalKgAnnual} />
        </SectionCard>
        <SectionCard
          id="result-compare-heading"
          title="How you compare"
          headingClassName={CHART_HEADING_CLASS}
        >
          <ComparisonBars yourKg={baseline.totalKgAnnual} />
        </SectionCard>
      </div>

      {baseline.generatedTips.length > 0 && (
        <SectionCard id="result-tips-heading" title="🍃 Your first three moves">
          <TipsList tips={baseline.generatedTips} />
        </SectionCard>
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
