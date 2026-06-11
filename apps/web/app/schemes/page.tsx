/**
 * Schemes route: PM Surya Ghar and PM KUSUM calculators behind accessible
 * tabs. This page owns only the shell — each panel owns its own form,
 * result rendering and estimates disclaimer.
 */
'use client';

import { Tabs } from '../../components/ui/Tabs';
import { KusumPanel } from './components/KusumPanel';
import { SuryaGharPanel } from './components/SuryaGharPanel';

export default function SchemesPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Government schemes, decoded
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Real subsidy money is on the table — up to ₹78,000 for rooftop solar and around 60%
          of a solar pump. Run your own numbers in seconds.
        </p>
      </div>

      <Tabs
        label="Government schemes"
        items={[
          { id: 'surya-ghar', label: 'PM Surya Ghar', content: <SuryaGharPanel /> },
          { id: 'kusum', label: 'PM KUSUM', content: <KusumPanel /> },
        ]}
      />

      <p className="m-0 text-xs text-ink-muted">
        Carbon Saathi is not affiliated with the Government of India. Figures are indicative
        estimates — always verify with your DISCOM, state agency or MNRE before applying.
      </p>
    </div>
  );
}
