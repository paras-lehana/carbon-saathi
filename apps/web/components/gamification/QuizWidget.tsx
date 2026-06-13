/**
 * 30-second landing quiz: one answer per question, instant CO₂ estimate, and
 * a one-tap dashboard handoff. Transport goes through lib/api-client (typed,
 * never throws); the quiz-whiz badge itself is awarded server-side when the
 * bootstrap carries source: 'quiz'. Focus and live-region wiring make every
 * step change audible to screen readers.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { quizAnswersSchema, QUIZ_QUESTIONS } from '@carbon-saathi/core';
import type { QuizAnswers, QuizQuestionId } from '@carbon-saathi/core';
import * as api from '@/lib/api-client';
import type { QuizEstimateResponse } from '@/lib/api-client';
import { useProfile } from '@/lib/contexts';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

type PartialAnswers = Partial<Record<QuizQuestionId, string>>;

const TOTAL = QUIZ_QUESTIONS.length;

/**
 * Runtime-validated completion check: the same core zod schema the API
 * enforces, so no cast ever asserts that five string picks form QuizAnswers.
 */
function buildQuizAnswers(partial: PartialAnswers): QuizAnswers | null {
  const parsed = quizAnswersSchema.safeParse(partial);
  return parsed.success ? parsed.data : null;
}

export interface QuizWidgetProps {
  onComplete?: () => void;
}

export function QuizWidget({ onComplete }: QuizWidgetProps = {}): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PartialAnswers>({});
  const [estimate, setEstimate] = useState<QuizEstimateResponse | null>(null);
  const [estimateFailed, setEstimateFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { applyUserState } = useProfile();
  const { showToast } = useToast();
  const router = useRouter();
  const promptRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  // Synchronous re-entry guard: `loading` state lands a render late, so a
  // rapid double-click on the final option could fire the estimate twice.
  const submittingRef = useRef(false);

  const done = step >= TOTAL;
  // Clamped index: on the done screen the question is unused but stays a
  // valid QuizQuestion, so no null branch ever reaches the render path.
  const question = QUIZ_QUESTIONS[Math.min(step, TOTAL - 1)];

  // Focus follows the flow: each new question's prompt, then the result
  // heading — otherwise focus drops to <body> when the options unmount.
  useEffect(() => {
    if (done) {
      resultRef.current?.focus();
    } else if (step > 0) {
      promptRef.current?.focus();
    }
  }, [step, done]);

  const fetchEstimate = useCallback(
    async (fullAnswers: QuizAnswers) => {
      setLoading(true);
      const result = await api.quizEstimate(fullAnswers);
      if (result.ok) {
        setEstimate(result.data);
        setEstimateFailed(false);
      } else {
        setEstimateFailed(true);
        showToast(result.error.message, 'error');
      }
      setStep(TOTAL);
      setLoading(false);
      submittingRef.current = false;
    },
    [showToast],
  );

  const pick = useCallback(
    (optionId: string) => {
      if (submittingRef.current) return;
      const updatedAnswers: PartialAnswers = { ...answers, [question.id]: optionId };
      setAnswers(updatedAnswers);
      if (step + 1 >= TOTAL) {
        const fullAnswers = buildQuizAnswers(updatedAnswers);
        if (fullAnswers === null) {
          // Five picks that fail the schema means a programming error — land
          // on the result screen with the retry affordance rather than hang.
          setEstimateFailed(true);
          setStep(TOTAL);
          return;
        }
        submittingRef.current = true;
        void fetchEstimate(fullAnswers);
      } else {
        setStep(step + 1);
      }
    },
    [answers, question, step, fetchEstimate],
  );

  const retryEstimate = useCallback(() => {
    const fullAnswers = buildQuizAnswers(answers);
    if (fullAnswers !== null) void fetchEstimate(fullAnswers);
  }, [answers, fetchEstimate]);

  const goToDashboard = useCallback(async () => {
    setLoading(true);
    // Bootstrap carries the quiz result so the dashboard opens with a real
    // baseline — and source: 'quiz' earns the badge server-side.
    const result = await api.bootstrapUser({
      baseline: estimate?.baseline,
      survey: estimate?.survey,
      source: 'quiz',
    });
    if (!result.ok) {
      setLoading(false);
      showToast(result.error.message, 'error');
      return;
    }
    applyUserState(result.data);
    if (onComplete) {
      onComplete();
    } else {
      router.push('/dashboard');
    }
  }, [estimate, applyUserState, router, showToast, onComplete]);

  if (done) {
    const tonnes = estimate !== null ? (estimate.baseline.totalKgAnnual / 1000).toFixed(1) : null;
    return (
      <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        <span className="text-5xl" aria-hidden="true">
          🎯
        </span>
        <h3 ref={resultRef} tabIndex={-1} className="font-display text-xl font-bold outline-none">
          Quiz done! Your Quiz Whiz badge is waiting 🧠
        </h3>
        {tonnes !== null && (
          <p className="text-ink-muted">
            Your estimated footprint:{' '}
            <strong className="text-2xl text-primary">{tonnes} t CO₂e/year</strong>
          </p>
        )}
        {estimateFailed && (
          <div role="alert" className="flex flex-col items-center gap-2">
            <p className="m-0 text-sm text-error">We could not compute your estimate.</p>
            <Button size="sm" variant="ghost" onClick={retryEstimate} disabled={loading}>
              Try the estimate again
            </Button>
          </div>
        )}
        <p className="text-sm text-ink-muted">
          India average is ~2 t. Let&apos;s see how yours breaks down and what to do about it.
        </p>
        <Button size="lg" onClick={() => void goToDashboard()} disabled={loading}>
          {loading ? 'Opening dashboard…' : onComplete ? 'Done' : 'See my full dashboard →'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-label="Quiz progress"
          className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-alt"
        >
          <div
            className="h-full rounded-pill bg-primary transition-all duration-300"
            style={{ width: `${Math.round((step / TOTAL) * 100)}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-ink-muted">
          {step + 1}/{TOTAL}
        </span>
      </div>

      {/* Announce each question change; the heading also receives focus. */}
      <p aria-live="polite" className="sr-only">
        Question {step + 1} of {TOTAL}
      </p>
      <h3 ref={promptRef} tabIndex={-1} className="m-0 font-display text-lg font-bold outline-none">
        {question.prompt}
      </h3>

      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={question.prompt}>
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => pick(option.id)}
            disabled={loading}
            className="flex items-center gap-3 rounded-control border border-line bg-surface px-4 py-3 text-left transition-all hover:border-primary hover:bg-primary-soft focus-visible:outline-primary"
          >
            <span className="text-2xl" aria-hidden="true">
              {option.emoji}
            </span>
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-xs text-ink-muted">{option.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-ink-muted">
        No sign-up needed &middot; Takes ~30 seconds
      </p>
    </div>
  );
}
