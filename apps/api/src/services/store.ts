/**
 * UserStore: the persistence seam for user state. Routes depend only on the
 * interface; InMemoryUserStore is the shipping implementation and a Firestore
 * implementation is the documented roadmap (see google/service-catalog.ts).
 */
import type { UserState } from '@carbon-saathi/core';

/**
 * Promise-based even though the in-memory implementation is synchronous:
 * Firestore is async, and matching its shape now means swapping stores later
 * touches zero route code.
 */
export interface UserStore {
  getUser(userId: string): Promise<UserState | undefined>;
  saveUser(state: UserState): Promise<void>;
  listUsers(): Promise<readonly UserState[]>;
}

// Security: bootstrap is unauthenticated, so an unbounded map would let one
// client exhaust memory by minting users. Oldest-first eviction keeps the
// demo deployment safe without auth.
const MAX_USERS = 10_000;

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, UserState>();

  getUser(userId: string): Promise<UserState | undefined> {
    return Promise.resolve(this.users.get(userId));
  }

  saveUser(state: UserState): Promise<void> {
    if (!this.users.has(state.userId) && this.users.size >= MAX_USERS) {
      // Map iteration order is insertion order, so the first key is the oldest user.
      const oldest = this.users.keys().next();
      if (!oldest.done) this.users.delete(oldest.value);
    }
    this.users.set(state.userId, state);
    return Promise.resolve();
  }

  listUsers(): Promise<readonly UserState[]> {
    return Promise.resolve([...this.users.values()]);
  }
}
