/**
 * Metadata shell for /actions — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Actions',
  description:
    'Log everyday climate actions — metro days, veg days, AC tweaks — and earn points for every kilogram of CO₂ you save.',
};

export default function ActionsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
