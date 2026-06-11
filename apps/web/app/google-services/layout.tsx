/**
 * Metadata shell for /google-services — the page is a client component, so
 * the document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Google Services',
  description:
    'Evidence page: every Google integration in Carbon Saathi with its status, code paths, env var names and fallback mode.',
};

export default function GoogleServicesLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
