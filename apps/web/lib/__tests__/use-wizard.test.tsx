/**
 * useWizard: clamped step navigation with focus moved to the step heading on
 * every transition — the onboarding/EV-coach contract.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWizard } from '../use-wizard';

function Harness({ stepCount }: { stepCount: number }): React.JSX.Element {
  const { step, goToStep, isFirst, isLast, headingRef } = useWizard(stepCount);
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1}>
        Step {step + 1}
      </h2>
      <p data-testid="flags">{`${isFirst ? 'first' : ''}|${isLast ? 'last' : ''}`}</p>
      <button type="button" onClick={() => goToStep(step + 1)}>
        Next
      </button>
      <button type="button" onClick={() => goToStep(step - 1)}>
        Back
      </button>
    </div>
  );
}

describe('useWizard', () => {
  beforeEach(() => {
    // Run the focus frame synchronously so assertions can observe it.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('advances steps and moves focus to the heading', () => {
    render(<Harness stepCount={3} />);
    expect(screen.getByTestId('flags')).toHaveTextContent('first|');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const heading = screen.getByRole('heading', { name: 'Step 2' });
    expect(document.activeElement).toBe(heading);
  });

  it('clamps below the first and above the last step', () => {
    render(<Harness stepCount={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument();
    expect(screen.getByTestId('flags')).toHaveTextContent('|last');
  });
});
