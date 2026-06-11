/**
 * Metadata shell for /initiatives — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Initiatives',
  description:
    "India's individual climate action hub: 25+ sourced initiatives across Mission LiFE's themes — home energy, mobility, food, waste, water, finance and community.",
};

export default function InitiativesLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
