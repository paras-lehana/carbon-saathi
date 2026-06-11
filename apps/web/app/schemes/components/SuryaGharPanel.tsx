/**
 * PM Surya Ghar tab: the rooftop-solar form (units, roof area, tariff) and
 * the result panel — sizing, subsidy split, payback, CO₂ and the application
 * checklist. Owns form state/validation; all math comes from the API.
 */
'use client';

import { useState } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import type { SuryaGharInput, SuryaGharResult } from '@carbon-saathi/core';
import { Button } from '../../../components/ui/Button';
import { CountUp } from '../../../components/ui/CountUp';
import { Field } from '../../../components/ui/Field';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatCard } from '../../../components/ui/StatCard';
import { useToast } from '../../../components/ui/Toast';
import * as api from '../../../lib/api-client';
import { formatInr, formatKgCo2, formatNumber } from '../../../lib/format';
import { BreakdownBar } from './BreakdownBar';

const INPUT_CLASS =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink';

interface FormErrors {
  monthlyUnits?: string;
  roofAreaSqFt?: string;
  tariffPerUnit?: string;
}

/** Bounds mirror core's suryaGharInputSchema so the API never rejects us. */
function validate(monthlyUnits: string, roofArea: string, tariff: string): FormErrors {
  const errors: FormErrors = {};
  const units = Number(monthlyUnits);
  if (monthlyUnits.trim() === '' || !Number.isFinite(units) || units < 30 || units > 2000) {
    errors.monthlyUnits = 'Enter your monthly units, between 30 and 2,000.';
  }
  if (roofArea.trim() !== '') {
    const area = Number(roofArea);
    if (!Number.isFinite(area) || area < 80 || area > 20_000) {
      errors.roofAreaSqFt = 'Roof area must be between 80 and 20,000 sq ft (or leave it blank).';
    }
  }
  if (tariff.trim() !== '') {
    const rate = Number(tariff);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 30) {
      errors.tariffPerUnit = 'Tariff must be between ₹0 and ₹30 per unit (or leave it blank).';
    }
  }
  return errors;
}

export function SuryaGharPanel(): React.JSX.Element {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [monthlyUnits, setMonthlyUnits] = useState('300');
  const [roofAreaSqFt, setRoofAreaSqFt] = useState('');
  const [tariffPerUnit, setTariffPerUnit] = useState('7');
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SuryaGharResult | null>(null);

  const fadeUp: MotionProps =
    reduceMotion === true
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const submit = async (): Promise<void> => {
    const nextErrors = validate(monthlyUnits, roofAreaSqFt, tariffPerUnit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const input: SuryaGharInput = {
      monthlyUnits: Number(monthlyUnits),
      ...(roofAreaSqFt.trim() !== '' ? { roofAreaSqFt: Number(roofAreaSqFt) } : {}),
      ...(tariffPerUnit.trim() !== '' ? { tariffPerUnit: Number(tariffPerUnit) } : {}),
    };
    setPending(true);
    const response = await api.calculateSuryaGhar(input);
    setPending(false);
    if (!response.ok) {
      showToast(response.error.message, 'error');
      return;
    }
    setResult(response.data.result);
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassCard as="section" aria-labelledby="surya-form-heading">
        <h2 id="surya-form-heading" className="m-0 mb-1 font-display text-lg font-bold">
          ☀️ Size my rooftop solar
        </h2>
        <p className="m-0 mb-4 text-sm text-ink-muted">
          Three numbers from your electricity bill are enough for a sizing, subsidy and payback
          estimate.
        </p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="grid gap-4 md:grid-cols-3"
        >
          <Field
            id="surya-monthlyUnits"
            label="Monthly electricity use (units)"
            hint="kWh per month — on every bill."
            error={errors.monthlyUnits}
          >
            <input
              type="number"
              min={30}
              max={2000}
              className={INPUT_CLASS}
              value={monthlyUnits}
              onChange={(event) => setMonthlyUnits(event.target.value)}
            />
          </Field>
          <Field
            id="surya-roofAreaSqFt"
            label="Shadow-free roof area (sq ft)"
            hint="Optional — caps the system size."
            error={errors.roofAreaSqFt}
          >
            <input
              type="number"
              min={80}
              max={20000}
              className={INPUT_CLASS}
              value={roofAreaSqFt}
              onChange={(event) => setRoofAreaSqFt(event.target.value)}
            />
          </Field>
          <Field
            id="surya-tariffPerUnit"
            label="Tariff (₹ per unit)"
            hint="Optional — defaults to ₹7."
            error={errors.tariffPerUnit}
          >
            <input
              type="number"
              min={1}
              max={30}
              step="0.5"
              className={INPUT_CLASS}
              value={tariffPerUnit}
              onChange={(event) => setTariffPerUnit(event.target.value)}
            />
          </Field>
          <div className="md:col-span-3">
            <Button type="submit" data-testid="surya-ghar-submit" disabled={pending}>
              {pending ? 'Calculating…' : 'Calculate my solar plan'}
            </Button>
          </div>
        </form>
      </GlassCard>

      {result !== null && (
        <motion.section {...fadeUp} data-testid="scheme-result" aria-labelledby="surya-result-heading">
          <h2 id="surya-result-heading" className="m-0 mb-4 font-display text-lg font-bold">
            Your rooftop solar plan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="recommended system"
              value={`${result.recommendedKw} kW`}
              sublabel={`≈ ${formatNumber(result.annualGenerationKwh)} kWh generated per year`}
              icon="☀️"
            />
            <StatCard
              label="central subsidy"
              value={<CountUp value={result.subsidyInr} format={formatInr} />}
              sublabel="PM Surya Ghar assistance"
              icon="🏦"
            />
            <StatCard
              label="payback period"
              value={`${result.paybackYears} yrs`}
              sublabel={`saving ≈ ${formatInr(result.annualSavingInr)} per year`}
              icon="⏳"
            />
            <StatCard
              label="CO₂ avoided per year"
              value={formatKgCo2(result.co2AvoidedKgPerYear)}
              sublabel="vs grid electricity"
              icon="🌍"
            />
          </div>

          <GlassCard as="div" className="mt-4">
            <h3 className="m-0 mb-3 font-display text-base font-bold">
              Who pays what — system cost {formatInr(result.capexInr)}
            </h3>
            <BreakdownBar
              title="System cost split between the central subsidy and your net cost"
              segments={[
                { label: 'Central subsidy', amountInr: result.subsidyInr, color: 'var(--primary)' },
                { label: 'Your net cost', amountInr: result.netCostInr, color: 'var(--accent)' },
              ]}
            />
            <p className="m-0 mt-3 text-sm text-ink-muted">{result.loanNote}</p>
            <p className="m-0 mt-1 text-sm text-ink-muted">{result.freeUnitsNote}</p>
          </GlassCard>

          <GlassCard as="div" className="mt-4">
            <h3 className="m-0 mb-3 font-display text-base font-bold">How to apply — 6 steps</h3>
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
              Apply on the official portal:{' '}
              <a
                href={result.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                pmsuryaghar.gov.in
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </GlassCard>
        </motion.section>
      )}

      <p className="m-0 text-xs text-ink-muted">
        Estimates only — sizing uses typical insolation and 2024 market costs; subsidy slabs and
        tariffs vary by state and DISCOM. Verify on the official portal before purchasing.
      </p>
    </div>
  );
}
