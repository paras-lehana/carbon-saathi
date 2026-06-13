/**
 * Quick-log section of the dashboard bento: one-tap buttons for the
 * highest-impact catalog actions. Selection (top four by CO₂ saved) lives
 * here; the grid owns the actual log call, toasts and refresh.
 */
import type { ActionDefinition } from '@carbon-saathi/core';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';

const QUICK_ACTION_COUNT = 4;

export interface QuickLogCardProps {
  actions: ActionDefinition[];
  /** Action currently being logged — disables the row while in flight. */
  loggingId: string | null;
  onLog: (action: ActionDefinition) => void;
}

export function QuickLogCard({
  actions,
  loggingId,
  onLog,
}: QuickLogCardProps): React.JSX.Element | null {
  // "Top" actions = biggest CO2 savings per log — the shortest path to points.
  const quickActions = [...actions]
    .sort((a, b) => b.co2SavedKg - a.co2SavedKg)
    .slice(0, QUICK_ACTION_COUNT);

  // Catalog fetch failed or is empty — the dashboard degrades gracefully.
  if (quickActions.length === 0) return null;

  return (
    <SectionCard
      id="dash-quicklog-heading"
      title="Quick log"
      className="bento-wide"
      // The intro line sits tight under the heading; mb-3 moves onto it.
      headingClassName="m-0 mb-1 font-display text-lg font-bold"
    >
      <p className="m-0 mb-3 text-xs text-ink-muted">
        One tap logs one unit of your highest-impact actions.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            data-testid={`action-log-${action.id}`}
            variant="ghost"
            size="sm"
            disabled={loggingId !== null}
            onClick={() => onLog(action)}
          >
            {/* flex-1 pushes the impact tag right inside Button's centered flex row */}
            <span className="flex-1 text-left">
              {loggingId === action.id ? 'Logging…' : action.label}
            </span>
            <span className="text-xs text-ink-muted">+{action.co2SavedKg} kg</span>
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}
