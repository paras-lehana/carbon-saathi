/**
 * StreakFlame: current streak length plus earned shields. Display-only —
 * streak/shield rules (earn each 7 days, max 3) live in core's updateStreak.
 */
import type { StreakState } from '@carbon-saathi/core';

export interface StreakFlameProps {
  streak: StreakState;
  className?: string;
}

const MAX_SHIELDS = 3; // mirrors core's cap so empty slots render consistently

export function StreakFlame({ streak, className }: StreakFlameProps): React.JSX.Element {
  const dayWord = streak.current === 1 ? 'day' : 'days';
  return (
    <div className={['flex items-center gap-3', className].filter(Boolean).join(' ')}>
      <span aria-hidden="true" className="text-3xl">
        🔥
      </span>
      <div>
        <p className="m-0 font-display text-lg font-bold">
          {streak.current} {dayWord}
          <span className="sr-only"> current streak</span>
        </p>
        <p className="m-0 text-xs text-ink-muted">
          {/* sr-only text (not aria-label — naming is prohibited on <p>). */}
          <span className="sr-only">
            {streak.shields} of {MAX_SHIELDS} streak shields, longest streak {streak.longest} days
          </span>
          {/* Filled vs empty shield slots — shields absorb one missed day each. */}
          <span aria-hidden="true">
            {'🛡️'.repeat(streak.shields)}
            {'▫️'.repeat(Math.max(0, MAX_SHIELDS - streak.shields))}
            {' · longest '}
            {streak.longest}
          </span>
        </p>
      </div>
    </div>
  );
}
