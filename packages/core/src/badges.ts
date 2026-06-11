/**
 * Badge catalog and evaluation. Badges are awarded for milestones during the
 * app lifecycle — new badges only (never repeats of earned badges).
 */
import type { BadgeDefinition } from './types';

export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  {
    id: 'quiz-whiz',
    name: 'Pehla Quiz',
    description: '30-Second Starter',
    icon: '🧠',
    hint: 'Complete the quick quiz',
  },
  {
    id: 'pehla-kadam',
    name: 'Pehla Kadam',
    description: 'First step',
    icon: '👣',
    hint: 'Complete your full footprint baseline',
  },
  {
    id: 'pehli-jeet',
    name: 'Pehli Jeet',
    description: 'First action logged',
    icon: '🎯',
    hint: 'Log your first climate action',
  },
  {
    id: 'streak-3',
    name: 'Three Days Strong',
    description: 'Streak milestone',
    icon: '🔥',
    hint: 'Log actions on 3 consecutive days',
  },
  {
    id: 'streak-7',
    name: 'Weekly Warrior',
    description: 'Full week habit',
    icon: '⚡',
    hint: 'Log actions on 7 consecutive days',
  },
  {
    id: 'saver-10',
    name: 'Double-Digit Saver',
    description: '≥10 kg CO₂ saved',
    icon: '💚',
    hint: 'Save a total of 10+ kg CO₂ equivalent',
  },
  {
    id: 'mission-master',
    name: 'Mission Master',
    description: 'Weekly mission done',
    icon: '🎖️',
    hint: 'Complete a weekly mission',
  },
  {
    id: 'pledge-keeper',
    name: 'Pledge Keeper',
    description: 'Daily commitment',
    icon: '🤝',
    hint: 'Complete today\'s pledged action',
  },
];

export interface BadgeEvaluationInput {
  earned: string[];
  hasBaseline: boolean;
  joinedViaQuiz: boolean;
  actionCount: number;
  streakCurrent: number;
  totalCo2SavedKg: number;
  missionCompleted: boolean;
  pledgeCompleted: boolean;
}

export function evaluateBadges(input: BadgeEvaluationInput): BadgeDefinition[] {
  const earned = new Set(input.earned);
  const newBadges: BadgeDefinition[] = [];

  // Quiz-whiz: triggered at bootstrap with source: 'quiz' (no way to re-earn).
  if (input.joinedViaQuiz && !earned.has('quiz-whiz')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'quiz-whiz')!);
    earned.add('quiz-whiz');
  }

  // Pehla-kadam: baseline saved.
  if (input.hasBaseline && !earned.has('pehla-kadam')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'pehla-kadam')!);
    earned.add('pehla-kadam');
  }

  // Pehli-jeet: first action logged.
  if (input.actionCount >= 1 && !earned.has('pehli-jeet')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'pehli-jeet')!);
    earned.add('pehli-jeet');
  }

  // Streaks.
  if (input.streakCurrent >= 3 && !earned.has('streak-3')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'streak-3')!);
    earned.add('streak-3');
  }
  if (input.streakCurrent >= 7 && !earned.has('streak-7')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'streak-7')!);
    earned.add('streak-7');
  }

  // Saver.
  if (input.totalCo2SavedKg >= 10 && !earned.has('saver-10')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'saver-10')!);
    earned.add('saver-10');
  }

  // Missions.
  if (input.missionCompleted && !earned.has('mission-master')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'mission-master')!);
    earned.add('mission-master');
  }

  // Pledge.
  if (input.pledgeCompleted && !earned.has('pledge-keeper')) {
    newBadges.push(BADGE_CATALOG.find((b) => b.id === 'pledge-keeper')!);
    earned.add('pledge-keeper');
  }

  return newBadges;
}
