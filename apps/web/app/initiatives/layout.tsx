import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Initiatives Hub — Carbon Saathi',
  description:
    'Mission LiFE\'s 7 climate action themes: home energy, mobility, food, waste, water, finance and community. 25+ sourced initiatives with CO₂ savings and rupee benefits.',
};

export default function InitiativesLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>;
}
