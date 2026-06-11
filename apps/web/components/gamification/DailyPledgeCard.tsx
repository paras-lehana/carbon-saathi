/**
 * Daily pledge selector. User picks one action to commit to today. After
 * setting a pledge the card shows the commitment with a 1.2× bonus reminder.
 * Calls POST /api/pledge with userId + actionId.
 */
'use client';

import { useCallback, useState } from 'react';
import { ACTION_CATALOG } from '@carbon-saathi/core';
import type { DailyPledge } from '@carbon-saathi/core';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

interface DailyPledgeCardProps {
  userId: string;
  currentPledge: DailyPledge | null;
  onPledgeSet?: (pledge: DailyPledge) => void;
}

interface PledgeResponse {
  ok: boolean;
  pledge: DailyPledge;
}

export function DailyPledgeCard({ userId, currentPledge, onPledgeSet }: DailyPledgeCardProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pledge, setPledge] = useState<DailyPledge | null>(currentPledge);

  const today = new Date().toISOString().slice(0, 10);
  const activePledge = pledge?.dateISO === today ? pledge : null;

  const submit = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pledge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, actionId: selectedId }),
      });
      if (!res.ok) {
        setError('Could not set pledge. Try again.');
        return;
      }
      const data = (await res.json()) as PledgeResponse;
      setPledge(data.pledge);
      onPledgeSet?.(data.pledge);
    } catch {
      setError('Network error. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [selectedId, userId, onPledgeSet]);

  const pledgedAction = activePledge
    ? ACTION_CATALOG.find((a) => a.id === activePledge.actionId)
    : null;

  if (activePledge && pledgedAction) {
    return (
      <GlassCard className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🤝</span>
          <h3 className="font-display text-sm font-bold">Today&apos;s Pledge</h3>
        </div>
        <p className="text-sm font-semibold text-primary">{pledgedAction.label}</p>
        <p className="text-xs text-ink-muted">
          Complete this today to earn a{' '}
          <strong className="text-accent">1.2× bonus</strong> on your points.
        </p>
        {activePledge.bonusApplied && (
          <p className="text-xs font-semibold text-success">✓ Bonus applied!</p>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">🤝</span>
        <h3 className="font-display text-sm font-bold">Set Today&apos;s Pledge</h3>
      </div>
      <p className="text-xs text-ink-muted">
        Commit to one action today — complete it for a <strong>1.2× points bonus</strong>.
      </p>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-primary"
        aria-label="Choose an action to pledge"
      >
        <option value="">Choose an action…</option>
        {ACTION_CATALOG.map((action) => (
          <option key={action.id} value={action.id}>
            {action.label} (+{action.co2SavedKg} kg CO₂)
          </option>
        ))}
      </select>
      {error !== null && <p className="text-xs text-error">{error}</p>}
      <Button
        size="sm"
        onClick={() => void submit()}
        disabled={!selectedId || loading}
      >
        {loading ? 'Setting pledge…' : 'Pledge for today'}
      </Button>
    </GlassCard>
  );
}
