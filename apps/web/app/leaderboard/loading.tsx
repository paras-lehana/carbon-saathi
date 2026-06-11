/**
 * Route-segment skeleton for /leaderboard, shown while the client bundle
 * streams in. A polite status node tells assistive tech what is happening;
 * the pulsing rows are purely decorative.
 */
export default function LeaderboardLoading(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading the leaderboard">
      <span className="sr-only">Loading the leaderboard…</span>
      <div aria-hidden="true" className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="glass-card h-16 max-w-md animate-pulse" />
        <div className="glass-card h-28 animate-pulse" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="glass-card h-12 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
