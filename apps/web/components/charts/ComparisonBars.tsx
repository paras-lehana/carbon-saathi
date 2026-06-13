/**
 * ComparisonBars: horizontal SVG bars comparing the user's annual footprint
 * with the Indian average and urban-affluent benchmarks. Pure SVG with
 * visible value labels; an sr-only summary carries the comparison for AT.
 */
import { EMISSION_FACTORS } from '@carbon-saathi/core';
import { formatKgCo2 } from '@/lib/format';

export interface ComparisonBarsProps {
  yourKg: number;
  /** Both benchmarks default to core's EMISSION_FACTORS values (kg CO₂e/yr). */
  indiaAverageKg?: number;
  urbanAffluentKg?: number;
  className?: string;
}

const BAR_HEIGHT = 28;
const ROW_GAP = 16;
const LABEL_WIDTH = 130;
const CHART_WIDTH = 520;
// Width reserved right of the longest bar so its value label never clips.
const VALUE_LABEL_WIDTH = 90;
// Breathing room between a bar and the text on either side of it.
const TEXT_GAP = 8;

export function ComparisonBars({
  yourKg,
  indiaAverageKg = EMISSION_FACTORS.indiaPerCapitaAnnual.value,
  urbanAffluentKg = EMISSION_FACTORS.indiaUrbanAffluentAnnual.value,
  className,
}: ComparisonBarsProps): React.JSX.Element {
  const rows = [
    { label: 'You', value: Math.max(0, yourKg), color: 'var(--primary)' },
    { label: 'India average', value: indiaAverageKg, color: 'var(--info)' },
    { label: 'Urban affluent', value: urbanAffluentKg, color: 'var(--accent)' },
  ];
  const maxValue = Math.max(...rows.map((row) => row.value), 1); // guard ÷0
  const barAreaWidth = CHART_WIDTH - LABEL_WIDTH - VALUE_LABEL_WIDTH;
  const height = rows.length * (BAR_HEIGHT + ROW_GAP);

  return (
    <figure className={['m-0', className].filter(Boolean).join(' ')}>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="h-auto w-full max-w-xl"
      >
        {rows.map((row, index) => {
          const y = index * (BAR_HEIGHT + ROW_GAP);
          const width = (row.value / maxValue) * barAreaWidth;
          return (
            <g key={row.label}>
              <text
                x={LABEL_WIDTH - TEXT_GAP}
                y={y + BAR_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="central"
                fill="var(--text)"
                fontSize="13"
              >
                {row.label}
              </text>
              <rect
                x={LABEL_WIDTH}
                y={y}
                width={Math.max(2, width)}
                height={BAR_HEIGHT}
                rx="6"
                fill={row.color}
              />
              <text
                x={LABEL_WIDTH + Math.max(2, width) + TEXT_GAP}
                y={y + BAR_HEIGHT / 2}
                dominantBaseline="central"
                fill="var(--text)"
                fontSize="13"
                fontWeight="600"
              >
                {formatKgCo2(row.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        Annual carbon footprint comparison: you {formatKgCo2(yourKg)}, India average{' '}
        {formatKgCo2(indiaAverageKg)}, urban affluent {formatKgCo2(urbanAffluentKg)}.
      </figcaption>
    </figure>
  );
}
