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
    try {
      const user = await window.__saathi?.seedDemoUser();
      if (user === null || user === undefined) {
        showToast('Could not create the demo profile. Is the API running?', 'error');
      } else {
        showToast('Demo profile ready — exploring as Demo Saathi.', 'success');
      }
    } catch {
      // The bridge maps expected API failures to null, so a rejection is an
      // unexpected fault — still surface it instead of failing silently.
      showToast('Could not create the demo profile. Please try again.', 'error');
    } finally {
      // Always release the button — a stuck spinner would dead-end the demo.
      setSeeding(false);
    }
  };

  return { seeding, seedDemo };
}
