/**
 * Liveness endpoint: deploy verification and the web app's demo-mode badge
 * both read from here. Owns no state — everything comes from config/process.
 */
import { Router } from 'express';
import type { AppConfig } from '../config';

export function createHealthRouter(config: AppConfig): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      version: config.version,
      uptimeSec: Math.round(process.uptime()),
      // Surfaced so the UI can label assistant replies before the first chat.
      demoMode: config.demoMode,
    });
  });
  return router;
}
