/**
 * Mission LiFE initiative catalog: a read-only display catalog (no math
 * ownership — calculators live in their own modules) mapping individual
 * climate actions to the Government of India's Mission LiFE themes
 * (missionlife-moefcc.nic.in). Every figure carries its derivation or source
 * inline; grid-electricity numbers derive from EMISSION_FACTORS so a grid
 * factor update propagates here automatically.
 */
import { INITIATIVE_CATALOG } from './initiatives-data';
import type { Initiative, InitiativeCategory } from './types';

/**
 * App category → Mission LiFE theme. The seven official LiFE themes are:
 * Save Energy · Save Water · Say No to Single-Use Plastic · Adopt Sustainable
 * Food Systems · Reduce Waste · Adopt Healthy Lifestyles · Reduce E-Waste.
 * Our seven app categories group initiatives by where they happen in daily
 * life; each maps to the closest official theme below.
 */
export const LIFE_THEMES: Record<
  InitiativeCategory,
  { title: string; emoji: string; lifeTheme: string }
> = {
  'home-energy': { title: 'Home Energy', emoji: '🏠', lifeTheme: 'Save Energy' },
  mobility: { title: 'Mobility', emoji: '🚌', lifeTheme: 'Save Energy' },
  food: { title: 'Food & Diet', emoji: '🥗', lifeTheme: 'Adopt Sustainable Food Systems' },
  waste: { title: 'Waste & Circularity', emoji: '♻️', lifeTheme: 'Reduce Waste' },
  water: { title: 'Water', emoji: '💧', lifeTheme: 'Save Water' },
  finance: { title: 'Green Finance', emoji: '💚', lifeTheme: 'Adopt Healthy Lifestyles' },
  community: { title: 'Community & Nature', emoji: '🌳', lifeTheme: 'Adopt Healthy Lifestyles' },
};

/** Stable ordered list of categories — module-scope so callers never recompute it. */
export const ALL_INITIATIVE_CATEGORIES: readonly InitiativeCategory[] = [
  'home-energy',
  'mobility',
  'food',
  'waste',
  'water',
  'finance',
  'community',
];

// Catalog entries are pure data and live in initiatives-data.ts; this
// re-export keeps the public surface unchanged for the barrel and callers.
export { INITIATIVE_CATALOG } from './initiatives-data';

/**
 * Initiatives for one category, in catalog order. Pure filter — returns new
 * arrays, never mutates the catalog.
 */
export function initiativesByCategory(category: InitiativeCategory): Initiative[] {
  return INITIATIVE_CATALOG.filter((initiative) => initiative.category === category);
}
