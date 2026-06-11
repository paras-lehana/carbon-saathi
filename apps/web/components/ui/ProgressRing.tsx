/**
 * ProgressRing: an SVG percentage ring with an animated stroke. Exposed to
 * assistive tech as a single image with a readable label; the visual centre
 * slot is decorative. Animation rides CSS transitions, so the global
 * prefers-reduced-motion kill-switch neutralises it automatically.
 */
import type { ReactNode } from 'react';

export interface ProgressRingProps {
  /** 0–100; values outside the range are clamped, never thrown. */
  pct: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({
  pct,
  label,
  size = 120,
  strokeWidth = 10,
  children,
  className,
}: ProgressRingProps): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, pct));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%`}
      className={['relative inline-flex items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Start at 12 o'clock instead of SVG's default 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {children !== undefined && (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
