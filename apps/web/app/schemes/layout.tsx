/**
 * Metadata shell for /schemes — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Schemes',
  description:
    'PM Surya Ghar rooftop solar and PM KUSUM solar pump calculators: subsidy, payback and CO₂ avoided from your own numbers.',
};

export default function SchemesLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
