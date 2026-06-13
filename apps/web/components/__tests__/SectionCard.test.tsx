/**
 * SectionCard: the card must be a landmark labelled by its own h2 carrying
 * the canonical heading classes, with the action slot beside the heading and
 * the optional content wrapper intact.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HEADING_CLASS, SectionCard } from '../ui/SectionCard';

describe('SectionCard', () => {
  it('renders a section labelled by its own heading', () => {
    render(
      <SectionCard id="streak-heading" title="Streak">
        <p>content</p>
      </SectionCard>,
    );
    const section = screen.getByRole('region', { name: 'Streak' });
    expect(section).toHaveAttribute('aria-labelledby', 'streak-heading');
    const heading = screen.getByRole('heading', { level: 2, name: 'Streak' });
    expect(heading).toHaveAttribute('id', 'streak-heading');
    expect(heading.className).toBe(HEADING_CLASS);
  });

  it('renders an aside landmark when asked to', () => {
    render(
      <SectionCard id="today-heading" title="Today" as="aside">
        <p>totals</p>
      </SectionCard>,
    );
    expect(screen.getByRole('complementary', { name: 'Today' })).toBeInTheDocument();
  });

  it('places the action beside the heading and drops the heading margin', () => {
    render(
      <SectionCard
        id="footprint-heading"
        title="Where your footprint comes from"
        action={<button type="button">Retake quiz</button>}
      >
        <p>donut</p>
      </SectionCard>,
    );
    expect(screen.getByRole('button', { name: 'Retake quiz' })).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 2 });
    // The action-row wrapper owns the spacing (mb-4), not the heading.
    expect(heading.className).not.toContain('mb-3');
    expect(heading.parentElement?.className).toContain('justify-between');
  });

  it('wraps children in a div only when contentClassName is given', () => {
    render(
      <SectionCard
        id="missions-heading"
        title="Weekly missions"
        contentClassName="flex flex-col gap-3"
      >
        <span>mission</span>
      </SectionCard>,
    );
    expect(screen.getByText('mission').parentElement?.className).toBe('flex flex-col gap-3');
  });
});
