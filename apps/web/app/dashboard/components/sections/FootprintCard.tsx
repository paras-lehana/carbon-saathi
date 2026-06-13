/**
 * Footprint section of the dashboard bento: the category donut with a
 * "Retake quiz" action, or the onboarding nudge when no baseline exists yet.
 * Pure presentation — the grid owns the quiz modal this card's action opens.
 */
import type { BaselineFootprintResult } from '@carbon-saathi/core';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';

export interface FootprintCardProps {
  baseline: BaselineFootprintResult | null;
  onRetakeQuiz: () => void;
}

export function FootprintCard({ baseline, onRetakeQuiz }: FootprintCardProps): React.JSX.Element {
  if (baseline === null) {
    return (
      <SectionCard
        id="dash-nobaseline-heading"
        title="No baseline yet"
        className="bento-wide"
        // The nudge paragraph below owns the spacing (mt-2), not the heading.
        headingClassName="m-0 font-display text-lg font-bold"
      >
        <p className="mt-2 text-sm text-ink-muted">
          Take the two-minute survey to see your annual footprint split by category.
        </p>
        <Button href="/onboarding" size="sm" className="mt-3">
          Start the survey
        </Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="dash-footprint-heading"
      title="Where your footprint comes from"
      className="bento-wide"
      action={
        <Button size="sm" variant="ghost" onClick={onRetakeQuiz}>
          Retake quiz
        </Button>
      }
    >
      <CategoryDonut byCategory={baseline.byCategory} totalKgAnnual={baseline.totalKgAnnual} />
    </SectionCard>
  );
}
