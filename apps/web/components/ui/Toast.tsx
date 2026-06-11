/**
 * Toast notifications: ToastProvider owns the queue + auto-dismiss timers and
 * renders a polite live region; consumers call useToast().showToast(). The
 * live region exists permanently so screen readers announce every message.
 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// 5s default: long enough to read a sentence, short enough not to stack up.
const AUTO_DISMISS_MS = 5_000;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-primary text-ink',
  info: 'border-line text-ink',
  error: 'border-error text-ink',
};

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setToasts((current) => [...current, { id, message, variant }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  // Unmount safety: orphaned timers would call setState on a dead provider.
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* role="region" makes the aria-label valid here (bare divs prohibit it). */}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass-card flex items-start gap-3 border-l-4 px-4 py-3 text-sm ${VARIANT_CLASSES[toast.variant]}`}
          >
            <p className="m-0 flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded px-1 font-bold text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used inside <ToastProvider> (see lib/contexts.tsx).');
  }
  return context;
}
