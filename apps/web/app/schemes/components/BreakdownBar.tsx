/**
 * BreakdownBar: a stacked horizontal bar splitting one rupee total into
 * labelled segments (subsidy vs your cost, central/state/farmer shares).
 * The bar itself is decorative — the legend carries exact amounts for all.
 */
import { formatInr } from '../../../lib/format';

export interface BreakdownSegment {
  label: string;
  amountInr: number;
  /** Any CSS color, including var(--*) tokens for theme reactivity. */
  color: string;
}

export interface BreakdownBarProps {
  /** Accessible name of the figure, e.g. "System cost split". */
  title: string;
  segments: BreakdownSegment[];
  className?: string;
}

const MIN_SEGMENT_PCT = 2; // tiny shares stay visible instead of vanishing

export function BreakdownBar({ title, segments, className }: BreakdownBarProps): React.JSX.Element {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.amountInr), 0);

  return (
    <figure className={['m-0', className].filter(Boolean).join(' ')}>
      <div aria-hidden="true" className="flex h-7 w-full overflow-hidden rounded-pill border border-line">
        {total > 0 &&
          segments.map((segment) => (
            <div
              key={segment.label}
              style={{
                width: `${Math.max(MIN_SEGMENT_PCT, (Math.max(0, segment.amountInr) / total) * 100)}%`,
                background: segment.color,
              }}
            />
          ))}
      </div>
      <figcaption className="mt-2">
        <span className="sr-only">{title} — total {formatInr(total)}.</span>
        <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm border border-line"
                style={{ background: segment.color }}
              />
              <span>{segment.label}</span>
              <span className="font-semibold">{formatInr(segment.amountInr)}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
