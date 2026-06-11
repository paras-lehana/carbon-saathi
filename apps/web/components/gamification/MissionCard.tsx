/**
 * MissionCard: one weekly mission with an accessible progress bar. Display
 * only — progress math comes from core's evaluateMissions.
 */
import type { MissionProgress } from '@carbon-saathi/core';

export interface MissionCardProps {
  mission: MissionProgress;
  className?: string;
}

export function MissionCard({ mission, className }: MissionCardProps): React.JSX.Element {
  return (
    <div className={['glass-card p-4', className].filter(Boolean).join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-sm font-semibold">{mission.title}</p>
        {mission.completed && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
            Done ✓
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={mission.target}
        aria-valuenow={mission.progress}
        aria-label={`${mission.title}: ${mission.progress} of ${mission.target}`}
        className="mt-2 h-2 overflow-hidden rounded-pill bg-primary-soft"
      >
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-500"
          style={{ width: `${mission.progressPct}%` }}
        />
      </div>
      <p className="m-0 mt-1 text-xs text-ink-muted" aria-hidden="true">
        {mission.progress} / {mission.target}
      </p>
    </div>
  );
}
