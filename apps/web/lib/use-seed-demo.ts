/**
 * One-click demo profile seeding via the window.__saathi debug bridge (the
 * same path the e2e suite uses). The bridge applies the new profile to
 * context itself, so callers never navigate on success — they just re-render.
 * Previously copy-pasted in the dashboard empty state and the actions page.
 */
'use client';

import { useState } from 'react';
import { useToast } from '../components/ui/Toast';

export function useSeedDemo(): { seeding: boolean; seedDemo: () => Promise<void> } {
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const seedDemo = async (): Promise<void> => {
    setSeeding(true);
    const user = await window.__saathi?.seedDemoUser();
    setSeeding(false);
    if (user === null || user === undefined) {
      showToast('Could not create the demo profile. Is the API running?', 'error');
    } else {
      showToast('Demo profile ready — exploring as Demo Saathi.', 'success');
    }
  };

  return { seeding, seedDemo };
}
