/**
 * ProgressRing: accessible-name contract and percentage clamping — the ring
 * must never announce values outside 0–100 even when callers pass garbage.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressRing } from '../ui/ProgressRing';

describe('ProgressRing', () => {
  it('exposes a single image with the label and percentage', () => {
    render(<ProgressRing pct={42} label="Level progress" />);
    expect(screen.getByRole('img', { name: 'Level progress: 42%' })).toBeInTheDocument();
  });

  it('clamps percentages above 100', () => {
    render(<ProgressRing pct={150} label="Level progress" />);
    expect(screen.getByRole('img', { name: 'Level progress: 100%' })).toBeInTheDocument();
  });

  it('clamps negative percentages to 0', () => {
    render(<ProgressRing pct={-25} label="Level progress" />);
    expect(screen.getByRole('img', { name: 'Level progress: 0%' })).toBeInTheDocument();
  });

  it('hides the decorative centre slot from assistive tech', () => {
    render(
      <ProgressRing pct={50} label="Points">
        <span>visual only</span>
      </ProgressRing>,
    );
    expect(screen.getByText('visual only').closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
