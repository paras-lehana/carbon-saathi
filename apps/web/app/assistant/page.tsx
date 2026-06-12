/**
 * Saathi Chat route: an accessible chat log (role="log"), suggestion chips,
 * a typing indicator and a demo/gemini mode badge taken from the last reply.
 * Owns conversation state only — grounding happens server-side, and the
 * profile userId rides along when one exists.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { useToast } from '../../components/ui/Toast';
import * as api from '../../lib/api-client';
import { useProfile } from '../../lib/contexts';
import { INPUT_CLASS } from '../../components/ui/input-styles';

const MAX_MESSAGE_CHARS = 1000; // mirrors the API's assistantQueryRequestSchema cap

const SUGGESTIONS = [
  'How much PM Surya Ghar subsidy would I get?',
  'How do I cut 1 tonne of CO₂ this year?',
  'EV or rooftop solar first?',
  "What's my best action today?",
] as const;

const GREETING =
  "Namaste! I'm Saathi, your climate coach for everyday India. Ask me about PM Surya Ghar, " +
  'PM KUSUM, EVs or your own footprint — I answer with your calculator numbers wherever I can.';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** Replies carry their provenance so each bubble can show how it was produced. */
  mode?: 'gemini' | 'demo';
}

export default function AssistantPage(): React.JSX.Element {
  const { userId, baseline } = useProfile();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'assistant', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<'gemini' | 'demo' | null>(null);
  const nextIdRef = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep the newest message in view; instant scroll respects reduced motion.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, pending]);

  const send = async (raw: string): Promise<void> => {
    const message = raw.trim().slice(0, MAX_MESSAGE_CHARS);
    if (message === '' || pending) return;
    const userMessage: ChatMessage = { id: nextIdRef.current, role: 'user', text: message };
    nextIdRef.current += 1;
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setPending(true);
    const result = await api.queryAssistant({
      message,
      ...(userId !== null ? { userId } : {}),
    });
    setPending(false);
    if (!result.ok) {
      showToast(result.error.message, 'error');
      return;
    }
    setMode(result.data.mode);
    const reply: ChatMessage = {
      id: nextIdRef.current,
      role: 'assistant',
      text: result.data.reply,
      mode: result.data.mode,
    };
    nextIdRef.current += 1;
    setMessages((current) => [...current, reply]);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-[length:var(--text-2xl)] font-bold">Saathi Chat</h1>
          <p className="mt-2 text-ink-muted">
            {baseline !== null
              ? 'Answers are grounded in your saved baseline and the scheme calculators.'
              : 'Add your baseline on the onboarding page for fully personalised answers.'}
          </p>
        </div>
        {mode !== null && (
          <span
            className={`rounded-pill px-3 py-1 text-xs font-bold ${
              mode === 'gemini' ? 'bg-primary-soft text-primary' : 'bg-accent-soft text-ink'
            }`}
          >
            {mode === 'gemini' ? '✨ Gemini live' : '🧪 Demo mode'}
          </span>
        )}
      </div>

      <GlassCard as="section" aria-labelledby="assistant-conversation-heading">
        <h2 id="assistant-conversation-heading" className="sr-only">
          Conversation
        </h2>
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation with Saathi"
          // Scrollable region: focusable so keyboard users can arrow through
          // long conversations (axe scrollable-region-focusable).
          tabIndex={0}
          className="flex max-h-[55vh] min-h-[18rem] flex-col gap-3 overflow-y-auto pr-1 focus-visible:outline-primary"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary-soft px-4 py-2.5'
                  : 'max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5'
              }
            >
              <p className="sr-only">{message.role === 'user' ? 'You said:' : 'Saathi said:'}</p>
              <p className="m-0 whitespace-pre-wrap text-sm">{message.text}</p>
              {message.mode !== undefined && (
                <p className="m-0 mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {message.mode === 'gemini' ? '✨ gemini' : '🧪 demo'}
                </p>
              )}
            </div>
          ))}
          {pending && (
            <p className="m-0 max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-sm text-ink-muted">
              Saathi is typing…
            </p>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <div role="group" aria-label="Suggested questions" className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={pending}
                onClick={() => void send(suggestion)}
                className="rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-primary-soft disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex gap-2"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask Saathi a question
            </label>
            <input
              id="assistant-input"
              data-testid="assistant-input"
              type="text"
              maxLength={MAX_MESSAGE_CHARS}
              autoComplete="off"
              placeholder="Ask about subsidies, EVs or your footprint…"
              value={input}
              disabled={pending}
              onChange={(event) => setInput(event.target.value)}
              className={INPUT_CLASS}
            />
            <Button
              type="submit"
              data-testid="assistant-send"
              disabled={pending || input.trim() === ''}
            >
              {pending ? 'Sending…' : 'Send'}
            </Button>
          </form>
        </div>
      </GlassCard>

      <p className="m-0 text-xs text-ink-muted">
        Saathi sticks to climate topics, labels estimates, and never needs your personal details.
        Replies in demo mode are deterministic and reuse the same calculator numbers.
      </p>
    </div>
  );
}
