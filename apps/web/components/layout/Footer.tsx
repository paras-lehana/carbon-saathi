/**
 * Footer: tagline, secondary navigation (including the Google-services
 * evidence page) and the scheme non-affiliation disclaimer. Static server
 * component — no client JS shipped for this.
 */
import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/actions', label: 'Actions' },
  { href: '/schemes', label: 'Schemes' },
  { href: '/ev-coach', label: 'EV Coach' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/google-services', label: 'Google Services' },
  { href: '/about', label: 'About & Privacy' },
] as const;

export function Footer(): React.JSX.Element {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-sm">
            <p className="m-0 font-display text-lg font-bold">Carbon Saathi</p>
            <p className="m-0 mt-1 text-sm text-ink-muted">
              Apna carbon, apne haath — your climate saathi for everyday India.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-2 p-0 sm:grid-cols-4">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted no-underline hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="m-0 text-xs text-ink-muted">
          Carbon Saathi is an independent project and is not affiliated with or endorsed by the
          Government of India. PM Surya Ghar and PM KUSUM figures are indicative estimates — always
          verify on the official portals before applying. Estimates are labelled as such throughout.
        </p>
      </div>
    </footer>
  );
}
