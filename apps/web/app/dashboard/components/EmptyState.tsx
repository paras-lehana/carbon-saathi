/**
 * Dashboard empty state for visitors without a profile: a friendly pointer
 * to onboarding plus a one-click demo profile (lib/use-seed-demo, the same
 * path the e2e suite uses).
 */
'use client';

import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useSeedDemo } from '../../../lib/use-seed-demo';

export function EmptyState(): React.JSX.Element {
  const { seeding, seedDemo } = useSeedDemo();

  return (
    <GlassCard as="section" className="mx-auto max-w-xl py-10 text-center" aria-label="No profile yet">
      <span aria-hidden="true" className="text-5xl">
        🌱
      </span>
      <h1 className="mt-4 font-display text-[length:var(--text-xl)] font-bold">
        Your dashboard is waiting for a footprint
      </h1>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">
        Answer a two-minute survey to see your annual CO₂, your level and your weekly missions —
        or peek inside with a demo profile first.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/onboarding">Start the two-minute survey</Button>
        <Button variant="ghost" onClick={() => void seedDemo()} disabled={seeding}>
          {seeding ? 'Setting up…' : 'Try a demo profile'}
        </Button>
      </div>
    </GlassCard>
  );
}
