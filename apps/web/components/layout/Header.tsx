/**
 * Header: sticky glass navigation with the wordmark, primary page links,
 * theme toggle and an accessible mobile disclosure menu. Owns no app state —
 * active-link highlighting comes from the router pathname.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/actions', label: 'Actions' },
  { href: '/initiatives', label: 'Initiatives' },
  { href: '/schemes', label: 'Schemes' },
  { href: '/ev-coach', label: 'EV Coach' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/leaderboard', label: 'Leaderboard' },
] as const;

function LeafLogo(): React.JSX.Element {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M23 5C14 5 7 9 6 17c-.4 3 .5 5.5 1 6 4-7 9-10 13-11.5C15 14 10.5 18 8.5 22.5c1.5.6 4 .8 6.5 0C22 20.5 23.5 11 23 5Z"
        fill="var(--primary)"
      />
      <path d="M23 5c-5 6-10 10-14.5 17.5" stroke="var(--accent)" strokeWidth="1.2" />
    </svg>
  );
}

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClasses = (href: string): string =>
    `rounded-control px-3 py-2 text-sm font-semibold no-underline transition-colors ${
      pathname === href ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-primary-soft'
    }`;

  return (
    <header className="glass-card sticky top-0 z-50 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-ink no-underline"
        >
          <LeafLogo />
          Carbon Saathi
        </Link>

        {/* Desktop nav — a real list so AT reports "7 items" upfront. */}
        <nav aria-label="Primary" className="hidden md:block">
          <ul role="list" className="m-0 flex list-none items-center gap-1 p-0">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={linkClasses(link.href)}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Mobile disclosure trigger — aria-expanded + controls wire the
              menu state for assistive tech. */}
          <button
            type="button"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-control border border-line bg-surface md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className="h-0.5 w-5 rounded bg-ink" />
            <span aria-hidden="true" className="h-0.5 w-5 rounded bg-ink" />
            <span aria-hidden="true" className="h-0.5 w-5 rounded bg-ink" />
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      <nav
        id="mobile-nav"
        aria-label="Primary mobile"
        hidden={!menuOpen}
        className="border-t border-line px-4 pb-3 md:hidden"
      >
        <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0 pt-2">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block ${linkClasses(link.href)}`}
                aria-current={pathname === link.href ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
