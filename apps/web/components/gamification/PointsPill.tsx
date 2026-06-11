/**
 * PointsPill: compact points readout used in headers and action feedback.
 * Animates value changes via CountUp (instant under reduced motion).
 */
import { CountUp } from '../ui/CountUp';

export interface PointsPillProps {
  points: number;
  className?: string;
}

export function PointsPill({ points, className }: PointsPillProps): React.JSX.Element {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-3 py-1 font-display text-sm font-bold text-primary',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true">🍃</span>
      <CountUp value={points} />
      <span>pts</span>
    </span>
  );
}
