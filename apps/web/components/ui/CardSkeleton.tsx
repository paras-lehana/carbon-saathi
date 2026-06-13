/**
 * CardSkeleton: the pulsing-card loading state — a polite status node tells
 * assistive tech what is loading while the decorative placeholder tiles stay
 * aria-hidden. The exact markup previously repeated across route pages and
 * loading segments.
 */
export interface CardSkeletonProps {
  /** Number of placeholder tiles — mirror the expected data size. */
  count: number;
  /** Tile height utility; h-44 matches the dashboard's bento cards. */
  heightClass?: string;
  /** Announced as "{label}…" — say what is loading, e.g. "Loading rankings". */
  label?: string;
  /** Layout for the tile container (grid/flex classes); plain block when omitted. */
  containerClassName?: string;
}

export function CardSkeleton({
  count,
  heightClass = 'h-44',
  label = 'Loading',
  containerClassName,
}: CardSkeletonProps): React.JSX.Element {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true" className={containerClassName}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={`glass-card ${heightClass} animate-pulse`} />
        ))}
      </div>
    </div>
  );
}
