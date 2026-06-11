/**
 * Displays the full badge catalog. Earned badges are highlighted; locked
 * badges show a hint tooltip so users know what to aim for.
 */
'use client';

import { BADGE_CATALOG } from '@carbon-saathi/core';

interface BadgeWallProps {
  earnedIds: string[];
}

export function BadgeWall({ earnedIds }: BadgeWallProps): React.JSX.Element {
  const earnedSet = new Set(earnedIds);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-base font-bold">Badges</h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {BADGE_CATALOG.map((badge) => {
          const earned = earnedSet.has(badge.id);
          return (
            <div
              key={badge.id}
              title={earned ? `${badge.name}: ${badge.description}` : `Locked — ${badge.hint}`}
              className={[
                'group relative flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-all',
                earned
                  ? 'bg-primary-soft ring-1 ring-primary/30'
                  : 'bg-surface-alt opacity-40 grayscale',
              ].join(' ')}
              aria-label={earned ? `${badge.name} (earned)` : `${badge.name} (locked: ${badge.hint})`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {badge.icon}
              </span>
              <span className="block text-[10px] font-semibold leading-tight text-ink">
                {badge.name}
              </span>
              {/* Tooltip on hover */}
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-9 left-1/2 z-10 w-36 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {earned ? badge.description : badge.hint}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
