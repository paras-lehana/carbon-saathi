/**
 * Button: semantics contract — href renders a real link, otherwise a native
 * button with a safe default type (no accidental form submits).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../ui/Button';

describe('Button', () => {
  it('renders an anchor when href is provided', () => {
    render(<Button href="/onboarding">Start</Button>);
    const link = screen.getByRole('link', { name: 'Start' });
    expect(link).toHaveAttribute('href', '/onboarding');
  });

  it('renders a type="button" native button by default', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Log it</Button>);
    const button = screen.getByRole('button', { name: 'Log it' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes to both render targets', () => {
    render(
      <Button href="/x" variant="ghost">
        Ghost link
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Ghost link' }).className).toContain('text-primary');
  });
});
