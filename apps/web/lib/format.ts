/**
 * Display formatting helpers: CO2 mass (kg → tonnes), Indian-locale rupees
 * and numbers. Pure functions — safe in server and client components alike.
 */

const KG_PER_TONNE = 1000;

// Efficiency: Intl formatters are expensive to construct — build once per module.
const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0, // scheme amounts are whole rupees; paise add noise
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-IN');

/** "850 kg CO₂e" below a tonne, "2.4 t CO₂e" above — 1 decimal for tonnes. */
export function formatKgCo2(kg: number): string {
  if (Math.abs(kg) >= KG_PER_TONNE) {
    return `${(kg / KG_PER_TONNE).toFixed(1)} t CO₂e`;
  }
  return `${NUMBER_FORMATTER.format(Math.round(kg))} kg CO₂e`;
}

/** "₹78,000" — Indian digit grouping (lakh/crore boundaries). */
export function formatInr(amount: number): string {
  return INR_FORMATTER.format(amount);
}

/** "12,500" with en-IN grouping; rounds to integer for display. */
export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(Math.round(value));
}

/** Compact rupees for dense cards: "₹1.2L" above a lakh, "₹55k" above a thousand. */
export function formatInrCompact(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
}

/** Compact mass without the CO₂e suffix for tight layouts: "1.1 t" / "320 kg". */
export function formatKgCompact(kg: number): string {
  if (Math.abs(kg) >= KG_PER_TONNE) return `${(kg / KG_PER_TONNE).toFixed(1)} t`;
  return `${NUMBER_FORMATTER.format(Math.round(kg))} kg`;
}
