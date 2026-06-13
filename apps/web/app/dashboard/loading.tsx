/**
 * Route-segment skeleton for /dashboard, shown while the client bundle
 * streams in. CardSkeleton owns the polite status announcement; the pulsing
 * tiles are purely decorative.
 */
import { CardSkeleton } from '@/components/ui/CardSkeleton';

export default function DashboardLoading(): React.JSX.Element {
  return <CardSkeleton count={6} label="Loading your dashboard" containerClassName="bento-grid" />;
}
