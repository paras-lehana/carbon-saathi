/**
 * Leaderboard route: your-rank summary, the ranked table with the requester's
 * row highlighted, and a demo circle join (a 6-character code that filters
 * the board client-side — real shared circles are on the roadmap).
 */
'use client';

import { useCallback, useState } from 'react';
import { pointsForCo2 } from '@carbon-saathi/core';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/CardSkeleton';
import { Field } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/GlassCard';
import { RetryCard } from '@/components/ui/RetryCard';
import * as api from '@/lib/api-client';
import type { LeaderboardEntry } from '@/lib/api-client';
import { useProfile } from '@/lib/contexts';
import { formatNumber } from '@/lib/format';
import { levelIconForName } from '@/lib/levels';
import { useApiQuery } from '@/lib/use-api-query';
import { INPUT_CLASS } from '@/components/ui/input-styles';

const CIRCLE_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/;

// Derived through the engine's own exported function, so this copy can never
// drift from core's points-per-kg contract.
const POINTS_PER_KG = pointsForCo2(1);

/**
 * Demo circle membership: the code deterministically selects which global
 * rows "belong" to the circle, and the requester's own row is always kept —
 * the same code always shows the same circle.
 */
function filterToCircle(entries: LeaderboardEntry[], code: string): LeaderboardEntry[] {
  const seed = [...code.toUpperCase()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return entries
    .filter((entry, index) => entry.isYou === true || (index + seed) % 3 !== 0)
    .map((entry, index) => ({ ...entry, rank: index + 1 })); // re-rank within the circle
}

export default function LeaderboardPage(): React.JSX.Element {
  const { ready, userId } = useProfile();
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [circle, setCircle] = useState<string | null>(null);

  const loadLeaderboard = useCallback(() => api.getLeaderboard(userId ?? undefined), [userId]);
  const { data, error, retry } = useApiQuery(loadLeaderboard, { enabled: ready });

  const joinCircle = (): void => {
    if (!CIRCLE_CODE_PATTERN.test(codeInput)) {
      setCodeError('Enter a 6-character code — letters and numbers only.');
      return;
    }
    setCodeError(undefined);
    setCircle(codeInput.toUpperCase());
  };

  const yourEntry = data?.entries.find((entry) => entry.isYou === true);
  const allEntries = data?.entries ?? [];
  const rows = circle === null ? allEntries : filterToCircle(allEntries, circle);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">Leaderboard</h1>
        <p className="mt-2 text-ink-muted">
          Points come from kilograms — {POINTS_PER_KG} points per kg of CO₂ saved. Daily caps keep
          it honest.
        </p>
      </div>

      {/* ── Your rank ── */}
      <GlassCard as="section" aria-labelledby="board-you-heading">
        <h2 id="board-you-heading" className="m-0 mb-2 font-display text-lg font-bold">
          Your standing
        </h2>
        {data !== null && data.userRank !== null && yourEntry !== undefined ? (
          <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[length:var(--text-xl)] font-bold text-primary">
              #{data.userRank}
            </span>
            <span className="font-semibold">{yourEntry.name}</span>
            <span className="text-sm text-ink-muted">
              <span aria-hidden="true">{levelIconForName(yourEntry.level)} </span>
              {yourEntry.level} · {formatNumber(yourEntry.points)} pts
            </span>
          </p>
        ) : (
          <div>
            <p className="m-0 text-sm text-ink-muted">
              You are not on the board yet — log your first action to claim a rank.
            </p>
            <Button href="/actions" size="sm" className="mt-3">
              Log an action
            </Button>
          </div>
        )}
      </GlassCard>

      {/* ── Circle join ── */}
      <GlassCard as="section" aria-labelledby="board-circle-heading">
        <h2 id="board-circle-heading" className="m-0 mb-2 font-display text-lg font-bold">
          Circles
        </h2>
        {circle === null ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              joinCircle();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <Field
              id="circle-code"
              label="Join a circle"
              hint="6-character code from a friend or colleague."
              error={codeError}
              className="w-56"
            >
              <input
                type="text"
                maxLength={6}
                autoComplete="off"
                className={INPUT_CLASS}
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
              />
            </Field>
            <Button type="submit" data-testid="circle-join" variant="ghost">
              Join circle
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm">
              Viewing circle <strong className="font-display">{circle}</strong>
            </p>
            <Button variant="ghost" size="sm" onClick={() => setCircle(null)}>
              Leave circle
            </Button>
          </div>
        )}
        <p className="m-0 mt-3 text-xs text-ink-muted">
          Circles are a demo: the code filters this board locally on your device. Shared circles
          that sync between saathis arrive with the Firebase roadmap.
        </p>
      </GlassCard>

      {/* ── Rankings ── */}
      <section aria-labelledby="board-table-heading">
        <h2 id="board-table-heading" className="sr-only">
          Rankings
        </h2>
        {error !== null ? (
          <RetryCard message={error} onRetry={retry} />
        ) : data === null ? (
          <CardSkeleton
            count={5}
            heightClass="h-12"
            label="Loading rankings"
            containerClassName="flex flex-col gap-2"
          />
        ) : (
          <GlassCard className="overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <caption className="sr-only">
                Leaderboard rankings by points{circle !== null ? ` within circle ${circle}` : ''}
              </caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="px-4 py-3">
                    Rank
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Saathi
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Level
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.name}`}
                    data-testid={entry.isYou === true ? 'leaderboard-you' : undefined}
                    className={
                      entry.isYou === true
                        ? 'border-b border-line bg-primary-soft font-semibold'
                        : 'border-b border-line'
                    }
                  >
                    <td className="px-4 py-2.5 font-display font-bold">#{entry.rank}</td>
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                      {entry.name}
                      {entry.isYou === true && (
                        <span className="ml-2 rounded-pill border border-line bg-surface px-2 py-0.5 text-xs font-bold text-primary">
                          You
                        </span>
                      )}
                    </th>
                    <td className="px-4 py-2.5">
                      <span aria-hidden="true">{levelIconForName(entry.level)} </span>
                      {entry.level}
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(entry.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )}
      </section>
    </div>
  );
}
