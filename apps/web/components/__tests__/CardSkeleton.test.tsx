/**
 * CardSkeleton: a polite status node must name what is loading while the
 * pulsing tiles stay hidden from assistive tech.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardSkeleton } from '../ui/CardSkeleton';

describe('CardSkeleton', () => {
  it('announces the label through a status node', () => {
    render(<CardSkeleton count={3} label="Loading rankings" />);
    const status = screen.getByRole('status', { name: 'Loading rankings' });
    expect(status).toHaveTextContent('Loading rankings…');
  });

  it('hides the pulsing tiles from assistive tech and renders count of them', () => {
    const { container } = render(
      <CardSkeleton count={5} heightClass="h-12" containerClassName="flex flex-col gap-2" />,
    );
    const tiles = container.querySelector('[aria-hidden="true"]');
    expect(tiles).not.toBeNull();
    expect(tiles?.className).toBe('flex flex-col gap-2');
    expect(tiles?.querySelectorAll('.animate-pulse')).toHaveLength(5);
    expect(tiles?.querySelector('.glass-card.h-12')).not.toBeNull();
  });
});
