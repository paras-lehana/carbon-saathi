/**
 * PM KUSUM tab: the farmer form (type, pump, HP, land) and the advisor
 * result — component routing, the 30/30/40 subsidy split, diesel and CO₂
 * savings and the checklist. Owns form state; validation comes from core's
 * shared zod schema and all math from the API.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFadeUp } from '@/lib/motion';
import { KUSUM_BOUNDS, kusumInputSchema } from '@carbon-saathi/core';
import type { KusumInput, KusumResult } from '@carbon-saathi/core';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/GlassCard';
import { SchemeChecklistCard } from '@/components/ui/SchemeChecklistCard';
import { SchemePortalLink } from '@/components/ui/SchemePortalLink';
import { StatCard } from '@/components/ui/StatCard';
import * as api from '@/lib/api-client';
import { fieldErrorsFromZod } from '@/lib/form-validation';
import { formatInr, formatKgCo2, formatNumber } from '@/lib/format';
import { useApiSubmit } from '@/lib/use-api-submit';
import { BreakdownBar } from './BreakdownBar';
import { INPUT_CLASS } from '@/components/ui/input-styles';

const COMPONENT_TITLES: Record<KusumResult['component'], string> = {
  A: 'Component A — solar plant on your land',
  B: 'Component B — standalone solar pump',
  C: 'Component C — solarise your grid pump',
};

const FARMER_TYPE_OPTIONS: ReadonlyArray<{ value: KusumInput['farmerType']; label: string }> = [
  { value: 'individual', label: 'Individual farmer' },
  { value: 'group', label: 'Group / FPO / cooperative' },
];

const PUMP_TYPE_OPTIONS: ReadonlyArray<{ value: KusumInput['pumpType']; label: string }> = [
  { value: 'diesel', label: 'Diesel pump' },
  { value: 'grid', label: 'Grid-connected electric pump' },
  { value: 'none', label: 'No pump yet' },
];

export function KusumPanel(): React.JSX.Element {
  const [farmerType, setFarmerType] = useState<KusumInput['farmerType']>('individual');
  const [pumpType, setPumpType] = useState<KusumInput['pumpType']>('diesel');
  const [pumpHp, setPumpHp] = useState('5');
  const [hasBarrenLand, setHasBarrenLand] = useState(false);
  const [landAcres, setLandAcres] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<KusumResult | null>(null);
  const { pending, submit } = useApiSubmit(api.adviseKusum);

  const fadeUp = useFadeUp();

  const handleSubmit = async (): Promise<void> => {
    const input: KusumInput = {
      farmerType,
      pumpType,
      pumpHp: Number(pumpHp),
      hasBarrenLand,
      ...(hasBarrenLand && landAcres.trim() !== '' ? { landAcres: Number(landAcres) } : {}),
    };
    // Same schema the API runs, so an input accepted here cannot be rejected there.
    const nextErrors = fieldErrorsFromZod(kusumInputSchema, input);
    setErrors(nextErrors ?? {});
    if (nextErrors !== null) return;
    const response = await submit(input);
    if (response.ok) setResult(response.data.result);
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassCard as="section" aria-labelledby="kusum-form-heading">
        <h2 id="kusum-form-heading" className="m-0 mb-1 font-display text-lg font-bold">
          🚜 Find my solar pump component
        </h2>
        <p className="m-0 mb-4 text-sm text-ink-muted">
          PM KUSUM covers about 60% of a solar pump — tell us about your farm to find your component
          and your share.
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field id="kusum-farmerType" label="Applying as">
            <select
              className={INPUT_CLASS}
              value={farmerType}
              onChange={(event) => {
                // A <select> only emits listed values — the lookup narrows the
                // string to the union without a cast.
                const selected = FARMER_TYPE_OPTIONS.find(
                  (option) => option.value === event.target.value,
                );
                setFarmerType((current) => selected?.value ?? current);
              }}
            >
              {FARMER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="kusum-pumpType" label="Current irrigation pump">
            <select
              className={INPUT_CLASS}
              value={pumpType}
              onChange={(event) => {
                const selected = PUMP_TYPE_OPTIONS.find(
                  (option) => option.value === event.target.value,
                );
                setPumpType((current) => selected?.value ?? current);
              }}
            >
              {PUMP_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="kusum-pumpHp"
            label="Pump size (HP)"
            hint="1 to 10 HP — the size you have or need."
            error={errors.pumpHp}
          >
            <input
              type="number"
              min={KUSUM_BOUNDS.pumpHp.min}
              max={KUSUM_BOUNDS.pumpHp.max}
              className={INPUT_CLASS}
              value={pumpHp}
              onChange={(event) => setPumpHp(event.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={hasBarrenLand}
                onChange={(event) => setHasBarrenLand(event.target.checked)}
              />
              I own barren or uncultivable land
            </label>
            {hasBarrenLand && (
              <Field
                id="kusum-landAcres"
                label="Barren land (acres)"
                hint="2+ acres unlocks Component A lease income."
                error={errors.landAcres}
              >
                <input
                  type="number"
                  min={1}
                  max={KUSUM_BOUNDS.landAcres.max}
                  step="0.5"
                  className={INPUT_CLASS}
                  value={landAcres}
                  onChange={(event) => setLandAcres(event.target.value)}
                />
              </Field>
            )}
          </div>
          <div className="md:col-span-2">
            <Button type="submit" data-testid="kusum-submit" disabled={pending}>
              {pending ? 'Checking…' : 'Check my KUSUM benefit'}
            </Button>
          </div>
        </form>
      </GlassCard>

      {result !== null && (
        <motion.section
          {...fadeUp}
          data-testid="kusum-result"
          aria-labelledby="kusum-result-heading"
        >
          <h2 id="kusum-result-heading" className="m-0 mb-4 font-display text-lg font-bold">
            {COMPONENT_TITLES[result.component]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="estimated project cost"
              value={formatInr(result.estCostInr)}
              sublabel="solar pump, installed"
              icon="🔧"
            />
            {result.dieselSavedLitresPerYear > 0 && (
              <StatCard
                label="diesel saved per year"
                value={`${formatNumber(result.dieselSavedLitresPerYear)} L`}
                sublabel="≈ 600 pumping hours"
                icon="⛽"
              />
            )}
            <StatCard
              label="CO₂ avoided per year"
              value={formatKgCo2(result.co2AvoidedKgPerYear)}
              sublabel="vs diesel or grid pumping"
              icon="🌍"
            />
          </div>

          <GlassCard as="div" className="mt-4">
            <h3 className="m-0 mb-3 font-display text-base font-bold">
              Who pays what — 30% central + 30% state + 40% farmer
            </h3>
            <BreakdownBar
              title="Project cost split between central subsidy, state subsidy and the farmer share"
              segments={[
                {
                  label: `Central subsidy (${result.subsidyBreakdown.centralPct}%)`,
                  amountInr: result.subsidyBreakdown.centralInr,
                  color: 'var(--primary)',
                },
                {
                  label: `State subsidy (${result.subsidyBreakdown.statePct}%)`,
                  amountInr: result.subsidyBreakdown.stateInr,
                  color: 'var(--info)',
                },
                {
                  label: `Your share (${result.subsidyBreakdown.farmerPct}%)`,
                  amountInr: result.subsidyBreakdown.farmerInr,
                  color: 'var(--accent)',
                },
              ]}
            />
            <p className="m-0 mt-3 text-sm text-ink-muted">
              Banks typically finance most of your {formatInr(result.farmerShareInr)} share — expect
              about {formatInr(result.subsidyBreakdown.farmerUpfrontApproxInr)} in cash upfront.
            </p>
          </GlassCard>

          {result.componentASuggestion !== undefined && (
            <GlassCard as="div" className="mt-4">
              <h3 className="m-0 mb-2 font-display text-base font-bold">
                🌾 Bonus: your {result.componentASuggestion.landAcres} acres could earn{' '}
                {formatInr(result.componentASuggestion.estLeaseIncomeInrPerYear)} a year
              </h3>
              <p className="m-0 text-sm text-ink-muted">{result.componentASuggestion.note}</p>
            </GlassCard>
          )}

          <SchemeChecklistCard title="How to apply" steps={result.checklist}>
            <SchemePortalLink
              prefix="Official scheme details:"
              href={result.officialLink}
              label="mnre.gov.in"
            />
          </SchemeChecklistCard>
        </motion.section>
      )}

      <p className="m-0 text-xs text-ink-muted">
        Estimates only — pump costs use a ₹60,000-per-HP approximation and state subsidies vary.
        Verify with your state implementing agency or MNRE before applying.
      </p>
    </div>
  );
}
