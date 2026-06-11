/**
 * Route-segment skeleton for /dashboard, shown while the client bundle
 * streams in. A polite status node tells assistive tech what is happening;
 * the pulsing tiles are purely decorative.
 */
export default function DashboardLoading(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading your dashboard">
      <span className="sr-only">Loading your dashboard…</span>
      <div aria-hidden="true">
        <div className="glass-card mb-4 h-16 max-w-md animate-pulse" />
        <div className="bento-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="glass-card h-44 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
