/**
 * Google services evidence route: renders GET /api/google/services as status
 * chips plus per-integration cards (status, value, code paths, env var
 * names, fallback). Pure rendering of the server catalog — by contract the
 * endpoint carries env var NAMES only, never values.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GoogleServiceIntegration, GoogleServiceStatus } from '@carbon-saathi/core';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import * as api from '../../lib/api-client';
import type { GoogleServicesResponse } from '../../lib/api-client';

const STATUS_META: Record<GoogleServiceStatus, { label: string; className: string }> = {
  implemented: { label: 'Implemented', className: 'bg-primary-soft text-primary' },
  'ready-with-key': { label: 'Ready with key', className: 'bg-accent-soft text-ink' },
  planned: { label: 'Planned', className: 'border border-line text-ink-muted' },
};

const CATEGORY_LABELS: Record<GoogleServiceIntegration['category'], string> = {
  ai: 'AI',
  maps: 'Maps',
  firebase: 'Firebase',
  cloud: 'Cloud',
  analytics: 'Analytics',
};

const CODE_CLASS =
  'rounded bg-primary-soft px-1.5 py-0.5 font-mono text-xs text-ink break-all';

function StatusPill({ status }: { status: GoogleServiceStatus }): React.JSX.Element {
  const meta = STATUS_META[status];
  return (
    <span className={`shrink-0 rounded-pill px-3 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function GoogleServicesPage(): React.JSX.Element {
  const [data, setData] = useState<GoogleServicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    const result = await api.getGoogleServices();
    if (result.ok) setData(result.data);
    else setError(result.error.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">
          Google services evidence
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Every Google integration in Carbon Saathi, served live from the API&rsquo;s typed
          catalog — what it does for users, where the code lives, and how it degrades without a
          key. This page is itself served from Cloud Run (asia-south1); the API self-reports
          live status at /api/health.
        </p>
      </div>

      {error !== null ? (
        <GlassCard as="section" className="mx-auto max-w-xl py-10 text-center">
          <p className="m-0 text-ink-muted">{error}</p>
          <Button className="mt-4" onClick={() => void load()}>
            Try again
          </Button>
        </GlassCard>
      ) : data === null ? (
        <div role="status" aria-label="Loading the service catalog">
          <span className="sr-only">Loading the service catalog…</span>
          <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Mirrors the catalog size so the loading layout matches the data. */}
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="glass-card h-56 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary chips ── */}
          <section aria-label="Integration status summary">
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
              <li className="glass-card px-4 py-2 text-sm">
                <strong className="font-display text-primary">{data.summary.implemented}</strong>{' '}
                implemented
              </li>
              <li className="glass-card px-4 py-2 text-sm">
                <strong className="font-display text-primary">{data.summary.readyWithKey}</strong>{' '}
                ready with key
              </li>
              <li className="glass-card px-4 py-2 text-sm">
                <strong className="font-display text-primary">{data.summary.planned}</strong>{' '}
                planned
              </li>
              <li className="glass-card px-4 py-2 text-sm">
                <strong className="font-display text-primary">{data.summary.total}</strong> total
              </li>
            </ul>
          </section>

          {/* ── Service cards ── */}
          <section aria-label="Google service integrations">
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {data.services.map((service) => (
                <GlassCard key={service.id} as="li" className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="m-0 font-display text-base font-bold">{service.product}</h2>
                    <StatusPill status={service.status} />
                  </div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {CATEGORY_LABELS[service.category]}
                  </p>
                  <p className="m-0 text-sm">{service.userValue}</p>
                  <p className="m-0 text-sm text-ink-muted">
                    <strong className="text-ink">Fallback:</strong> {service.fallbackMode}
                  </p>
                  <div className="text-sm">
                    <p className="m-0 mb-1 font-semibold">Code paths</p>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {service.codePaths.map((path) => (
                        <li key={path}>
                          <code className={CODE_CLASS}>{path}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {service.envVars.length > 0 && (
                    <div className="text-sm">
                      <p className="m-0 mb-1 font-semibold">Environment variables</p>
                      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {service.envVars.map((envVar) => (
                          <li key={envVar}>
                            <code className={CODE_CLASS}>{envVar}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </GlassCard>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="m-0 text-xs text-ink-muted">
        Security note: this evidence endpoint reports environment-variable <em>names</em> only —
        secret values never leave the server, and the API&rsquo;s tests assert it.
      </p>
    </div>
  );
}
