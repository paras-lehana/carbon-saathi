/**
 * EV coach route: a four-question wizard (distance, vehicle, charging+city,
 * long trips) that calls the EV-fit calculator, plus the commute mode
 * comparison below. Owns wizard state and the recommendation card; the
 * comparison table lives in components/CommuteCompare.
 */
'use client';

import { useRef, useState } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import type { EvCurrentVehicle, EvFitInput, EvFitResult, EvRecommendation } from '@carbon-saathi/core';
import { Button } from '../../components/ui/Button';
import { CountUp } from '../../components/ui/CountUp';
import { Field } from '../../components/ui/Field';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatCard } from '../../components/ui/StatCard';
import { Stepper } from '../../components/ui/Stepper';
import { useToast } from '../../components/ui/Toast';
import * as api from '../../lib/api-client';
import { formatInr, formatKgCo2 } from '../../lib/format';
import { CommuteCompare } from './components/CommuteCompare';

const INPUT_CLASS =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink';

const WIZARD_STEPS = ['Daily distance', 'Current vehicle', 'Charging & city', 'Long trips'] as const;

const VEHICLE_OPTIONS: ReadonlyArray<{ value: EvCurrentVehicle; label: string }> = [
  { value: 'car-petrol', label: 'Car (petrol)' },
  { value: 'car-diesel', label: 'Car (diesel)' },
  { value: 'two-wheeler', label: 'Two-wheeler (petrol)' },
  { value: 'none', label: 'No vehicle yet — buying my first' },
];

const RECOMMENDATION_META: Record<EvRecommendation, { title: string; icon: string }> = {
  'public-transport-first': { title: 'Public transport first', icon: '🚇' },
  'ev-two-wheeler': { title: 'An electric two-wheeler fits you', icon: '🛵' },
  'ev-car': { title: 'An electric car fits you', icon: '🚗' },
  hybrid: { title: 'A strong hybrid fits you best (for now)', icon: '🔁' },
  'ev-car-with-planning': { title: 'An electric car works — with charging planning', icon: '🗺️' },
};

export default function EvCoachPage(): React.JSX.Element {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dailyKm, setDailyKm] = useState(25);
  const [currentVehicle, setCurrentVehicle] = useState<EvCurrentVehicle>('car-petrol');
  const [hasHomeCharging, setHasHomeCharging] = useState(false);
  const [hasOfficeCharging, setHasOfficeCharging] = useState(false);
  const [cityTier, setCityTier] = useState<EvFitInput['cityTier']>(1);
  const [longTrips, setLongTrips] = useState('1');
  const [longTripsError, setLongTripsError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<EvFitResult | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const fadeUp: MotionProps =
    reduceMotion === true
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const goToStep = (next: number): void => {
    setStep(next);
    // Land keyboard/SR users on the new step heading (onboarding pattern).
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  };

  const submit = async (): Promise<void> => {
    const trips = Number(longTrips);
    // Mirrors core's evFitInputSchema bound (integer 0–20).
    if (longTrips.trim() === '' || !Number.isInteger(trips) || trips < 0 || trips > 20) {
      setLongTripsError('Enter a whole number of trips, 0 to 20.');
      return;
    }
    setLongTripsError(undefined);
    setPending(true);
    const response = await api.calculateEvFit({
      dailyKm,
      currentVehicle,
      hasHomeCharging,
      hasOfficeCharging,
      longTripsPerMonth: trips,
      cityTier,
    });
    setPending(false);
    if (!response.ok) {
      showToast(response.error.message, 'error');
      return;
    }
    setResult(response.data.result);
  };

  const isLastStep = step === WIZARD_STEPS.length - 1;
  const meta = result !== null ? RECOMMENDATION_META[result.recommendation] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Should your next vehicle be electric?
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Four honest questions — no brand pitches — and you get a recommendation with real CO₂
          and rupee savings.
        </p>
      </div>

      <Stepper steps={[...WIZARD_STEPS]} current={step} />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isLastStep) void submit();
          else goToStep(step + 1);
        }}
      >
        <GlassCard as="section" aria-labelledby="ev-step-heading">
          <h2
            id="ev-step-heading"
            ref={stepHeadingRef}
            tabIndex={-1}
            className="m-0 mb-4 font-display text-lg font-bold"
          >
            Question {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step]}
          </h2>

          {step === 0 && (
            <div className="max-w-md">
              <Field
                id="ev-dailyKm"
                label="How far do you ride or drive on a typical day?"
                hint="Commute plus errands, both ways."
              >
                <input
                  type="range"
                  min={1}
                  max={300}
                  step={1}
                  value={dailyKm}
                  onChange={(event) => setDailyKm(Number(event.target.value))}
                  className="w-full accent-[var(--primary)]"
                />
              </Field>
              {/* The range input announces its own value — this echo is visual. */}
              <p aria-hidden="true" className="m-0 mt-2 font-display text-lg font-bold text-primary">
                {dailyKm} km / day
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="max-w-md">
              <Field id="ev-currentVehicle" label="What do you mostly use today?">
                <select
                  className={INPUT_CLASS}
                  value={currentVehicle}
                  onChange={(event) => setCurrentVehicle(event.target.value as EvCurrentVehicle)}
                >
                  {VEHICLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset className="m-0 border-0 p-0">
                <legend className="p-0 text-sm font-semibold">Where could you charge?</legend>
                <div className="mt-2 flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasHomeCharging}
                      onChange={(event) => setHasHomeCharging(event.target.checked)}
                    />
                    At home (own parking with a socket)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasOfficeCharging}
                      onChange={(event) => setHasOfficeCharging(event.target.checked)}
                    />
                    At the office
                  </label>
                </div>
              </fieldset>
              <fieldset className="m-0 border-0 p-0">
                <legend className="p-0 text-sm font-semibold">Your city</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {([1, 2, 3] as const).map((tier) => (
                    <label key={tier} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="ev-cityTier"
                        value={tier}
                        checked={cityTier === tier}
                        onChange={() => setCityTier(tier)}
                      />
                      {tier === 1
                        ? 'Tier-1 metro (Delhi, Mumbai, Bengaluru…)'
                        : tier === 2
                          ? 'Tier-2 city (Jaipur, Indore, Kochi…)'
                          : 'Tier-3 city or town'}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-md">
              <Field
                id="ev-longTrips"
                label="Long trips per month (300+ km)"
                hint="Highway runs change the charging math."
                error={longTripsError}
              >
                <input
                  type="number"
                  min={0}
                  max={20}
                  className={INPUT_CLASS}
                  value={longTrips}
                  onChange={(event) => setLongTrips(event.target.value)}
                />
              </Field>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={step === 0 || pending}
              onClick={() => goToStep(Math.max(0, step - 1))}
            >
              Back
            </Button>
            {isLastStep ? (
              <Button type="submit" data-testid="ev-fit-submit" disabled={pending}>
                {pending ? 'Checking…' : 'Get my recommendation'}
              </Button>
            ) : (
              <Button type="submit" data-testid="ev-fit-next">
                Next
              </Button>
            )}
          </div>
        </GlassCard>
      </form>

      {result !== null && meta !== null && (
        <motion.section {...fadeUp} aria-labelledby="ev-result-heading">
          <GlassCard as="div">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="ev-result-heading" className="m-0 font-display text-lg font-bold">
                <span aria-hidden="true">{meta.icon} </span>
                {meta.title}
              </h2>
              <span className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                {result.confidence === 'high' ? 'High confidence' : 'Medium confidence'}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="CO₂ saved per year"
                value={<CountUp value={result.annualCo2SavedKg} format={formatKgCo2} />}
                sublabel="vs what you use today"
                icon="🌍"
              />
              <StatCard
                label="fuel money saved per year"
                value={<CountUp value={result.annualFuelSavingInr} format={formatInr} />}
                sublabel="running costs only, estimated"
                icon="💰"
              />
            </div>
            <p className="m-0 mt-4 text-sm text-ink-muted">{result.fameNote}</p>
          </GlassCard>
        </motion.section>
      )}

      <CommuteCompare />
    </div>
  );
}
