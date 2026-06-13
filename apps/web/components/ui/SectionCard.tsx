/**
 * SectionCard: the standard labelled card — a GlassCard section whose
 * accessible name is its own h2, the scaffold previously repeated across the
 * dashboard, onboarding and scheme panels. The optional `action` slot puts a
 * control beside the heading (the dashboard's "Retake quiz" layout).
 */
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

/** Canonical section-heading classes — for the rare bare h2 outside this card. */
export const HEADING_CLASS = 'm-0 mb-3 font-display text-lg font-bold';

// With an action beside it the row wrapper owns the bottom margin instead.
const ACTION_ROW_HEADING_CLASS = 'm-0 font-display text-lg font-bold';

export interface SectionCardProps {
  /** Heading id — doubles as the card's aria-labelledby target. */
  id: string;
  title: ReactNode;
  /** Landmark element; `aside` for complementary cards like a side column. */
  as?: 'section' | 'aside';
  /** Control rendered to the right of the heading (e.g. a small Button). */
  action?: ReactNode;
  className?: string;
  /** Replaces the default heading classes where a call site spaces differently. */
  headingClassName?: string;
  /** When set, children render inside a div carrying these layout classes. */
  contentClassName?: string;
  children: ReactNode;
}

export function SectionCard({
  id,
  title,
  as = 'section',
  action,
  className,
  headingClassName,
  contentClassName,
  children,
}: SectionCardProps): React.JSX.Element {
  const hasAction = action !== undefined && action !== null;
  const heading = (
    <h2
      id={id}
      className={headingClassName ?? (hasAction ? ACTION_ROW_HEADING_CLASS : HEADING_CLASS)}
    >
      {title}
    </h2>
  );

  return (
    <GlassCard as={as} className={className} aria-labelledby={id}>
      {hasAction ? (
        <div className="mb-4 flex items-start justify-between gap-4">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {contentClassName !== undefined ? (
        <div className={contentClassName}>{children}</div>
      ) : (
        children
      )}
    </GlassCard>
  );
}
