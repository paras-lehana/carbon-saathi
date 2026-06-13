/**
 * DonutChart: a dependency-free SVG donut. The visual is decorative; the
 * accessible representation is a visually-hidden table with exact values,
 * which serves screen readers better than any aria-label sentence could.
 */

export interface DonutSegment {
  label: string;
  value: number;
  /** Any CSS color, including var(--chart-*) tokens for theme reactivity. */
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Caption for the data table and accessible name of the figure. */
  title: string;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSublabel?: string;
  className?: string;
}

export function DonutChart({
  segments,
  title,
  size = 180,
  thickness = 22,
  centerLabel,
  centerSublabel,
  className,
}: DonutChartProps): React.JSX.Element {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Each segment is a full circle with a dash sized to its share, rotated to
  // start where the previous one ended — no path-arc math needed.
  let cumulative = 0;
  const arcs = segments.map((segment) => {
    const share = total > 0 ? Math.max(0, segment.value) / total : 0;
    const arc = {
      ...segment,
      dash: share * circumference,
      offset: cumulative * circumference,
      pct: Math.round(share * 100),
    };
    cumulative += share;
    return arc;
  });

  return (
    <figure className={['m-0 inline-block', className].filter(Boolean).join(' ')}>
      <div className="relative inline-flex items-center justify-center">
        <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={thickness}
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={-arc.offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ))}
        </svg>
        {centerLabel !== undefined && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="font-display text-lg font-bold">{centerLabel}</span>
            {centerSublabel !== undefined && (
              <span className="text-xs text-ink-muted">{centerSublabel}</span>
            )}
          </div>
        )}
      </div>
      {/* Exact data for assistive tech — sr-only keeps it out of the visual flow. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Value</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {arcs.map((arc) => (
            <tr key={arc.label}>
              <th scope="row">{arc.label}</th>
              <td>{Math.round(arc.value)}</td>
              <td>{arc.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
