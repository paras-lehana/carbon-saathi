/**
 * Dashboard bento grid: thin composition over the section cards in
 * components/sections/. Owns only the cross-section state — the quick-log
 * lifecycle (gamification context + toasts) and the retake-quiz modal; the
 * page owns fetching and hands the payload down.
 */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ActionDefinition, BaselineFootprintResult } from '@carbon-saathi/core';
import { DailyPledgeCard } from '@/components/gamification/DailyPledgeCard';
import { QuizWidget } from '@/components/gamification/QuizWidget';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { DashboardResponse, LeaderboardResponse } from '@/lib/api-client';
import { useGamification } from '@/lib/contexts';
import { useFadeUp } from '@/lib/motion';
import { ActivityCard } from './sections/ActivityCard';
import { AnalogiesCard } from './sections/AnalogiesCard';
import { BadgesCard } from './sections/BadgesCard';
import { FootprintCard } from './sections/FootprintCard';
import { LeaderboardCard } from './sections/LeaderboardCard';
import { MissionsCard } from './sections/MissionsCard';
import { PointsCard } from './sections/PointsCard';
import { QuickLogCard } from './sections/QuickLogCard';
import { StatsCard } from './sections/StatsCard';
import { StreakCard } from './sections/StreakCard';
import { TipsCard } from './sections/TipsCard';

export interface DashboardGridProps {
  userId: string;
  dashboard: DashboardResponse;
  baseline: BaselineFootprintResult | null;
  actions: ActionDefinition[];
  leaderboard: LeaderboardResponse | null;
  /** Refetches the dashboard payload (fire-and-forget, useApiQuery retry). */
  onRefresh: () => void;
}

export function DashboardGrid({
  userId,
  dashboard,
  baseline,
  actions,
  leaderboard,
  onRefresh,
}: DashboardGridProps): React.JSX.Element {
  const { logAction } = useGamification();
  const { showToast } = useToast();
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const fadeUp = useFadeUp();
  const { gamification, missions, recentActions, analogies } = dashboard;

  const quickLog = async (action: ActionDefinition): Promise<void> => {
    setLoggingId(action.id);
    const result = await logAction(action.id, 1);
    if (!result.ok) {
      setLoggingId(null);
      showToast(result.error.message, 'error');
      return;
    }
    showToast(
      `+${result.data.impact.co2SavedKg} kg CO₂ saved · +${result.data.impact.points} points`,
      'success',
    );
    // Badge awards ride on the log response — each gets its own toast.
    for (const badge of result.data.newBadges ?? []) {
      showToast(`Badge earned: ${badge.icon} ${badge.name}`, 'success');
    }
    onRefresh(); // points/streak/missions all moved — repaint from the server
    setLoggingId(null);
  };

  return (
    <motion.div {...fadeUp} className="bento-grid">
      <FootprintCard baseline={baseline} onRetakeQuiz={() => setIsQuizOpen(true)} />
      {baseline !== null && <StatsCard baseline={baseline} />}
      <PointsCard gamification={gamification} />
      <StreakCard streak={gamification.streak} />
      <BadgesCard earnedIds={gamification.earnedBadges} />
      <DailyPledgeCard
        userId={userId}
        currentPledge={gamification.pledge ?? null}
        onPledgeSet={onRefresh}
      />
      <MissionsCard missions={missions} />
      <QuickLogCard
        actions={actions}
        loggingId={loggingId}
        onLog={(action) => void quickLog(action)}
      />
      <ActivityCard entries={recentActions} actions={actions} />
      <AnalogiesCard analogies={analogies} />
      <LeaderboardCard leaderboard={leaderboard} />
      <TipsCard tips={baseline?.generatedTips ?? []} />

      <Modal open={isQuizOpen} onClose={() => setIsQuizOpen(false)} title="Retake Quiz">
        <QuizWidget
          onComplete={() => {
            setIsQuizOpen(false);
            onRefresh();
          }}
        />
      </Modal>
    </motion.div>
  );
}
