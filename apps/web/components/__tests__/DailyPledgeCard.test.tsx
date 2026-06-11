/**
 * DailyPledgeCard: selector gating, the typed setPledge round trip, error
 * announcement via role=alert, stale-date pledges falling back to the
 * selector, and the bonus-applied state. 'Today' is pinned with fake timers
 * because the card computes IST calendar dates.
 */
import { ACTION_CATALOG } from '@carbon-saathi/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyPledgeCard } from '../gamification/DailyPledgeCard';
import { ToastProvider } from '../ui/Toast';

// 2026-06-11T12:00Z = 17:30 IST — both UTC and IST agree on the date, so the
// assertions stay timezone-stable.
const FIXED_NOW = new Date('2026-06-11T12:00:00.000Z');
const TODAY_IST = '2026-06-11';

function renderCard(props: Partial<Parameters<typeof DailyPledgeCard>[0]> = {}): void {
  render(
    <ToastProvider>
      <DailyPledgeCard userId="u1" currentPledge={null} {...props} />
    </ToastProvider>,
  );
}

describe('DailyPledgeCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: FIXED_NOW, shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders a labelled selector with the full catalog and gates the submit', () => {
    renderCard();
    const select = screen.getByLabelText('Choose an action to pledge');
    // +1 for the placeholder option.
    expect(select.querySelectorAll('option')).toHaveLength(ACTION_CATALOG.length + 1);
    expect(screen.getByRole('button', { name: 'Pledge for today' })).toBeDisabled();
  });

  it('posts the pledge and flips to the committed view', async () => {
    const pledge = { actionId: 'veg-day', dateISO: TODAY_IST, bonusApplied: false };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ pledge }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    renderCard();
    fireEvent.change(screen.getByLabelText('Choose an action to pledge'), {
      target: { value: 'veg-day' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pledge for today' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: "Today's pledge" })).toBeInTheDocument();
    });
    expect(screen.getByText('Fully vegetarian day')).toBeInTheDocument();
    expect(screen.getByText(/1\.2× bonus/)).toBeInTheDocument();
  });

  it('announces failures via role=alert and stays on the selector', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'NOT_FOUND', message: 'Unknown userId — bootstrap first.' },
          }),
          {
            status: 404,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );
    renderCard();
    fireEvent.change(screen.getByLabelText('Choose an action to pledge'), {
      target: { value: 'veg-day' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pledge for today' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unknown userId — bootstrap first.');
    expect(screen.getByLabelText('Choose an action to pledge')).toBeInTheDocument();
  });

  it("treats yesterday's pledge as expired and shows the selector", () => {
    renderCard({
      currentPledge: { actionId: 'veg-day', dateISO: '2026-06-10', bonusApplied: false },
    });
    expect(screen.getByLabelText('Choose an action to pledge')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "Today's pledge" })).not.toBeInTheDocument();
  });

  it('shows the bonus-applied state for a completed pledge', () => {
    renderCard({
      currentPledge: { actionId: 'veg-day', dateISO: TODAY_IST, bonusApplied: true },
    });
    expect(screen.getByText('✓ Bonus applied!')).toBeInTheDocument();
  });
});
