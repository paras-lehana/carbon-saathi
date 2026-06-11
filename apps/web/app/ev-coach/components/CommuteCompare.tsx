/**
 * Commute mode comparison: a one-way distance input and an accessible table
 * of per-mode CO₂/cost, marking whether figures came from a deterministic
 * estimate or Google Maps. Owns its own fetch state, separate from the wizard.
 */
'use client';

import { useState } from 'react';
import type { CommuteCompareMode } from '@carbon-saathi/core';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useToast } from '../../../components/ui/Toast';
import * as api from '../../../lib/api-client';
import type { CommuteCompareResponse } from '../../../lib/api-client';
import { formatKgCo2, formatNumber } from '../../../lib/format';

const INPUT_CLASS =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink';

const MODE_LABELS: Record<CommuteCompareMode, string> = {
  'car-petrol': 'Car (petrol)',
  'car-cng': 'Car (CNG)',
  'two-wheeler': 'Two-wheeler (petrol)',
  'ev-2w': 'Electric two-wheeler',
  bus: 'Bus',
  metro: 'Metro',
  'cycle-walk': 'Cycle / walk',
};

export function CommuteCompare(): React.JSX.Element {
  const { showToast } = useToast();
  const [distance, setDistance] = useState('10');
  const [distanceError, setDistanceError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [comparison, setComparison] = useState<CommuteCompareResponse | null>(null);

  const submit = async (): Promise<void> => {
    const km = Number(distance);
    // Mirrors core's commuteCompareRequestSchema bound (0 < km ≤ 500).
    if (distance.trim() === '' || !Number.isFinite(km) || km <= 0 || km > 500) {
      setDistanceError('Enter a one-way distance between 1 and 500 km.');
      return;
    }
    setDistanceError(undefined);
    setPending(true);
    const result = await api.compareCommute({ distanceKm: km });
    setPending(false);
    if (!result.ok) {
      showToast(result.error.message, 'error');
      return;
    }
    setComparison(result.data);
  };

  return (
    <GlassCard as="section" aria-labelledby="commute-compare-heading">
      <h2 id="commute-compare-heading" className="m-0 mb-1 font-display text-lg font-bold">
        Compare your commute, mode by mode
      </h2>
      <p className="m-0 mb-4 text-sm text-ink-muted">
        Daily round trip CO₂ and out-of-pocket cost for the same distance, every way you could
        travel it.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field
          id="commute-distanceKm"
          label="One-way distance (km)"
          error={distanceError}
          className="w-44"
        >
          <input
            type="number"
            min={1}
            max={500}
            className={INPUT_CLASS}
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
          />
        </Field>
        <Button type="submit" data-testid="commute-compare-submit" disabled={pending}>
          {pending ? 'Comparing…' : 'Compare modes'}
        </Button>
      </form>

      {comparison !== null && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <caption className="pb-2 text-left text-xs text-ink-muted">
              Daily round trip emissions and cost per mode.{' '}
              {comparison.source === 'maps'
                ? 'Distance resolved via the Google Maps Distance Matrix API.'
                : 'Source: deterministic estimate — Google Maps is used automatically when a key is configured.'}
            </caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="px-3 py-2">
                  Mode
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  CO₂ per day
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Cost per day
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  CO₂ per year if daily
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.modes.map((mode) => (
                <tr key={mode.mode} className="border-b border-line">
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    {MODE_LABELS[mode.mode]}
                  </th>
                  <td className="px-3 py-2 text-right">{mode.co2Kg} kg</td>
                  <td className="px-3 py-2 text-right">₹{formatNumber(mode.costInr)}</td>
                  <td className="px-3 py-2 text-right">{formatKgCo2(mode.annualKgIfDaily)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
