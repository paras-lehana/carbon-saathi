/**
 * Baseline stat tiles of the dashboard bento: annual footprint and the
 * vs-India-average ratio. A fragment of two StatCards so each stays its own
 * grid cell; the grid renders this only when a baseline exists.
 */
import type { BaselineFootprintResult } from '@carbon-saathi/core';
import { CountUp } from '@/components/ui/CountUp';
import { StatCard } from '@/components/ui/StatCard';
import { formatKgCo2 } from '@/lib/format';

export interface StatsCardProps {
  baseline: BaselineFootprintResult;
}

export function StatsCard({ baseline }: StatsCardProps): React.JSX.Element {
  return (
    <>
      <StatCard
        label="your annual footprint"
        value={<CountUp value={baseline.totalKgAnnual} format={formatKgCo2} />}
        sublabel="per person, estimated"
        icon="🌍"
      />
      <StatCard
        label="of the Indian average"
        value={`${baseline.vsIndiaAverage.toFixed(1)}×`}
        sublabel="India ≈ 2 t CO₂e per person each year"
        icon="🇮🇳"
      />
    </>
  );
}
