/**
 * storage: round-trip integrity plus the corrupt-JSON self-heal contract —
 * bad payloads must read as null AND be evicted so they cannot poison
 * future reads.
 */
import { describe, expect, it } from 'vitest';
import { getStoredJson, removeStored, setStoredJson, STORAGE_KEYS } from '../storage';

describe('storage', () => {
  it('round-trips JSON values', () => {
    setStoredJson(STORAGE_KEYS.gamification, { points: 120, streak: 3 });
    expect(getStoredJson<{ points: number; streak: number }>(STORAGE_KEYS.gamification)).toEqual({
      points: 120,
      streak: 3,
    });
  });

  it('returns null and evicts the entry when the stored JSON is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEYS.profile, '{not-valid-json');

    expect(getStoredJson(STORAGE_KEYS.profile)).toBeNull();
    // Self-heal: the corrupt payload must be gone after the failed read.
    expect(window.localStorage.getItem(STORAGE_KEYS.profile)).toBeNull();
  });

  it('returns null for absent keys', () => {
    expect(getStoredJson(STORAGE_KEYS.userId)).toBeNull();
  });

  it('removes keys via removeStored', () => {
    setStoredJson(STORAGE_KEYS.theme, 'dark');
    removeStored(STORAGE_KEYS.theme);
    expect(getStoredJson(STORAGE_KEYS.theme)).toBeNull();
  });
});
