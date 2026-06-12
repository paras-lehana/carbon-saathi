/**
 * Shared framer-motion presets, all gated by useReducedMotion: an empty
 * MotionProps object renders fully static, so reduced-motion users get the
 * same content with zero movement. One home for the entrance treatment —
 * previously copy-pasted across six components.
 */
'use client';

import { useReducedMotion, type MotionProps } from 'framer-motion';

/** Mount entrance: fade in while rising 16px. */
export function useFadeUp(): MotionProps {
  const reduceMotion = useReducedMotion();
  return reduceMotion === true
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
}

/** Scroll entrance: like useFadeUp but fires once when scrolled into view. */
export function useFadeUpInView(): MotionProps {
  const reduceMotion = useReducedMotion();
  return reduceMotion === true
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.5 },
      };
}
