/**
 * Dashboard empty state for visitors without a profile: a friendly pointer
 * to onboarding plus a one-click demo profile (window.__saathi.seedDemoUser,
 * the same path the e2e suite uses).
 */
'use client';

import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useToast } from '../../../components/ui/Toast';

export function EmptyState(): React.JSX.Element {
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const seedDemo = async (): Promise<void> => {
    setSeeding(true);
    // The debug bridge applies the new profile to context itself, which
    // re-renders the dashboard — no navigation needed on success.
    const user = await window.__saathi?.seedDemoUser();
    setSeeding(false);
    if (user === null || user === undefined) {
      showToast('Could not create the demo profile. Is the API running?', 'error');
    } else {
      showToast('Demo profile ready — exploring as Demo Saathi.', 'success');
    }
  };

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
