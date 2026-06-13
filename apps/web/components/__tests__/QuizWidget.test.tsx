/**
 * QuizWidget: step progression with progressbar semantics, the estimate
 * round trip on the final answer, the failure path, and the bootstrap →
 * dashboard handoff carrying baseline + source: 'quiz'.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateFromQuiz, QUIZ_QUESTIONS, quizAnswersSchema } from '@carbon-saathi/core';
import { QuizWidget } from '../gamification/QuizWidget';
import { ToastProvider } from '../ui/Toast';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const applyUserStateMock = vi.fn();
vi.mock('../../lib/contexts', () => ({
  useProfile: () => ({ applyUserState: applyUserStateMock }),
}));

function renderWidget(): void {
  render(
    <ToastProvider>
      <QuizWidget />
    </ToastProvider>,
  );
}

/** Clicks the first option of the currently-rendered question. */
function answerCurrentQuestion(questionIndex: number): void {
  const question = QUIZ_QUESTIONS[questionIndex];
  const group = screen.getByRole('group', { name: question.prompt });
  fireEvent.click(group.querySelectorAll('button')[0] as HTMLButtonElement);
}

// The test clicks the FIRST option of every question; mirror that here so the
// mocked payload is exactly what the live API (which serves core's output
// verbatim) would return — and therefore passes api-client's response schema.
const FIRST_OPTION_ANSWERS = quizAnswersSchema.parse(
  Object.fromEntries(QUIZ_QUESTIONS.map((question) => [question.id, question.options[0].id])),
);

const ESTIMATE = (() => {
  const result = estimateFromQuiz(FIRST_OPTION_ANSWERS);
  if (!result.ok) throw new Error('first-option quiz answers must produce an estimate');
  return result.value;
})();

/** The tonnes line the widget renders for the mocked estimate, e.g. "1.8 t CO₂e/year". */
const EXPECTED_TONNES_TEXT = new RegExp(
  `${(ESTIMATE.baseline.totalKgAnnual / 1000).toFixed(1).replace('.', '\\.')} t CO₂e/year`,
);

function stubEstimateFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ baseline: ESTIMATE.baseline, survey: ESTIMATE.survey }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('QuizWidget', () => {
  beforeEach(() => {
    pushMock.mockReset();
    applyUserStateMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts at question 1 with correct progressbar semantics', () => {
    renderWidget();
    const bar = screen.getByRole('progressbar', { name: 'Quiz progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', String(QUIZ_QUESTIONS.length));
    expect(screen.getByRole('heading', { name: QUIZ_QUESTIONS[0].prompt })).toBeInTheDocument();
    // Five commute options on question 1.
    const group = screen.getByRole('group', { name: QUIZ_QUESTIONS[0].prompt });
    expect(group.querySelectorAll('button')).toHaveLength(QUIZ_QUESTIONS[0].options.length);
  });

  it('advances to the next question on answer', () => {
    renderWidget();
    answerCurrentQuestion(0);
    expect(screen.getByRole('heading', { name: QUIZ_QUESTIONS[1].prompt })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Quiz progress' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
  });

  it('fetches the estimate after the final answer and shows tonnes', async () => {
    const fetchMock = stubEstimateFetch();
    renderWidget();
    for (let i = 0; i < QUIZ_QUESTIONS.length; i += 1) {
      answerCurrentQuestion(i);
    }
    await waitFor(() => {
      expect(screen.getByText(EXPECTED_TONNES_TEXT)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/quiz/estimate');
    const body = JSON.parse(String(init.body)) as { answers: Record<string, string> };
    expect(Object.keys(body.answers).sort()).toEqual([
      'ac',
      'commute',
      'diet',
      'flights',
      'shopping',
    ]);
  });

  it('reaches the result screen with a retry affordance when the estimate fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderWidget();
    for (let i = 0; i < QUIZ_QUESTIONS.length; i += 1) {
      answerCurrentQuestion(i);
    }
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not compute your estimate.');
    expect(screen.getByRole('button', { name: 'Try the estimate again' })).toBeInTheDocument();
  });

  it('bootstraps with the quiz baseline + source and routes to the dashboard', async () => {
    const fetchMock = stubEstimateFetch();
    renderWidget();
    for (let i = 0; i < QUIZ_QUESTIONS.length; i += 1) {
      answerCurrentQuestion(i);
    }
    await screen.findByText(EXPECTED_TONNES_TEXT);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ userId: 'u1', gamification: { earnedBadges: ['quiz-whiz'] } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /See my full dashboard/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
    expect(applyUserStateMock).toHaveBeenCalledTimes(1);
    const [, bootstrapInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const bootstrapBody = JSON.parse(String(bootstrapInit.body)) as Record<string, unknown>;
    expect(bootstrapBody.source).toBe('quiz');
    expect(bootstrapBody.baseline).toEqual(ESTIMATE.baseline);
    expect(bootstrapBody.survey).toEqual(ESTIMATE.survey);
  });
});
