/**
 * Metadata shell for /leaderboard — the page is a client component, so the
 * document title (WCAG 2.4.2) is owned by this server layout.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description:
    'See where your climate points rank among fellow saathis, and join a circle with a six-character code.',
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
