/**
 * Tabs: WAI-ARIA pattern conformance — roving tabindex, arrow-key activation
 * with wrap-around, and correct panel visibility.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs } from '../ui/Tabs';

const ITEMS = [
  { id: 'surya', label: 'Surya Ghar', content: <p>Solar content</p> },
  { id: 'kusum', label: 'KUSUM', content: <p>Pump content</p> },
];

describe('Tabs', () => {
  it('selects the first tab by default and hides inactive panels', () => {
    render(<Tabs items={ITEMS} label="Schemes" />);
    expect(screen.getByRole('tab', { name: 'Surya Ghar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Solar content')).toBeVisible();
    expect(screen.getByText('Pump content')).not.toBeVisible();
  });

  it('moves selection with ArrowRight and wraps around', () => {
    render(<Tabs items={ITEMS} label="Schemes" />);
    const first = screen.getByRole('tab', { name: 'Surya Ghar' });

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'KUSUM' })).toHaveAttribute('aria-selected', 'true');

    // Wrap: ArrowRight from the last tab returns to the first.
    fireEvent.keyDown(screen.getByRole('tab', { name: 'KUSUM' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Surya Ghar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('keeps exactly one tab in the tab order (roving tabindex)', () => {
    render(<Tabs items={ITEMS} label="Schemes" />);
    fireEvent.click(screen.getByRole('tab', { name: 'KUSUM' }));
    expect(screen.getByRole('tab', { name: 'KUSUM' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Surya Ghar' })).toHaveAttribute('tabindex', '-1');
  });
});
