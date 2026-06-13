/**
 * Onboarding wizard: five steps (home energy → commute → food → lifestyle →
 * review) with per-step validation, then baseline calculation + user
 * bootstrap and an animated result reveal. Owns form state; step navigation
 * comes from useWizard, field markup lives in components/StepFields, the
 * form model in components/survey-form.
 */
'use client';

import { useState } from 'react';
import type { BaselineFootprintResult } from '@carbon-saathi/core';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Stepper } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/lib/api-client';
import { useProfile } from '@/lib/contexts';
import { useWizard } from '@/lib/use-wizard';
import { ResultReveal } from './components/ResultReveal';
import { ReviewSummary } from './components/ReviewSummary';
import {
  CommuteFields,
  FoodFields,
  HomeEnergyFields,
  LifestyleFields,
} from './components/StepFields';
import {
  DEFAULT_SURVEY_FORM,
  SURVEY_STEPS,
  toBaselineSurveyInput,
  validateAllSteps,
  validateStep,
  type SurveyErrors,
  type SurveyFormState,
} from './components/survey-form';

export default function OnboardingPage(): React.JSX.Element {
  const profile = useProfile();
  const { showToast } = useToast();
  const { step, goToStep, isFirst, isLast, headingRef } = useWizard(SURVEY_STEPS.length);
  const [form, setForm] = useState<SurveyFormState>(DEFAULT_SURVEY_FORM);
  const [errors, setErrors] = useState<SurveyErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BaselineFootprintResult | null>(null);

  const updateField = <K extends keyof SurveyFormState>(
    field: K,
    value: SurveyFormState[K],
  ): void => {
    setForm((current) => ({ ...current, [field]: value }));
    // Clear the field's error as soon as the user edits it — stale errors
    // otherwise contradict what is on screen.
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const applyErrors = (stepErrors: SurveyErrors): void => {
    setErrors(stepErrors);
    const firstField = Object.keys(stepErrors)[0];
    if (firstField !== undefined) {
      document.getElementById(`survey-${firstField}`)?.focus();
    }
  };

  const handleNext = (): void => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      applyErrors(stepErrors);
      return;
    }
    goToStep(step + 1);
  };

  const handleSubmit = async (): Promise<void> => {
    const allErrors = validateAllSteps(form);
    if (Object.keys(allErrors).length > 0) {
      applyErrors(allErrors);
      // Jump back to the earliest step that still has a problem.
      goToStep(0);
      return;
    }
    setSubmitting(true);
    const survey = toBaselineSurveyInput(form);
    const baselineResult = await api.calculateBaseline(survey);
    if (!baselineResult.ok) {
      setSubmitting(false);
      showToast(baselineResult.error.message, 'error');
      return;
    }
    const displayName = form.displayName.trim();
    // source + survey ride along: the badge engine awards pehla-kadam at
    // bootstrap, and the assistant grounds on the persisted survey numbers.
    const userResult = await api.bootstrapUser({
      ...(displayName !== '' ? { displayName } : {}),
      baseline: baselineResult.data.baseline,
      survey,
      source: 'survey',
    });
    setSubmitting(false);
    if (!userResult.ok) {
      showToast(userResult.error.message, 'error');
      return;
    }
    profile.applyUserState(userResult.data);
    setResult(baselineResult.data.baseline);
    showToast('Baseline saved — welcome aboard!', 'success');
  };

  if (result !== null) {
    return <ResultReveal baseline={result} />;
  }

  // The wizard's final step is the read-back review before submission.
  const isReview = isLast;
  const stepFieldProps = { form, errors, onChange: updateField };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Know your footprint
        </h1>
        <p className="mt-2 text-ink-muted">
          Five quick steps — about two minutes — to your personal annual CO₂ number.
        </p>
      </div>

      <Stepper steps={[...SURVEY_STEPS]} current={step} />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isReview) void handleSubmit();
          else handleNext();
        }}
      >
        <GlassCard as="section" aria-labelledby="onboarding-step-heading">
          <h2
            id="onboarding-step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="m-0 mb-4 font-display text-lg font-bold"
          >
            Step {step + 1} of {SURVEY_STEPS.length}: {SURVEY_STEPS[step]}
          </h2>

          {step === 0 && <HomeEnergyFields {...stepFieldProps} />}
          {step === 1 && <CommuteFields {...stepFieldProps} />}
          {step === 2 && <FoodFields {...stepFieldProps} />}
          {step === 3 && <LifestyleFields {...stepFieldProps} />}
          {isReview && <ReviewSummary form={form} />}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={isFirst || submitting}
              onClick={() => goToStep(step - 1)}
            >
              Back
            </Button>
            {isReview ? (
              <Button type="submit" data-testid="onboarding-submit" disabled={submitting}>
                {submitting ? 'Calculating…' : 'Calculate my footprint'}
              </Button>
            ) : (
              <Button type="submit" data-testid="onboarding-next">
                Next
              </Button>
            )}
          </div>
        </GlassCard>
      </form>
    </div>
  );
}
