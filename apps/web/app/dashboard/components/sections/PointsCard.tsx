/**
 * Points & level section of the dashboard bento: the progress ring with the
 * live points figure and the level badge. Level math comes from lib/levels
 * (core's ladder) so the ring and badge always agree.
 */
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SectionCard } from '@/components/ui/SectionCard';
import type { GamificationSummary } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import { levelProgressForPoints } from '@/lib/levels';

export interface PointsCardProps {
  gamification: GamificationSummary;
}

export function PointsCard({ gamification }: PointsCardProps): React.JSX.Element {
  const level = levelProgressForPoints(gamification.points);

  return (
    <SectionCard id="dash-points-heading" title="Points & level">
      <div className="flex flex-wrap items-center gap-4">
        <ProgressRing
          pct={level.progressPct}
          label={`Progress to ${level.nextLevelAt === null ? 'the top level' : 'the next level'}`}
        >
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
    </SectionCard>
  );
}
