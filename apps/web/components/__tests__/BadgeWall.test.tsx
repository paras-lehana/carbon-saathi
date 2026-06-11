/**
 * BadgeWall: one tile per catalog badge, earned/locked partition exposed
 * through accessible names, and the hint tooltip wired via aria-describedby.
 */
import { BADGE_CATALOG } from '@carbon-saathi/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BadgeWall } from '../gamification/BadgeWall';

describe('BadgeWall', () => {
  it('renders one focusable tile per catalog badge', () => {
    render(<BadgeWall earnedIds={[]} />);
    expect(screen.getAllByRole('button')).toHaveLength(BADGE_CATALOG.length);
    expect(screen.getAllByRole('listitem')).toHaveLength(BADGE_CATALOG.length);
  });

  it('marks earned vs locked in the accessible name', () => {
    render(<BadgeWall earnedIds={['pehla-kadam']} />);
    expect(screen.getByRole('button', { name: 'Pehla Kadam (earned)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quiz Whiz (locked)' })).toBeInTheDocument();
  });

  it('dims only the emoji on locked tiles — the name keeps full contrast', () => {
    render(<BadgeWall earnedIds={['pehla-kadam']} />);
    const locked = screen.getByRole('button', { name: 'Quiz Whiz (locked)' });
    const earned = screen.getByRole('button', { name: 'Pehla Kadam (earned)' });
    expect(locked.querySelector('.opacity-40')).not.toBeNull();
    expect(earned.querySelector('.opacity-40')).toBeNull();
    // Lock glyph is the non-color locked cue.
    expect(locked.textContent).toContain('🔒');
    expect(earned.textContent).not.toContain('🔒');
  });

  it('links each tile to its hint tooltip via aria-describedby', () => {
    render(<BadgeWall earnedIds={[]} />);
    for (const tile of screen.getAllByRole('button')) {
      const describedBy = tile.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      const tooltip = document.getElementById(describedBy as string);
      expect(tooltip).not.toBeNull();
      expect(tooltip?.getAttribute('role')).toBe('tooltip');
      expect(tooltip?.textContent?.length).toBeGreaterThan(0);
    }
  });

  it('renders all-locked without crashing on an empty earned list', () => {
    render(<BadgeWall earnedIds={[]} />);
    expect(screen.queryByText(/\(earned\)/)).not.toBeInTheDocument();
  });
});
