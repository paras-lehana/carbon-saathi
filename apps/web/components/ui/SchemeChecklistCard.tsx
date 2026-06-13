/**
 * SchemeChecklistCard: the numbered how-to-apply checklist card shared by the
 * scheme result panels. The visual step numbers stay aria-hidden — the <ol>
 * already conveys order to screen readers. Children render below the list
 * (typically a SchemePortalLink footer).
 */
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

export interface SchemeChecklistCardProps {
  title: string;
  steps: ReadonlyArray<string>;
  /** Footer content below the list — typically a SchemePortalLink. */
  children?: ReactNode;
}

export function SchemeChecklistCard({
  title,
  steps,
  children,
}: SchemeChecklistCardProps): React.JSX.Element {
  return (
    <GlassCard as="div" className="mt-4">
      <h3 className="m-0 mb-3 font-display text-base font-bold">{title}</h3>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
            >
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {children}
    </GlassCard>
  );
}
