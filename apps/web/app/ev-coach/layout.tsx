/**
 * Metadata shell for /ev-coach — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EV Coach',
  description:
    'Should your next vehicle be electric? A four-question check plus a per-mode commute emissions and cost comparison.',
};

export default function EvCoachLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
