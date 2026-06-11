/**
 * Metadata shell for /assistant — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Saathi Chat',
  description:
    'A Gemini-powered climate coach grounded in your own calculator numbers — schemes, EVs and everyday actions for India.',
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
