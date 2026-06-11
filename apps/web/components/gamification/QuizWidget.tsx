/**
 * 30-second landing quiz. Visitor picks one answer per question, gets an
 * instant CO₂ estimate, earns the quiz-whiz badge, and lands on the dashboard
 * — all without a full survey. Calls /api/quiz/estimate then /api/users/bootstrap.
 */
'use client';

import { useCallback, useState } from 'react';
import { QUIZ_QUESTIONS } from '@carbon-saathi/core';
import type { QuizAnswers } from '@carbon-saathi/core';
import { useProfile } from '../../lib/contexts';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';

type PartialAnswers = Partial<QuizAnswers>;

const TOTAL = QUIZ_QUESTIONS.length;

interface QuizEstimateResponse {
  ok: true;
  baseline: { totalAnnualKgCo2e: number };
}

async function fetchQuizEstimate(answers: QuizAnswers): Promise<number | null> {
  try {
    const res = await fetch('/api/quiz/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as QuizEstimateResponse;
    return data.baseline?.totalAnnualKgCo2e ?? null;
  } catch {
    return null;
  }
}

export function QuizWidget(): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PartialAnswers>({});
  const [co2, setCo2] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { bootstrap, applyUserState } = useProfile();
  const router = useRouter();

  const question = QUIZ_QUESTIONS[step];
  const done = step >= TOTAL;

  const pick = useCallback(
    async (optionId: string) => {
      const updatedAnswers = { ...answers, [question.id]: optionId } as PartialAnswers;
      setAnswers(updatedAnswers);

      if (step + 1 >= TOTAL) {
        // Last question answered — fetch estimate then bootstrap
        setLoading(true);
        const fullAnswers = updatedAnswers as QuizAnswers;
        const estimate = await fetchQuizEstimate(fullAnswers);
        setCo2(estimate);
        setStep(TOTAL);
        setLoading(false);
      } else {
        setStep(step + 1);
      }
    },
    [answers, question, step],
  );

  const goToDashboard = useCallback(async () => {
    setLoading(true);
    const user = await bootstrap();
    if (user) applyUserState(user);
    router.push('/dashboard');
  }, [bootstrap, applyUserState, router]);

  if (done) {
    const tonnes = co2 !== null ? (co2 / 1000).toFixed(1) : null;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-5xl">🎯</span>
        <h3 className="font-display text-xl font-bold">Quiz done! You earned a badge 🧠</h3>
        {tonnes !== null && (
          <p className="text-ink-muted">
            Your estimated footprint:{' '}
            <strong className="text-primary text-2xl">{tonnes} t CO₂e/year</strong>
          </p>
        )}
        <p className="text-sm text-ink-muted">
          India average is ~2 t. Let&apos;s see how yours breaks down and what to do about it.
        </p>
        <Button size="lg" onClick={goToDashboard} disabled={loading}>
          {loading ? 'Opening dashboard…' : 'See my full dashboard →'}
        </Button>
      </div>
    );
  }

  const progress = Math.round((step / TOTAL) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL}
          aria-label={`Question ${step + 1} of ${TOTAL}`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-ink-muted tabular-nums">
          {step + 1}/{TOTAL}
        </span>
      </div>

      <p className="font-display text-lg font-bold">{question.prompt}</p>

      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={question.prompt}>
        {question.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => void pick(opt.id)}
            disabled={loading}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-all hover:border-primary hover:bg-primary-soft focus-visible:outline-primary"
          >
            <span className="text-2xl" aria-hidden="true">
              {opt.emoji}
            </span>
            <span>
              <span className="block font-semibold text-sm">{opt.label}</span>
              <span className="block text-xs text-ink-muted">{opt.blurb}</span>
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
