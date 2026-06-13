/**
 * Shared numeric helpers for the domain layer. Owns the rounding policy so
 * every calculator and route reports CO2 and money figures at the same
 * precision instead of re-implementing it locally.
 */

/**
 * Rounds to two decimal places — the precision contract for user-facing CO2
 * (kg) and currency (₹) figures across the product.
 *
 * @example
 * round2(3.14159); // 3.14
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
