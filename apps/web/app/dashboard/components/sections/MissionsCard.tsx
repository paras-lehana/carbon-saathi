/**
 * Weekly missions section of the dashboard bento: one MissionCard per active
 * mission. Display only — progress comes from core's evaluateMissions via
 * the dashboard payload.
 */
import type { MissionProgress } from '@carbon-saathi/core';
import { MissionCard } from '@/components/gamification/MissionCard';
import { SectionCard } from '@/components/ui/SectionCard';

export interface MissionsCardProps {
  missions: MissionProgress[];
}

export function MissionsCard({ missions }: MissionsCardProps): React.JSX.Element {
  return (
    <SectionCard
      id="dash-missions-heading"
      title="Weekly missions"
      className="bento-tall"
      contentClassName="flex flex-col gap-3"
    >
      {missions.map((mission) => (
        <MissionCard key={mission.missionId} mission={mission} />
      ))}
    </SectionCard>
  );
}
