/**
 * One quick-log action card: per-unit impact, a quantity stepper bounded by
 * the action's daily cap, and the Log button. Owns its quantity/pending
 * state; the page owns the catalog and the running "Today" totals.
 */
'use client';

import { useState } from 'react';
import type { ActionDefinition, ActionLogEntry } from '@carbon-saathi/core';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useToast } from '../../../components/ui/Toast';
import { useGamification } from '../../../lib/contexts';

export interface ActionCardProps {
  action: ActionDefinition;
  /** Receives the server's authoritative view of today's log after each save. */
  onLogged: (todayLog: ActionLogEntry[]) => void;
}

const STEP_BUTTON_CLASS =
  'flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface font-bold text-ink disabled:opacity-40';

export function ActionCard({ action, onLogged }: ActionCardProps): React.JSX.Element {
  const { logAction } = useGamification();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);

  const clamp = (value: number): number =>
    Math.min(action.maxPerDay, Math.max(1, Math.round(value)));

  const submit = async (): Promise<void> => {
    setPending(true);
    const result = await logAction(action.id, quantity);
    setPending(false);
    if (!result.ok) {
      showToast(result.error.message, 'error');
      return;
    }
    showToast(
      `+${result.data.impact.co2SavedKg} kg CO₂ saved · +${result.data.impact.points} points`,
      'success',
    );
    onLogged(result.data.todayLog);
  };

  const quantityInputId = `action-qty-${action.id}`;

  return (
    <GlassCard as="article" className="flex h-full flex-col gap-3">
      <div>
        <h3 className="m-0 font-display text-base font-bold">{action.label}</h3>
        <p className="m-0 mt-1 text-sm text-ink-muted">{action.description}</p>
      </div>
      <p className="m-0 text-sm">
        <strong className="text-primary">{action.co2SavedKg} kg CO₂</strong> ·{' '}
        <strong>{action.pointsPerUnit} pts</strong> per {action.unitLabel}
        <span className="text-ink-muted"> · up to {action.maxPerDay}/day</span>
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <div role="group" aria-label={`Quantity of ${action.unitLabel}`} className="flex items-center gap-1">
          <button
            type="button"
            className={STEP_BUTTON_CLASS}
            aria-label={`Decrease quantity of ${action.unitLabel}`}
            disabled={pending || quantity <= 1}
            onClick={() => setQuantity((current) => clamp(current - 1))}
          >
            −
          </button>
          <label htmlFor={quantityInputId} className="sr-only">
            Quantity of {action.unitLabel} (1 to {action.maxPerDay})
          </label>
          <input
            id={quantityInputId}
            type="number"
            min={1}
            max={action.maxPerDay}
            value={quantity}
            disabled={pending}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) setQuantity(clamp(parsed));
            }}
            className="h-9 w-14 rounded-control border border-line bg-surface text-center text-base text-ink"
          />
          <button
            type="button"
            className={STEP_BUTTON_CLASS}
            aria-label={`Increase quantity of ${action.unitLabel}`}
            disabled={pending || quantity >= action.maxPerDay}
            onClick={() => setQuantity((current) => clamp(current + 1))}
          >
            +
          </button>
        </div>
        <Button
          size="sm"
          data-testid={`action-log-${action.id}`}
          disabled={pending}
          onClick={() => void submit()}
        >
          {pending ? 'Logging…' : 'Log it'}
        </Button>
      </div>
    </GlassCard>
  );
}
