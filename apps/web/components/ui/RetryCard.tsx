/**
 * RetryCard: the load-failure card — error message plus a "Try again" button
 * wired to the caller's loader. With `id` + `title` it renders the
 * dashboard's labelled-section variant; without them, the compact
 * message-only card the other routes use.
 */
import { Button } from './Button';
import { GlassCard } from './GlassCard';

/** id and title come together: the title is the section's accessible name. */
type RetryCardHeading = { id: string; title: string } | { id?: undefined; title?: undefined };

export type RetryCardProps = RetryCardHeading & {
  /** Human-readable failure reason — typically `result.error.message`. */
  message: string;
  onRetry: () => void;
  /** Extra layout classes (e.g. the dashboard's `mx-auto max-w-xl`). */
  className?: string;
};

export function RetryCard({
  id,
  title,
  message,
  onRetry,
  className,
}: RetryCardProps): React.JSX.Element {
  const cardClassName = ['py-10 text-center', className].filter(Boolean).join(' ');
  const retryButton = (
    <Button className="mt-4" onClick={onRetry}>
      Try again
    </Button>
  );

  if (id !== undefined && title !== undefined) {
    return (
      <GlassCard as="section" className={cardClassName} aria-labelledby={id}>
        <h2 id={id} className="m-0 font-display text-lg font-bold">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">{message}</p>
        {retryButton}
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cardClassName}>
      <p className="m-0 text-ink-muted">{message}</p>
      {retryButton}
    </GlassCard>
  );
}
