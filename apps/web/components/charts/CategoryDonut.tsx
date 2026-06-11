/**
 * CategoryDonut: footprint-by-category donut with a colour legend. Owns the
 * category→label/colour mapping; the underlying SVG + accessible table live
 * in ui/DonutChart.
 */
import type { FootprintByCategory, FootprintCategory } from '@carbon-saathi/core';
import { formatKgCo2 } from '../../lib/format';
import { DonutChart } from '../ui/DonutChart';

// Theme-reactive chart tokens defined in app/globals.css.
const CATEGORY_META: Record<FootprintCategory, { label: string; color: string }> = {
  homeEnergy: { label: 'Home energy', color: 'var(--chart-energy)' },
  transport: { label: 'Transport', color: 'var(--chart-transport)' },
  food: { label: 'Food', color: 'var(--chart-food)' },
  shopping: { label: 'Shopping', color: 'var(--chart-shopping)' },
};

const CATEGORY_ORDER: FootprintCategory[] = ['homeEnergy', 'transport', 'food', 'shopping'];

export interface CategoryDonutProps {
  byCategory: FootprintByCategory;
  totalKgAnnual: number;
  className?: string;
}

export function CategoryDonut({
  byCategory,
  totalKgAnnual,
  className,
}: CategoryDonutProps): React.JSX.Element {
  const segments = CATEGORY_ORDER.map((category) => ({
    label: CATEGORY_META[category].label,
    value: byCategory[category],
    color: CATEGORY_META[category].color,
  }));

  return (
    <div className={['flex flex-wrap items-center gap-6', className].filter(Boolean).join(' ')}>
      <DonutChart
        segments={segments}
        title="Annual footprint by category (kg CO₂e)"
        centerLabel={formatKgCo2(totalKgAnnual)}
        centerSublabel="per year"
      />
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {CATEGORY_ORDER.map((category) => (
          <li key={category} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: CATEGORY_META[category].color }}
            />
            <span>{CATEGORY_META[category].label}</span>
            <span className="ml-auto pl-4 font-semibold">
              {formatKgCo2(byCategory[category])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
