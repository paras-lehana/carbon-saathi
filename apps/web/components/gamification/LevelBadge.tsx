/**
 * LevelBadge: renders a core LevelProgress (icon, name, optional progress to
 * the next level). Display-only — level math lives in @carbon-saathi/core.
 */
import type { LevelProgress } from '@carbon-saathi/core';
import { formatNumber } from '@/lib/format';

export interface LevelBadgeProps {
  level: LevelProgress;
  /** Hide the "next level" line for compact placements (e.g. header). */
  compact?: boolean;
  className?: string;
}

export function LevelBadge({
  level,
  compact = false,
  className,
}: LevelBadgeProps): React.JSX.Element {
  return (
    <div className={['flex items-center gap-3', className].filter(Boolean).join(' ')}>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-2xl"
      >
        {level.icon}
      </span>
      <div>
        <p className="m-0 font-display font-bold">{level.name}</p>
        {!compact && (
          <p className="m-0 text-xs text-ink-muted">
            {level.nextLevelAt === null
              ? 'Top level reached'
              : `${level.progressPct}% to ${formatNumber(level.nextLevelAt)} pts`}
          </p>
        )}
      </div>
    </div>
  );
}
