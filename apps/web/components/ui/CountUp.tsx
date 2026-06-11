/**
 * CountUp: animates a number from its previous value to the target with
 * ease-out. Reduced-motion users (and screen readers, always) get the final
 * value instantly — the animation is purely decorative.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface CountUpProps {
  value: number;
  durationMs?: number;
  /** Defaults to en-IN integer formatting; pass lib/format helpers for units. */
  format?: (value: number) => string;
  className?: string;
}

const DEFAULT_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function CountUp({
  value,
  durationMs = 800, // long enough to feel alive, short enough not to delay reading
  format,
  className,
}: CountUpProps): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    previousRef.current = value;
    if (reduceMotion === true || from === value) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduceMotion]);

  const render = format ?? ((n: number) => DEFAULT_FORMAT.format(n));

  return (
    // AT reads only the final value (sr-only); the animated intermediate
    // values are hidden so screen readers never announce a number blur.
    <span className={className}>
      <span aria-hidden="true">{render(display)}</span>
      <span className="sr-only">{render(value)}</span>
    </span>
  );
}
