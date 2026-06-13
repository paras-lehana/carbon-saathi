/**
 * Scheme result shared blocks: the checklist keeps real list semantics with
 * decorative numbering hidden, and the portal link announces its new-tab
 * behaviour to screen readers.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SchemeChecklistCard } from '../ui/SchemeChecklistCard';
import { SchemePortalLink } from '../ui/SchemePortalLink';

describe('SchemeChecklistCard', () => {
  it('renders the steps as a list with aria-hidden numbering', () => {
    render(
      <SchemeChecklistCard
        title="How to apply — 6 steps"
        steps={['Register on the portal', 'Submit documents']}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'How to apply — 6 steps' }),
    ).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Register on the portal');
    // The visual step number is decorative — the <ol> already conveys order.
    expect(items[0].querySelector('[aria-hidden="true"]')).toHaveTextContent('1');
  });

  it('renders footer children such as the portal link inside the card', () => {
    render(
      <SchemeChecklistCard title="How to apply" steps={['Register']}>
        <SchemePortalLink
          prefix="Apply on the official portal:"
          href="https://pmsuryaghar.gov.in"
          label="pmsuryaghar.gov.in"
        />
      </SchemeChecklistCard>,
    );
    const link = screen.getByRole('link', { name: 'pmsuryaghar.gov.in (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://pmsuryaghar.gov.in');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
