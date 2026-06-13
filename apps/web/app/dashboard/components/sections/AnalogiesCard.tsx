/**
 * Impact-analogies section of the dashboard bento: total CO₂ saved retold as
 * trees, kilometres not driven and phone charges (core's impactAnalogies).
 */
import type { ImpactAnalogies } from '@carbon-saathi/core';
import { CountUp } from '@/components/ui/CountUp';
import { SectionCard } from '@/components/ui/SectionCard';

export interface AnalogiesCardProps {
  analogies: ImpactAnalogies;
}

export function AnalogiesCard({ analogies }: AnalogiesCardProps): React.JSX.Element {
  return (
    <SectionCard id="dash-impact-heading" title="Your impact so far">
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden="true">🌳</span>
          <CountUp
            value={analogies.treesEquivalent}
            format={(n) => n.toFixed(1)}
            className="font-display font-bold"
          />
          <span>trees&rsquo; CO₂ absorption for a year</span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">🚗</span>
          <CountUp value={analogies.kmNotDriven} className="font-display font-bold" />
          <span>km of petrol driving avoided</span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">🔋</span>
          <CountUp value={analogies.phoneCharges} className="font-display font-bold" />
          <span>phone charges of electricity</span>
        </li>
      </ul>
    </SectionCard>
  );
}
