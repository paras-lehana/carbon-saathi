/**
 * PM Surya Ghar tab: the rooftop-solar form (units, roof area, tariff) and
 * the result panel — sizing, subsidy split, payback, CO₂ and the application
 * checklist. Owns form state; validation comes from core's shared zod schema
 * and all math from the API.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFadeUp } from '@/lib/motion';
import { SURYA_GHAR_BOUNDS, suryaGharInputSchema } from '@carbon-saathi/core';
import type { SuryaGharInput, SuryaGharResult } from '@carbon-saathi/core';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
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

export function SuryaGharPanel(): React.JSX.Element {
  const [monthlyUnits, setMonthlyUnits] = useState('300');
  const [roofAreaSqFt, setRoofAreaSqFt] = useState('');
  const [tariffPerUnit, setTariffPerUnit] = useState('7');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SuryaGharResult | null>(null);
  const { pending, submit } = useApiSubmit(api.calculateSuryaGhar);

  const fadeUp = useFadeUp();

  const handleSubmit = async (): Promise<void> => {
    const input: SuryaGharInput = {
      monthlyUnits: Number(monthlyUnits),
      ...(roofAreaSqFt.trim() !== '' ? { roofAreaSqFt: Number(roofAreaSqFt) } : {}),
      ...(tariffPerUnit.trim() !== '' ? { tariffPerUnit: Number(tariffPerUnit) } : {}),
    };
    // Same schema the API runs, so an input accepted here cannot be rejected there.
    const nextErrors = fieldErrorsFromZod(suryaGharInputSchema, input);
    setErrors(nextErrors ?? {});
    if (nextErrors !== null) return;
    const response = await submit(input);
    if (response.ok) setResult(response.data.result);
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
            void handleSubmit();
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
              min={SURYA_GHAR_BOUNDS.monthlyUnits.min}
              max={SURYA_GHAR_BOUNDS.monthlyUnits.max}
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
              min={SURYA_GHAR_BOUNDS.roofAreaSqFt.min}
              max={SURYA_GHAR_BOUNDS.roofAreaSqFt.max}
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
              max={SURYA_GHAR_BOUNDS.tariffPerUnit.max}
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
        <motion.section
          {...fadeUp}
          data-testid="scheme-result"
          aria-labelledby="surya-result-heading"
        >
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

          <SchemeChecklistCard title="How to apply — 6 steps" steps={result.checklist}>
            <SchemePortalLink
              prefix="Apply on the official portal:"
              href={result.portalUrl}
              label="pmsuryaghar.gov.in"
            />
          </SchemeChecklistCard>
        </motion.section>
      )}

      <p className="m-0 text-xs text-ink-muted">
        Estimates only — sizing uses typical insolation and 2024 market costs; subsidy slabs and
        tariffs vary by state and DISCOM. Verify on the official portal before purchasing.
      </p>
    </div>
  );
}
