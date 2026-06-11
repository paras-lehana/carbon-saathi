/**
 * StatCard: a labelled headline number (stat strips, dashboard tiles).
 * Pure presentation — formatting is the caller's job (see lib/format.ts).
 */
import type { ReactNode } from 'react';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  className,
}: StatCardProps): React.JSX.Element {
  return (
    <div className={['glass-card flex items-start gap-4 p-6', className].filter(Boolean).join(' ')}>
      {icon !== undefined && (
        <span aria-hidden="true" className="text-2xl leading-none">
          {icon}
        </span>
      )}
      <div>
        {/* Value before label in the DOM so the number is what scanning eyes
            and screen readers hit first. */}
        <p className="m-0 font-display text-[length:var(--text-xl)] font-bold text-primary">
          {value}
        </p>
        <p className="m-0 text-sm text-ink-muted">{label}</p>
        {sublabel !== undefined && <p className="m-0 mt-1 text-xs text-ink-muted">{sublabel}</p>}
      </div>
    </div>
  );
}
