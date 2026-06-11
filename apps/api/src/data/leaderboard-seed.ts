/**
 * Deterministic demo leaderboard entries. Fixed data (no randomness) so e2e
 * runs and screenshots are reproducible; points are spread across all five
 * levels so the UI shows the full Seed→Forest ladder on day one.
 */

export interface LeaderboardSeedEntry {
  readonly userId: string;
  readonly name: string;
  readonly points: number;
}

export const LEADERBOARD_SEED: readonly LeaderboardSeedEntry[] = [
  { userId: 'seed-aarav', name: 'Aarav Mehta', points: 12_840 }, // Forest
  { userId: 'seed-ananya', name: 'Ananya Krishnan', points: 9_420 }, // Grove
  { userId: 'seed-rohan', name: 'Rohan Deshpande', points: 7_310 }, // Grove
  { userId: 'seed-ishita', name: 'Ishita Banerjee', points: 5_125 }, // Grove
  { userId: 'seed-vikram', name: 'Vikram Reddy', points: 4_480 }, // Tree
  { userId: 'seed-meera', name: 'Meera Pillai', points: 3_650 }, // Tree
  { userId: 'seed-kabir', name: 'Kabir Chawla', points: 2_210 }, // Tree
  { userId: 'seed-sneha', name: 'Sneha Kulkarni', points: 1_480 }, // Sapling
  { userId: 'seed-arjun', name: 'Arjun Nair', points: 980 }, // Sapling
  { userId: 'seed-divya', name: 'Divya Iyer', points: 640 }, // Sapling
  { userId: 'seed-farhan', name: 'Farhan Qureshi', points: 320 }, // Seed
  { userId: 'seed-lakshmi', name: 'Lakshmi Subramanian', points: 145 }, // Seed
];
