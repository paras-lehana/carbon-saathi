/**
 * RetryCard: the failure message plus a Try again button wired to onRetry;
 * the titled variant must render a section named by its own heading (the
 * dashboard error-card contract).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RetryCard } from '../ui/RetryCard';

describe('RetryCard', () => {
  it('shows the message and calls onRetry from the Try again button', () => {
    const onRetry = vi.fn();
    render(<RetryCard message="Could not reach the API." onRetry={onRetry} />);
    expect(screen.getByText('Could not reach the API.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the titled variant as a section labelled by its heading', () => {
    render(
      <RetryCard
        id="dashboard-error-heading"
        title="We could not load your dashboard"
        message="Request failed with status 500."
        onRetry={() => undefined}
        className="mx-auto max-w-xl"
      />,
    );
    const section = screen.getByRole('region', { name: 'We could not load your dashboard' });
    expect(section).toHaveAttribute('aria-labelledby', 'dashboard-error-heading');
    expect(section.className).toContain('max-w-xl');
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'dashboard-error-heading',
    );
    expect(screen.getByText('Request failed with status 500.')).toBeInTheDocument();
  });
});
