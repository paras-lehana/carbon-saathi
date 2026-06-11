/**
 * Daily pledge card: pick one action to commit to today for a 1.2× points
 * bonus (applied server-side at log time). Renders from the prop — the
 * dashboard refetch is the source of truth — keeping only the just-submitted
 * pledge as optimistic state. Transport goes through lib/api-client.
 */
'use client';

import { useCallback, useState } from 'react';
import { ACTION_CATALOG } from '@carbon-saathi/core';
import type { DailyPledge } from '@carbon-saathi/core';
import * as api from '../../lib/api-client';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { GlassCard } from '../ui/GlassCard';
import { useToast } from '../ui/Toast';

interface DailyPledgeCardProps {
  userId: string;
  currentPledge: DailyPledge | null;
  onPledgeSet?: (pledge: DailyPledge) => void;
}

// IST calendar date — matches the server's istDayISO convention so a pledge
// set late evening does not look expired before midnight in India.
const IST_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

export function DailyPledgeCard({
  userId,
  currentPledge,
  onPledgeSet,
}: DailyPledgeCardProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic only until the parent refetches and the prop catches up.
  const [submittedPledge, setSubmittedPledge] = useState<DailyPledge | null>(null);
  const { showToast } = useToast();

  const today = IST_DAY_FORMATTER.format(new Date());
  const effectivePledge = submittedPledge ?? currentPledge;
  const activePledge = effectivePledge?.dateISO === today ? effectivePledge : null;

  const submit = useCallback(async () => {
    if (selectedId === '') return;
    setLoading(true);
    setError(null);
    const result = await api.setPledge({ userId, actionId: selectedId });
    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setSubmittedPledge(result.data.pledge);
    const label = ACTION_CATALOG.find((action) => action.id === result.data.pledge.actionId)?.label;
    showToast(`Pledge set: ${label ?? result.data.pledge.actionId}`, 'success');
    onPledgeSet?.(result.data.pledge);
    setLoading(false);
  }, [selectedId, userId, onPledgeSet, showToast]);

  const pledgedAction = activePledge
    ? ACTION_CATALOG.find((action) => action.id === activePledge.actionId)
    : undefined;

  if (activePledge && pledgedAction !== undefined) {
    return (
      <GlassCard as="section" aria-labelledby="pledge-heading" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            🤝
          </span>
          <h2 id="pledge-heading" className="m-0 font-display text-lg font-bold">
            Today&apos;s pledge
          </h2>
        </div>
        <p className="m-0 text-sm font-semibold text-primary">{pledgedAction.label}</p>
        <p className="m-0 text-xs text-ink-muted">
          {/* Plain strong — the amber accent token is ~2:1 on surface, decorative only. */}
          Complete this today to earn a <strong className="text-ink">1.2× bonus</strong> on its
          points.
        </p>
        {activePledge.bonusApplied && (
          <p className="m-0 text-xs font-semibold text-success">✓ Bonus applied!</p>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard as="section" aria-labelledby="pledge-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          🤝
        </span>
        <h2 id="pledge-heading" className="m-0 font-display text-lg font-bold">
          Set today&apos;s pledge
        </h2>
      </div>
      <p className="m-0 text-xs text-ink-muted">
        Commit to one action today — complete it for a <strong>1.2× points bonus</strong>.
      </p>
      <Field id="pledge-action" label="Choose an action to pledge">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="rounded-control border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-primary"
        >
          <option value="">Choose an action…</option>
          {ACTION_CATALOG.map((action) => (
            <option key={action.id} value={action.id}>
              {action.label} (+{action.co2SavedKg} kg CO₂)
            </option>
          ))}
        </select>
      </Field>
      {error !== null && (
        <p role="alert" className="m-0 text-xs font-semibold text-error">
          {error}
        </p>
      )}
      <Button size="sm" onClick={() => void submit()} disabled={selectedId === '' || loading}>
        {loading ? 'Setting pledge…' : 'Pledge for today'}
      </Button>
    </GlassCard>
  );
}
