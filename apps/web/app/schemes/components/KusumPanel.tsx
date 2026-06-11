/**
 * PM KUSUM tab: the farmer form (type, pump, HP, land) and the advisor
 * result — component routing, the 30/30/40 subsidy split, diesel and CO₂
 * savings and the checklist. Owns form state; all math comes from the API.
 */
'use client';

import { useState } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import type { KusumInput, KusumResult } from '@carbon-saathi/core';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatCard } from '../../../components/ui/StatCard';
import { useToast } from '../../../components/ui/Toast';
import * as api from '../../../lib/api-client';
import { formatInr, formatKgCo2, formatNumber } from '../../../lib/format';
import { BreakdownBar } from './BreakdownBar';

const INPUT_CLASS =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink';

const COMPONENT_TITLES: Record<KusumResult['component'], string> = {
  A: 'Component A — solar plant on your land',
  B: 'Component B — standalone solar pump',
  C: 'Component C — solarise your grid pump',
};

interface FormErrors {
  pumpHp?: string;
  landAcres?: string;
}

export function KusumPanel(): React.JSX.Element {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [farmerType, setFarmerType] = useState<KusumInput['farmerType']>('individual');
  const [pumpType, setPumpType] = useState<KusumInput['pumpType']>('diesel');
  const [pumpHp, setPumpHp] = useState('5');
  const [hasBarrenLand, setHasBarrenLand] = useState(false);
  const [landAcres, setLandAcres] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<KusumResult | null>(null);

  const fadeUp: MotionProps =
    reduceMotion === true
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const submit = async (): Promise<void> => {
    // Bounds mirror core's kusumInputSchema so the API never rejects us.
    const nextErrors: FormErrors = {};
    const hp = Number(pumpHp);
    if (pumpHp.trim() === '' || !Number.isFinite(hp) || hp < 1 || hp > 10) {
      nextErrors.pumpHp = 'Pump size must be between 1 and 10 HP.';
    }
    if (hasBarrenLand && landAcres.trim() !== '') {
      const acres = Number(landAcres);
      if (!Number.isFinite(acres) || acres <= 0 || acres > 10_000) {
        nextErrors.landAcres = 'Enter your land in acres (a positive number), or leave it blank.';
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: KusumInput = {
      farmerType,
      pumpType,
      pumpHp: hp,
      hasBarrenLand,
      ...(hasBarrenLand && landAcres.trim() !== '' ? { landAcres: Number(landAcres) } : {}),
    };
    setPending(true);
    const response = await api.adviseKusum(input);
    setPending(false);
    if (!response.ok) {
      showToast(response.error.message, 'error');
      return;
    }
    setResult(response.data.result);
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassCard as="section" aria-labelledby="kusum-form-heading">
        <h2 id="kusum-form-heading" className="m-0 mb-1 font-display text-lg font-bold">
          🚜 Find my solar pump component
        </h2>
        <p className="m-0 mb-4 text-sm text-ink-muted">
          PM KUSUM covers about 60% of a solar pump — tell us about your farm to find your
          component and your share.
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field id="kusum-farmerType" label="Applying as">
            <select
              className={INPUT_CLASS}
              value={farmerType}
              onChange={(event) => setFarmerType(event.target.value as KusumInput['farmerType'])}
            >
              <option value="individual">Individual farmer</option>
              <option value="group">Group / FPO / cooperative</option>
            </select>
          </Field>
          <Field id="kusum-pumpType" label="Current irrigation pump">
            <select
              className={INPUT_CLASS}
              value={pumpType}
              onChange={(event) => setPumpType(event.target.value as KusumInput['pumpType'])}
            >
              <option value="diesel">Diesel pump</option>
              <option value="grid">Grid-connected electric pump</option>
              <option value="none">No pump yet</option>
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
              min={1}
              max={10}
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
                  max={10000}
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
        <motion.section {...fadeUp} data-testid="kusum-result" aria-labelledby="kusum-result-heading">
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
              Banks typically finance most of your {formatInr(result.farmerShareInr)} share —
              expect about {formatInr(result.subsidyBreakdown.farmerUpfrontApproxInr)} in cash
              upfront.
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

          <GlassCard as="div" className="mt-4">
            <h3 className="m-0 mb-3 font-display text-base font-bold">How to apply</h3>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {result.checklist.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="m-0 mt-4 text-sm">
              Official scheme details:{' '}
              <a
                href={result.officialLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                mnre.gov.in
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </GlassCard>
        </motion.section>
      )}

      <p className="m-0 text-xs text-ink-muted">
        Estimates only — pump costs use a ₹60,000-per-HP approximation and state subsidies vary.
        Verify with your state implementing agency or MNRE before applying.
      </p>
    </div>
  );
}
