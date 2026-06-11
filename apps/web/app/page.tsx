/**
 * Landing page: hero with an animated SVG earth/leaf scene, problem stats,
 * feature bento, how-it-works, scheme preview and final CTA. Client
 * component for framer-motion entrances — all gated by useReducedMotion.
 */
'use client';

import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCard } from '../components/ui/StatCard';

const PROBLEM_STATS = [
  {
    value: '2.0 t',
    label: 'CO₂e the average Indian emits every year',
    sublabel: 'Energy-related, per capita', // core EMISSION_FACTORS.indiaPerCapitaAnnual
  },
  {
    value: '2×',
    label: 'Urban affluent households emit roughly double — about 4 t',
    sublabel: 'And rising with incomes', // core EMISSION_FACTORS.indiaUrbanAffluentAnnual
  },
  {
    value: '₹78,000',
    label: 'Maximum central subsidy under PM Surya Ghar most homes never claim',
    sublabel: 'For 3 kW and larger rooftop solar',
  },
] as const;

const FEATURES = [
  {
    icon: '📏',
    title: 'Know your baseline',
    body: 'A two-minute survey turns your bills and habits into a personal footprint, split by home energy, transport, food and shopping.',
    href: '/onboarding',
  },
  {
    icon: '🍃',
    title: 'Act and earn',
    body: 'Twelve everyday actions — metro days, veg days, AC +1°C. Every kg of CO₂ saved earns 10 points toward your next level.',
    href: '/actions',
  },
  {
    icon: '☀️',
    title: 'PM Surya Ghar',
    body: 'Rooftop solar sizing, subsidy and payback calculated from your monthly electricity units.',
    href: '/schemes',
  },
  {
    icon: '🚜',
    title: 'PM KUSUM',
    body: 'A solar pump advisor for farmers: the right component, the subsidy split and the diesel you stop burning.',
    href: '/schemes',
  },
  {
    icon: '🚗',
    title: 'EV fit coach',
    body: 'Should your next vehicle be electric? An honest recommendation from your daily kilometres and charging reality.',
    href: '/ev-coach',
  },
  {
    icon: '💬',
    title: 'Saathi Chat',
    body: 'A Gemini-powered coach grounded in your own calculator numbers — specific answers, never vague advice.',
    href: '/assistant',
  },
] as const;

const HOW_IT_WORKS = [
  {
    title: 'Measure',
    body: 'Answer a short survey about home energy, commute, food and shopping to get your annual footprint.',
  },
  {
    title: 'Act',
    body: 'Log small daily actions and watch real CO₂ savings stack up against your baseline.',
  },
  {
    title: 'Grow',
    body: 'Level up from Seed to Forest, protect streaks with shields and complete weekly missions.',
  },
] as const;

function HeroScene({ animate }: { animate: boolean }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 360 360"
      role="img"
      aria-label="A stylised earth with a leaf sprouting from it"
      className="mx-auto h-auto w-full max-w-md"
    >
      <defs>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85">
            {/* SMIL pulse is mounted only when motion is allowed — the CSS
                reduced-motion kill-switch cannot reach SMIL timelines. */}
            {animate && (
              <animate
                attributeName="stop-opacity"
                values="0.85;0.5;0.85"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
          </stop>
          <stop offset="100%" stopColor="var(--info)" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="heroLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="205" r="155" fill="url(#heroGlow)" />
      <circle cx="180" cy="220" r="110" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
      <path
        d="M118 182c20-18 50-22 64-9 12 11 3 27-13 31-22 6-41 21-57 13-12-6-6-25 6-35Z"
        fill="var(--primary-soft)"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <path
        d="M212 262c14-10 34-6 40 6 5 11-6 22-22 22-14 0-30-6-30-14 0-6 6-10 12-14Z"
        fill="var(--primary-soft)"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <path
        d="M180 112c0-26 10-44 28-56"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M208 56c26-2 44 8 52 26-20 12-42 12-54-2-8-9-6-18 2-24Z" fill="url(#heroLeaf)" />
    </svg>
  );
}

export default function LandingPage(): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const animate = reduceMotion !== true;
  // One shared entrance treatment; an empty object renders fully static.
  const fadeUp: MotionProps = animate
    ? {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.5 },
      }
    : {};

  return (
    <div className="flex flex-col gap-20">
      {/* ── Hero ── */}
      <section aria-labelledby="hero-heading" className="grid items-center gap-10 pt-6 md:grid-cols-2">
        <div>
          <p className="inline-block rounded-pill bg-accent-soft px-3 py-1 text-sm font-semibold">
            🇮🇳 Made for everyday India
          </p>
          <h1
            id="hero-heading"
            className="mt-4 font-display text-[length:var(--text-display)] font-bold"
          >
            Apna carbon, <span className="text-primary">apne haath</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-ink-muted">
            Measure your footprint in two minutes, cut it with small daily actions, and unlock
            real scheme money — PM Surya Ghar, PM KUSUM and EV guidance, with a Gemini-powered
            coach beside you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/onboarding" size="lg">
              Start your baseline
            </Button>
            <Button href="/assistant" variant="ghost" size="lg">
              Ask Saathi
            </Button>
          </div>
        </div>
        <HeroScene animate={animate} />
      </section>

      {/* ── Problem stats ── */}
      <motion.section {...fadeUp} aria-label="The problem in numbers">
        <div className="grid gap-4 sm:grid-cols-3">
          {PROBLEM_STATS.map((stat) => (
            <StatCard key={stat.value} value={stat.value} label={stat.label} sublabel={stat.sublabel} />
          ))}
        </div>
      </motion.section>

      {/* ── Features bento ── */}
      <motion.section {...fadeUp} aria-labelledby="features-heading">
        <h2 id="features-heading" className="font-display text-[length:var(--text-2xl)] font-bold">
          Everything you need to start cutting
        </h2>
        <div className="bento-grid mt-6">
          {FEATURES.map((feature) => (
            <GlassCard key={feature.title} as="article" className="flex flex-col gap-2">
              <span aria-hidden="true" className="text-3xl">
                {feature.icon}
              </span>
              <h3 className="m-0 font-display text-lg font-bold">{feature.title}</h3>
              <p className="m-0 flex-1 text-sm text-ink-muted">{feature.body}</p>
              <Button href={feature.href} variant="ghost" size="sm" className="self-start">
                Explore {feature.title}
              </Button>
            </GlassCard>
          ))}
        </div>
      </motion.section>

      {/* ── How it works ── */}
      <motion.section {...fadeUp} aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-display text-[length:var(--text-2xl)] font-bold">
          How it works
        </h2>
        <ol className="m-0 mt-6 grid list-none gap-4 p-0 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item, index) => (
            <li key={item.title}>
              <GlassCard className="h-full">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mb-1 mt-3 font-display text-lg font-bold">{item.title}</h3>
                <p className="m-0 text-sm text-ink-muted">{item.body}</p>
              </GlassCard>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* ── Schemes preview ── */}
      <motion.section {...fadeUp} aria-labelledby="schemes-heading">
        <h2 id="schemes-heading" className="font-display text-[length:var(--text-2xl)] font-bold">
          Government money is on the table
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <GlassCard as="article">
            <h3 className="m-0 font-display text-lg font-bold">☀️ PM Surya Ghar: Muft Bijli Yojana</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Up to <strong className="text-ink">₹78,000 central subsidy</strong> on rooftop solar
              and up to 300 free units a month. See your size, payback and savings in seconds.
            </p>
            <Button href="/schemes" variant="ghost" size="sm">
              Calculate my solar savings
            </Button>
          </GlassCard>
          <GlassCard as="article">
            <h3 className="m-0 font-display text-lg font-bold">🚜 PM KUSUM for farmers</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Around <strong className="text-ink">60% subsidy on solar pumps</strong> — and an end
              to diesel bills. Find your component and your share in one step.
            </p>
            <Button href="/schemes" variant="ghost" size="sm">
              Check pump subsidy
            </Button>
          </GlassCard>
        </div>
      </motion.section>

      {/* ── Final CTA ── */}
      <motion.section {...fadeUp} aria-labelledby="cta-heading">
        <GlassCard className="flex flex-col items-center gap-4 py-12 text-center">
          <h2 id="cta-heading" className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
            Two minutes to your number.
          </h2>
          <p className="m-0 max-w-md text-ink-muted">
            Your data stays on your device — no sign-up, no PII, just your footprint and a plan.
          </p>
          <Button href="/onboarding" size="lg">
            Get my footprint
          </Button>
        </GlassCard>
      </motion.section>
    </div>
  );
}
