/**
 * Badge wall: the full catalog as a semantic list, earned tiles highlighted,
 * locked tiles dimmed (emoji only — the name keeps full contrast) with the
 * unlock hint exposed both visually on focus/hover and via aria-describedby.
 * Pure presentation — earning happens server-side.
 */
'use client';

import { useId } from 'react';
import { BADGE_CATALOG } from '@carbon-saathi/core';

interface BadgeWallProps {
  earnedIds: string[];
}

export function BadgeWall({ earnedIds }: BadgeWallProps): React.JSX.Element {
  const earnedSet = new Set(earnedIds);
  const baseId = useId();

  return (
    <div className="flex flex-col gap-3">
      <h2 id="badge-wall-heading" className="m-0 font-display text-lg font-bold">
        Badges
      </h2>
      <ul
        role="list"
        aria-labelledby="badge-wall-heading"
        className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-8"
      >
        {BADGE_CATALOG.map((badge) => {
          const earned = earnedSet.has(badge.id);
          const tooltipId = `${baseId}-${badge.id}`;
          return (
            <li key={badge.id}>
              {/* Focusable tile: keyboard users reach the hint via the
                  described-by tooltip, which shows on hover AND focus. */}
              <button
                type="button"
                aria-describedby={tooltipId}
                aria-label={`${badge.name}${earned ? ' (earned)' : ' (locked)'}`}
                // WCAG 1.4.13 dismissable: Escape hides the hint by dropping
                // focus. Hoverable holds because the tooltip renders inside
                // the trigger's bounds — pointing at it keeps group-hover on.
                onKeyDown={(event) => {
                  if (event.key === 'Escape') event.currentTarget.blur();
                }}
                className={[
                  'group relative flex w-full flex-col items-center gap-1 rounded-control p-2 text-center transition-all focus-visible:outline-primary',
                  earned ? 'bg-primary-soft ring-1 ring-primary/30' : 'bg-surface-alt',
                ].join(' ')}
              >
                {/* Locked state dims only the emoji — the name stays at full
                    contrast (WCAG 1.4.3) with a lock glyph as the non-color cue. */}
                <span
                  className={`text-2xl leading-none ${earned ? '' : 'opacity-40 grayscale'}`}
                  aria-hidden="true"
                >
                  {badge.icon}
                </span>
                <span className="block text-xs font-semibold leading-tight text-ink">
                  {!earned && (
                    <span aria-hidden="true" className="mr-0.5">
                      🔒
                    </span>
                  )}
                  {badge.name}
                </span>
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 left-1/2 z-10 w-36 -translate-x-1/2 rounded-control border border-line bg-surface px-2 py-1 text-center text-xs text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {earned ? badge.description : badge.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
