/**
 * Button: the only interactive-trigger primitive. Renders a next/link anchor
 * when `href` is given (navigation) or a native button otherwise (actions) —
 * one visual system, correct semantics for each.
 */
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type LinkButtonProps = CommonProps & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href' | 'className' | 'children'
  >;

type NativeButtonProps = CommonProps & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children'
  >;

export type ButtonProps = LinkButtonProps | NativeButtonProps;

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-control font-display font-semibold transition-colors no-underline';

// text-on-primary / text-bg invert with the theme: dark mode's bright fills
// need dark ink (white on #3ecf8e is ~2:1 — a real WCAG failure axe caught).
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  ghost: 'bg-transparent text-primary border border-line hover:bg-primary-soft',
  danger: 'bg-error text-bg hover:opacity-90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

function composeClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className: string | undefined,
): string {
  return [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(' ');
}

export function Button(props: ButtonProps): React.JSX.Element {
  if (props.href !== undefined) {
    const { href, variant = 'primary', size = 'md', className, children, ...anchorRest } = props;
    return (
      <Link href={href} className={composeClasses(variant, size, className)} {...anchorRest}>
        {children}
      </Link>
    );
  }

  // href stays in buttonRest typed as `undefined` — React drops undefined props.
  const { variant = 'primary', size = 'md', className, children, ...buttonRest } = props;
  return (
    // Explicit type="button" default (overridable via spread) — inside forms
    // the implicit "submit" causes accidental submissions.
    <button type="button" {...buttonRest} className={composeClasses(variant, size, className)}>
      {children}
    </button>
  );
}
