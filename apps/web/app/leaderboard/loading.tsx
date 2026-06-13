/**
 * Route-segment skeleton for /leaderboard, shown while the client bundle
 * streams in. CardSkeleton owns the polite status announcement; the row
 * count approximates the rankings table the page renders.
 */
import { CardSkeleton } from '@/components/ui/CardSkeleton';

export default function LeaderboardLoading(): React.JSX.Element {
  return (
    <CardSkeleton
      count={7}
      heightClass="h-12"
      label="Loading the leaderboard"
      containerClassName="mx-auto flex max-w-3xl flex-col gap-4"
    />
  );
}
