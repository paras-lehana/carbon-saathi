/**
 * Metadata shell for /dashboard — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Your carbon footprint at a glance: category breakdown, points, streak, weekly missions and quick action logging.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
