/**
 * useWizard: step state for the multi-step forms (onboarding, EV coach).
 * goToStep clamps to the valid range and moves focus to the step heading on
 * the next frame, so keyboard and screen-reader users land in context after
 * every transition — the behaviour previously copied between the two pages.
 */
'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';

export interface WizardState {
  step: number;
  /** Clamped navigation plus heading focus; pass step ± 1 for Back/Next. */
  goToStep: (next: number) => void;
  isFirst: boolean;
  isLast: boolean;
  /** Attach to the step heading (with tabIndex={-1}) so goToStep can focus it. */
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function useWizard(stepCount: number): WizardState {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const goToStep = useCallback(
    (next: number): void => {
      setStep(Math.min(Math.max(0, next), stepCount - 1));
      // Move focus to the new step heading so keyboard/SR users land in context.
      requestAnimationFrame(() => headingRef.current?.focus());
    },
    [stepCount],
  );

  return { step, goToStep, isFirst: step === 0, isLast: step === stepCount - 1, headingRef };
}
