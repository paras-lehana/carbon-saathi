/**
 * About page: mission, the privacy pledge (local-first, no PII), the scheme
 * disclaimer and a roadmap pointer. Fully static server component — the only
 * page besides the footer where the data-handling promises live in prose.
 */
import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

export const metadata: Metadata = {
  title: 'About & Privacy',
  description:
    'Why Carbon Saathi exists, what happens to your data (it stays with you), and what the scheme numbers do and do not promise.',
};

// Per-service data usage table for the privacy pledge — mirrors the
// service catalog so the prose can never overclaim what the code does.
const DATA_USAGE: ReadonlyArray<{ service: string; usage: string }> = [
  {
    service: 'Gemini API (Saathi Chat)',
    usage:
      'Receives only the question you type plus the calculator numbers needed to answer it — never your name, never your device identity.',
  },
  {
    service: 'Google Maps Distance Matrix',
    usage:
      'Receives an origin and destination only if you type them on the commute comparison; distance-only estimates never leave your browser tab.',
  },
  {
    service: 'Carbon Saathi API',
    usage:
      'Holds your profile in memory only (it vanishes on restart); your browser keeps the durable copy in localStorage and re-seeds the server.',
  },
];

export default function AboutPage(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          About Carbon Saathi
        </h1>
        <p className="mt-2 text-ink-muted">
          Apna carbon, apne haath — a climate coach built for everyday India.
        </p>
      </div>

      <section aria-labelledby="about-mission-heading">
        <h2 id="about-mission-heading" className="font-display text-lg font-bold">
          🇮🇳 Our mission
        </h2>
        <p className="mt-2">
          Most carbon calculators are written for other countries — other grids, other fuels, other
          subsidies. Carbon Saathi starts from Indian reality: LPG cylinders and the CEA grid
          factor, metro commutes and two-wheelers, PM Surya Ghar rooftop subsidies and PM KUSUM
          solar pumps. The goal is simple: turn your bills and habits into one honest number, then
          turn that number into small daily actions and real scheme money.
        </p>
        <p className="mt-2">
          India&rsquo;s per-person footprint is still around 2 tonnes a year — far below the global
          average — but it is rising fastest in urban households. Acting early, while habits and
          purchases are still being formed, is the cheapest climate action there is.
        </p>
      </section>

      <GlassCard as="section" aria-labelledby="about-privacy-heading">
        <h2 id="about-privacy-heading" className="m-0 font-display text-lg font-bold">
          🔒 Privacy pledge
        </h2>
        <ul role="list" className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-primary">
              ✓
            </span>
            <span>
              <strong>Local-first.</strong> Your profile, footprint and action log live in your
              browser&rsquo;s localStorage. There is no account database to leak.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-primary">
              ✓
            </span>
            <span>
              <strong>No PII required.</strong> No sign-up, no phone number, no email. A display
              name for the leaderboard is optional and can be anything you like.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 text-primary">
              ✓
            </span>
            <span>
              <strong>Nothing sold, nothing tracked by default.</strong> Analytics stay off unless a
              measurement key is explicitly configured.
            </span>
          </li>
        </ul>
        <h3 className="mb-1 mt-5 font-display text-base font-bold">
          What each service actually sees
        </h3>
        <dl className="m-0 flex flex-col gap-3">
          {DATA_USAGE.map((row) => (
            <div key={row.service}>
              <dt className="text-sm font-semibold">{row.service}</dt>
              <dd className="m-0 text-sm text-ink-muted">{row.usage}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>

      <section aria-labelledby="about-disclaimer-heading">
        <h2 id="about-disclaimer-heading" className="font-display text-lg font-bold">
          ⚖️ Scheme disclaimer
        </h2>
        <p className="mt-2">
          Carbon Saathi is an independent project. It is{' '}
          <strong>
            not affiliated with, endorsed by, or operated on behalf of the Government of India
          </strong>{' '}
          or any ministry. PM Surya Ghar and PM KUSUM figures here are indicative estimates built
          from published scheme guidelines and typical market costs — actual subsidies, tariffs and
          timelines vary by state and DISCOM. Always verify with your DISCOM, your state
          implementing agency, or MNRE before making a purchase decision. Every estimate in the app
          is labelled as such.
        </p>
      </section>

      <section aria-labelledby="about-roadmap-heading">
        <h2 id="about-roadmap-heading" className="font-display text-lg font-bold">
          🗺️ Roadmap
        </h2>
        <p className="mt-2">
          The phase-by-phase plan lives in <code>tasks.md</code> at the repository root. The
          headline next steps: Firebase Authentication and Firestore for cross-device sync (the
          storage interface is already in place), the interactive Maps commute view, and shared
          leaderboard circles that sync instead of filtering locally.
        </p>
      </section>

      <section aria-labelledby="about-credits-heading">
        <h2 id="about-credits-heading" className="font-display text-lg font-bold">
          🛠️ Credits
        </h2>
        <p className="mt-2">
          Built with Google Antigravity + Gemini for the Google PromptWars hackathon. Emission
          factors are India-specific approximations, each annotated with its source in the code.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button href="/onboarding">Get my footprint</Button>
        <Button href="/google-services" variant="ghost">
          See the Google services evidence
        </Button>
      </div>
    </div>
  );
}
