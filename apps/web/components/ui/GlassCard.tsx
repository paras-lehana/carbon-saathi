/**
 * GlassCard: the default container of the design language — a thin wrapper
 * over the .glass-card token utility so semantics stay configurable
 * (section/article/div) while the visual treatment stays centralised.
 */
import type { ReactNode } from 'react';

type GlassCardElement = 'div' | 'section' | 'article' | 'aside' | 'li';

export interface GlassCardProps {
  as?: GlassCardElement;
  className?: string;
  children: ReactNode;
  'aria-labelledby'?: string;
}

export function GlassCard({
  as: Element = 'div',
  className,
  children,
  ...rest
}: GlassCardProps): React.JSX.Element {
  return (
    <Element className={['glass-card p-6', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Element>
  );
}
