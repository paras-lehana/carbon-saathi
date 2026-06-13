/**
 * Badges section of the dashboard bento. BadgeWall carries its own h2
 * (badge-wall-heading), so this wraps a labelled GlassCard around it instead
 * of SectionCard — SectionCard would render a second, competing heading.
 */
import { BadgeWall } from '@/components/gamification/BadgeWall';
import { GlassCard } from '@/components/ui/GlassCard';

// Module-scope so the ?? fallback keeps a stable identity across renders.
const EMPTY_BADGES: string[] = [];

export interface BadgesCardProps {
  /** Earned badge ids — restored snapshots may predate the field. */
  earnedIds: string[] | undefined;
}

export function BadgesCard({ earnedIds }: BadgesCardProps): React.JSX.Element {
  return (
    <GlassCard as="section" className="bento-wide" aria-labelledby="badge-wall-heading">
      <BadgeWall earnedIds={earnedIds ?? EMPTY_BADGES} />
    </GlassCard>
  );
}
