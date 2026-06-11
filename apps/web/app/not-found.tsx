/**
 * Global 404: a friendly dead-end with routes back to the landing page and
 * the dashboard. Static server component — no client JS for an error page.
 */
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

export default function NotFound(): React.JSX.Element {
  return (
    <GlassCard
      as="section"
      className="mx-auto max-w-xl py-12 text-center"
      aria-labelledby="not-found-heading"
    >
      <span aria-hidden="true" className="text-5xl">
        🍂
      </span>
      <h1
        id="not-found-heading"
        className="mt-4 font-display text-[length:var(--text-xl)] font-bold"
      >
        This page drifted away
      </h1>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">
        The address you followed does not exist — but your footprint, missions and scheme
        calculators are all still right where you left them.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/">Back to the home page</Button>
        <Button href="/dashboard" variant="ghost">
          Open my dashboard
        </Button>
      </div>
    </GlassCard>
  );
}
