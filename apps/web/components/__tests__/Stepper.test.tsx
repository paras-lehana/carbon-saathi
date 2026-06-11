/**
 * Stepper: position semantics — exactly one step carries aria-current="step"
 * and completed steps are announced as such.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper } from '../ui/Stepper';

const STEPS = ['Household', 'Commute', 'Food', 'Review'];

describe('Stepper', () => {
  it('marks only the active step with aria-current="step"', () => {
    render(<Stepper steps={STEPS} current={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    items
      .filter((_, index) => index !== 2)
      .forEach((item) => expect(item).not.toHaveAttribute('aria-current'));
  });

  it('announces earlier steps as completed', () => {
    render(<Stepper steps={STEPS} current={2} />);
    expect(screen.getAllByText('(completed)')).toHaveLength(2);
  });
});
