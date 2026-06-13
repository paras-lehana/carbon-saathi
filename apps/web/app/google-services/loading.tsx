/**
 * Route-segment skeleton for /google-services, shown while the client bundle
 * streams in. CardSkeleton owns the polite status announcement; the grid
 * mirrors the service-card layout the page renders.
 */
import { CardSkeleton } from '@/components/ui/CardSkeleton';

export default function GoogleServicesLoading(): React.JSX.Element {
  return (
    <CardSkeleton
      count={6}
      heightClass="h-56"
      label="Loading the Google services evidence"
      containerClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    />
  );
}
