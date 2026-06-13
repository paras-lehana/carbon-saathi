/**
 * Streak section of the dashboard bento: the flame meter plus the
 * keep-it-alive hint. Display only — streak math lives in core.
 */
import type { StreakState } from '@carbon-saathi/core';
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { SectionCard } from '@/components/ui/SectionCard';

export interface StreakCardProps {
  streak: StreakState;
}

export function StreakCard({ streak }: StreakCardProps): React.JSX.Element {
  return (
    <SectionCard id="dash-streak-heading" title="Streak">
      <StreakFlame streak={streak} />
      <p className="m-0 mt-3 text-xs text-ink-muted">
        Log any action today to keep it alive — every 7-day run earns a shield.
      </p>
    </SectionCard>
  );
}
