/**
 * The second LLM transport (llm-service proxy) and the failover chain,
 * exercised through injected fetchFn seams — no network, no live keys. Pins
 * the same security contracts as the direct client (key rides in a header,
 * upstream bodies never relayed) plus the chain's failover ordering: the
 * regression that motivated all of this was a silent full-LLM outage when
 * the single Gemini key exhausted its prepaid credits.
 */
import { describe, expect, it, vi } from 'vitest';
import type { GeminiClient } from '../services/gemini-client';
import { createLlmChain } from '../services/llm-chain';
import { createLlmProxyClient, isAllowedProxyUrl } from '../services/llm-proxy-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const PROXY_OPTS = {
  baseUrl: 'https://llm.lehana.in',
  endpoint: 'antigravity-manager',
  internalKey: 'internal-key-123',
  model: 'gemini-3-flash',
} as const;

describe('llm-proxy-client', () => {
  it('sends an OpenAI-style body and returns the trimmed reply on the happy path', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { role: 'assistant', content: '  Switch to LED bulbs.  ' } }],
      }),
    );
    const client = createLlmProxyClient({ ...PROXY_OPTS, fetchFn });

    expect(client.enabled).toBe(true);
    const result = await client.generate('You are a coach.', 'How do I cut my bill?');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('Switch to LED bulbs.');

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://llm.lehana.in/smk/antigravity-manager');
    // Security contract: the key rides in a header, never in the URL.
    expect(url).not.toContain('internal-key-123');
    expect(new Headers(init.headers).get('x-internal-key')).toBe('internal-key-123');
    const body = JSON.parse(String(init.body)) as {
      messages: { role: string; content: string }[];
      model: string;
    };
    expect(body.model).toBe('gemini-3-flash');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a coach.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'How do I cut my bill?' });
  });

  it('strips markdown fences some proxy backends wrap replies in', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '```text\nUse a fan.\n```' } }] }),
    );
    const client = createLlmProxyClient({ ...PROXY_OPTS, fetchFn });

    const result = await client.generate('sys', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('Use a fan.');
  });

  it('maps a non-200 to UPSTREAM_FAILURE with a status-only message', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response('stack trace with internals', { status: 502 }));
    const client = createLlmProxyClient({ ...PROXY_OPTS, fetchFn });

    const result = await client.generate('sys', 'user');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILURE');
      // The upstream body is never relayed — the status alone is the message.
      expect(result.error.message).toBe('LLM proxy responded with HTTP 502.');
    }
  });

  it('treats an empty or missing reply as UPSTREAM_FAILURE', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ choices: [] }));
    const client = createLlmProxyClient({ ...PROXY_OPTS, fetchFn });

    const result = await client.generate('sys', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('LLM proxy returned an empty reply.');
  });

  it('replaces thrown fetch errors with a fixed key-free message', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(new Error('connect failed for x-internal-key: internal-key-123'));
    const client = createLlmProxyClient({ ...PROXY_OPTS, fetchFn });

    const result = await client.generate('sys', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('LLM proxy request failed or timed out.');
      expect(result.error.message).not.toContain('internal-key-123');
    }
  });

  it('is disabled without a key or base URL and never fetches', async () => {
    const fetchFn = vi.fn();
    for (const options of [
      { ...PROXY_OPTS, internalKey: undefined, fetchFn },
      { ...PROXY_OPTS, internalKey: '', fetchFn },
      { ...PROXY_OPTS, baseUrl: undefined, fetchFn },
    ]) {
      const client = createLlmProxyClient(options);
      expect(client.enabled).toBe(false);
      const result = await client.generate('sys', 'user');
      expect(result.ok).toBe(false);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('SSRF guard: refuses non-allowlisted or non-HTTPS hosts', () => {
    expect(isAllowedProxyUrl('https://llm.lehana.in')).toBe(true);
    expect(isAllowedProxyUrl('http://localhost:8090')).toBe(true);
    expect(isAllowedProxyUrl('https://evil.example.com')).toBe(false);
    expect(isAllowedProxyUrl('http://llm.lehana.in')).toBe(false); // plaintext leaks the key
    expect(isAllowedProxyUrl('https://169.254.169.254')).toBe(false); // metadata endpoint
    expect(isAllowedProxyUrl('not a url')).toBe(false);
    // A disallowed URL disables the client outright.
    const client = createLlmProxyClient({ ...PROXY_OPTS, baseUrl: 'https://evil.example.com' });
    expect(client.enabled).toBe(false);
  });
});

function stubClient(overrides: Partial<GeminiClient> & { reply?: string }): GeminiClient {
  return {
    enabled: overrides.enabled ?? true,
    generate:
      overrides.generate ??
      vi.fn().mockResolvedValue({ ok: true, value: overrides.reply ?? 'stub reply' }),
  };
}

describe('llm-chain', () => {
  it('returns the first transport’s reply when it succeeds', async () => {
    const second = stubClient({ reply: 'second' });
    const chain = createLlmChain([stubClient({ reply: 'first' }), second]);

    expect(chain.enabled).toBe(true);
    const result = await chain.generate('sys', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('first');
    expect(second.generate).not.toHaveBeenCalled();
  });

  it('fails over to the next transport when the first errors (the June-2026 outage shape)', async () => {
    const depleted = stubClient({
      generate: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'UPSTREAM_FAILURE', message: 'Gemini responded with HTTP 429.' },
      }),
    });
    const chain = createLlmChain([depleted, stubClient({ reply: 'proxy saved the day' })]);

    const result = await chain.generate('sys', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('proxy saved the day');
  });

  it('skips disabled transports entirely', async () => {
    const disabled = stubClient({ enabled: false });
    const chain = createLlmChain([disabled, stubClient({ reply: 'live one' })]);

    const result = await chain.generate('sys', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('live one');
    expect(disabled.generate).not.toHaveBeenCalled();
  });

  it('surfaces the last error when every transport fails', async () => {
    const failing = (message: string): GeminiClient =>
      stubClient({
        generate: vi
          .fn()
          .mockResolvedValue({ ok: false, error: { code: 'UPSTREAM_FAILURE', message } }),
      });
    const chain = createLlmChain([failing('first down'), failing('second down')]);

    const result = await chain.generate('sys', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('second down');
  });

  it('is disabled (and errs cleanly) with no configured transports', async () => {
    const chain = createLlmChain([stubClient({ enabled: false })]);
    expect(chain.enabled).toBe(false);
    const result = await chain.generate('sys', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('No LLM transport is configured.');
  });
});
