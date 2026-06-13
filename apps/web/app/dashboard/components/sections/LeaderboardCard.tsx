/**
 * Leaderboard-mini section of the dashboard bento: the top three plus your
 * own rank and a link to the full board. Renders nothing when the board call
 * failed or came back empty — the grid simply tightens up.
 */
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';
import type { LeaderboardResponse } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import { levelIconForName } from '@/lib/levels';

const MINI_BOARD_SIZE = 3;

export interface LeaderboardCardProps {
  leaderboard: LeaderboardResponse | null;
}

export function LeaderboardCard({ leaderboard }: LeaderboardCardProps): React.JSX.Element | null {
  if (leaderboard === null || leaderboard.entries.length === 0) return null;

  return (
    <SectionCard id="dash-board-heading" title="Leaderboard top 3">
      <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        {leaderboard.entries.slice(0, MINI_BOARD_SIZE).map((entry) => (
          <li key={entry.rank} className="flex items-center justify-between gap-2">
            <span>
              <span className="font-display font-bold">#{entry.rank}</span> {entry.name}
              <span aria-hidden="true"> {levelIconForName(entry.level)}</span>
            </span>
            <span className="text-ink-muted">{formatNumber(entry.points)} pts</span>
          </li>
        ))}
      </ol>
      {leaderboard.userRank !== null && (
        <p className="m-0 mt-3 text-xs text-ink-muted">You are ranked #{leaderboard.userRank}.</p>
      )}
      <Button href="/leaderboard" variant="ghost" size="sm" className="mt-3">
        Full leaderboard
      </Button>
    </SectionCard>
  );
}
