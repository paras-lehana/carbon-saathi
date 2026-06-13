/**
 * EV coach route: a four-question wizard (distance, vehicle, charging+city,
 * long trips) that calls the EV-fit calculator. Owns answer state and
 * submission; step navigation comes from useWizard, question markup lives in
 * components/StepFields, the verdict in components/RecommendationCard and the
 * mode comparison table in components/CommuteCompare.
 */
'use client';

import { useState } from 'react';
import type { EvCurrentVehicle, EvFitResult } from '@carbon-saathi/core';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Stepper } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/lib/api-client';
import { useWizard } from '@/lib/use-wizard';
import { CommuteCompare } from './components/CommuteCompare';
import { RecommendationCard } from './components/RecommendationCard';
import {
  ChargingCityFields,
  CurrentVehicleFields,
  DailyDistanceFields,
  LongTripsFields,
} from './components/StepFields';
import { WIZARD_STEPS, validateLongTrips, type CityTier } from './components/ev-fit-form';

export default function EvCoachPage(): React.JSX.Element {
  const { showToast } = useToast();
  const { step, goToStep, isFirst, isLast, headingRef } = useWizard(WIZARD_STEPS.length);
  const [dailyKm, setDailyKm] = useState(25);
  const [currentVehicle, setCurrentVehicle] = useState<EvCurrentVehicle>('car-petrol');
  const [hasHomeCharging, setHasHomeCharging] = useState(false);
  const [hasOfficeCharging, setHasOfficeCharging] = useState(false);
  const [cityTier, setCityTier] = useState<CityTier>(1);
  const [longTrips, setLongTrips] = useState('1');
  const [longTripsError, setLongTripsError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<EvFitResult | null>(null);

  const submit = async (): Promise<void> => {
    const tripsError = validateLongTrips(longTrips);
    if (tripsError !== null) {
      setLongTripsError(tripsError);
      return;
    }
    setLongTripsError(undefined);
    setPending(true);
    const response = await api.calculateEvFit({
      dailyKm,
      currentVehicle,
      hasHomeCharging,
      hasOfficeCharging,
      longTripsPerMonth: Number(longTrips),
      cityTier,
    });
    setPending(false);
    if (!response.ok) {
      showToast(response.error.message, 'error');
      return;
    }
    setResult(response.data.result);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Should your next vehicle be electric?
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Four honest questions — no brand pitches — and you get a recommendation with real CO₂ and
          rupee savings.
        </p>
      </div>

      <Stepper steps={[...WIZARD_STEPS]} current={step} />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isLast) void submit();
          else goToStep(step + 1);
        }}
      >
        <GlassCard as="section" aria-labelledby="ev-step-heading">
          <h2
            id="ev-step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="m-0 mb-4 font-display text-lg font-bold"
          >
            Question {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step]}
          </h2>

          {step === 0 && <DailyDistanceFields dailyKm={dailyKm} onChange={setDailyKm} />}
          {step === 1 && (
            <CurrentVehicleFields value={currentVehicle} onChange={setCurrentVehicle} />
          )}
          {step === 2 && (
            <ChargingCityFields
              hasHomeCharging={hasHomeCharging}
              hasOfficeCharging={hasOfficeCharging}
              cityTier={cityTier}
              onHomeChargingChange={setHasHomeCharging}
              onOfficeChargingChange={setHasOfficeCharging}
              onCityTierChange={setCityTier}
            />
          )}
          {step === 3 && (
            <LongTripsFields value={longTrips} error={longTripsError} onChange={setLongTrips} />
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={isFirst || pending}
              onClick={() => goToStep(step - 1)}
            >
              Back
            </Button>
            {isLast ? (
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

      {result !== null && <RecommendationCard result={result} />}

      <CommuteCompare />
    </div>
  );
}
