/**
 * Route-segment skeleton for /google-services, shown while the client bundle
 * streams in. A polite status node tells assistive tech what is happening;
 * the pulsing cards are purely decorative.
 */
export default function GoogleServicesLoading(): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading the Google services evidence">
      <span className="sr-only">Loading the Google services evidence…</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="glass-card h-16 max-w-md animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="glass-card h-56 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
