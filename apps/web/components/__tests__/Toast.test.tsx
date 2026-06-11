/**
 * Toast system: messages must land inside a polite live region (so screen
 * readers announce them) and auto-dismiss after the 5s contract.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../ui/Toast';

function Trigger(): React.JSX.Element {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast('Action logged!', 'success')}>
      fire
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a permanent polite live region', () => {
    const { container } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('announces a toast inside the live region and auto-dismisses after 5s', () => {
    const { container } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Action logged!');

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.queryByText('Action logged!')).not.toBeInTheDocument();
  });

  it('dismisses early via the close button', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Action logged!')).not.toBeInTheDocument();
  });
});
