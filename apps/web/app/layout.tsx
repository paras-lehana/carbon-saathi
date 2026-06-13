/**
 * Root layout: pre-paint theme bootstrap, display/body fonts, metadata and
 * the persistent chrome (skip link, header, footer) around every page.
 * State providers wrap the whole body so the header can read contexts too.
 */
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { SkipLink } from '../components/layout/SkipLink';
import { Providers } from '../lib/contexts';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Carbon Saathi', template: '%s · Carbon Saathi' },
  description:
    'Measure, understand and reduce your carbon footprint with everyday actions, ' +
    'Indian scheme guidance (PM Surya Ghar, PM KUSUM), EV fit coaching and a ' +
    'Gemini-powered climate coach.',
};

// Applies the persisted theme before first paint so dark-mode users never see
// a light flash. Reads the JSON-encoded value written by lib/storage.ts and
// falls back to the OS preference. Security: a static constant — no user
// input ever reaches this dangerouslySetInnerHTML.
const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var r=localStorage.getItem('carbon-saathi:theme');var t=r?JSON.parse(r):null;if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    // suppressHydrationWarning: data-theme is set client-side pre-paint, so
    // the server-rendered <html> attributes intentionally differ.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col font-body">
        <Providers>
          <SkipLink />
          <Header />
          <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
