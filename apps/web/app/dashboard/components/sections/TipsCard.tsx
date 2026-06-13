/**
 * Saathi-tips section of the dashboard bento: the baseline's generated tips.
 * Renders nothing when no baseline produced any — the grid simply tightens.
 */
import { SectionCard } from '@/components/ui/SectionCard';
import { TipsList } from '@/components/ui/TipsList';

export interface TipsCardProps {
  tips: string[];
}

export function TipsCard({ tips }: TipsCardProps): React.JSX.Element | null {
  if (tips.length === 0) return null;

  return (
    <SectionCard id="dash-tips-heading" title="💡 Saathi tips for you" className="bento-wide">
      <TipsList tips={tips} />
    </SectionCard>
  );
}
