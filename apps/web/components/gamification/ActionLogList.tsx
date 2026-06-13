/**
 * ActionLogList: the shared action-log rows (label, ×quantity, points tag)
 * rendered by the dashboard's recent-activity card and the actions page's
 * "Today" column. Pure presentation — callers own fetching, the empty-state
 * copy, and which entries (today vs recent) appear.
 */
import type { ActionDefinition, ActionLogEntry } from '@carbon-saathi/core';

// Built once per module — Intl construction is expensive (lib/format pattern).
const DAY_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

/** Catalog lookup with the raw id as fallback so unknown logs still render. */
export function labelForAction(actions: ActionDefinition[], actionId: string): string {
  return actions.find((action) => action.id === actionId)?.label ?? actionId;
}

export interface ActionLogListProps {
  entries: ActionLogEntry[];
  /** Catalog that resolves labels — an empty array degrades to raw ids. */
  actions: ActionDefinition[];
  /** Prefix each points tag with the log date (the dashboard feed variant). */
  showDate?: boolean;
  /** Extra list classes (e.g. the actions page's mt-3 spacing). */
  className?: string;
}

export function ActionLogList({
  entries,
  actions,
  showDate = false,
  className,
}: ActionLogListProps): React.JSX.Element {
  return (
    // role restores list semantics that list-none strips in some browsers.
    <ul
      role="list"
      className={['m-0 flex list-none flex-col gap-2 p-0', className].filter(Boolean).join(' ')}
    >
      {entries.map((entry, index) => (
        // Index breaks ties: the same action logged twice in one server tick
        // would otherwise collide on timestamp + id.
        <li
          key={`${entry.loggedAtISO}-${entry.actionId}-${index}`}
          className="flex items-baseline justify-between gap-2 text-sm"
        >
          <span>
            {labelForAction(actions, entry.actionId)}
            {entry.quantity > 1 ? ` ×${entry.quantity}` : ''}
          </span>
          <span className="shrink-0 text-xs text-ink-muted">
            {showDate
              ? `${DAY_FORMATTER.format(new Date(entry.loggedAtISO))} · +${entry.points} pts`
              : `+${entry.points} pts`}
          </span>
        </li>
      ))}
    </ul>
  );
}
