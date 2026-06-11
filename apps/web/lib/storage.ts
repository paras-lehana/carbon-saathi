/**
 * SSR-safe localStorage wrapper. Owns the canonical 'carbon-saathi:*' key
 * namespace and corrupt-JSON recovery; callers own the type they store
 * under each key (state shape validation happens in contexts.tsx).
 */

export const STORAGE_KEYS = {
  profile: 'carbon-saathi:profile',
  gamification: 'carbon-saathi:gamification',
  theme: 'carbon-saathi:theme',
  userId: 'carbon-saathi:userId',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Read and JSON-parse a stored value. Returns null when running on the
 * server, when the key is absent, or when the payload is corrupt.
 */
export function getStoredJson<T>(key: StorageKey): T | null {
  if (typeof window === 'undefined') return null; // SSR guard — no window in RSC/SSR passes
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Self-heal: drop the corrupt entry so every later read is a clean miss
    // instead of failing forever on the same bad payload.
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable entirely (private mode / disabled) — fine.
    }
    return null;
  }
}

/** Persist a value as JSON. Silently a no-op on the server or full storage. */
export function setStoredJson<T>(key: StorageKey, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode: persistence is best-effort by design —
    // the app keeps working from in-memory state.
  }
}

/** Remove a key. Safe to call anywhere, including the server. */
export function removeStored(key: StorageKey): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same best-effort contract as setStoredJson.
  }
}
