/**
 * Metadata shell for /onboarding — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'A two-minute survey that turns your bills and habits into a carbon footprint.',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
