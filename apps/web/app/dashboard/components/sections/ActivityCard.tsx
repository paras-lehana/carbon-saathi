/**
 * Recent-activity section of the dashboard bento: the shared ActionLogList
 * in its dated variant, or a first-log nudge when nothing is logged yet.
 */
import type { ActionDefinition, ActionLogEntry } from '@carbon-saathi/core';
import { ActionLogList } from '@/components/gamification/ActionLogList';
import { SectionCard } from '@/components/ui/SectionCard';

export interface ActivityCardProps {
  entries: ActionLogEntry[];
  /** Catalog that resolves entry labels — empty degrades to raw ids. */
  actions: ActionDefinition[];
}

export function ActivityCard({ entries, actions }: ActivityCardProps): React.JSX.Element {
  return (
    <SectionCard id="dash-activity-heading" title="Recent activity" className="bento-tall">
      {entries.length === 0 ? (
        <p className="m-0 text-sm text-ink-muted">
          Nothing logged yet — your first quick log will show up here.
        </p>
      ) : (
        <ActionLogList entries={entries} actions={actions} showDate />
      )}
    </SectionCard>
  );
}
