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
  /**
   * Atomic read-modify-write: fn receives the current state and returns the
   * next state to persist, or undefined to leave the store untouched.
   * Mutations for the same user run strictly one after another, so two
   * concurrent requests can never both act on the same stale read (e.g. both
   * passing the daily-cap check). A Firestore implementation maps this onto
   * runTransaction.
   */
  mutateUser(
    userId: string,
    fn: (user: UserState | undefined) => UserState | undefined | Promise<UserState | undefined>,
  ): Promise<UserState | undefined>;
  listUsers(): Promise<readonly UserState[]>;
}

// Security: bootstrap is unauthenticated, so an unbounded map would let one
// client exhaust memory by minting users. Oldest-first eviction keeps the
// demo deployment safe without auth.
const MAX_USERS = 10_000;

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, UserState>();
  // Tail of each user's in-flight mutation chain. Entries are removed once a
  // chain drains, so the map only holds users with pending mutations.
  private readonly mutationTails = new Map<string, Promise<unknown>>();

  getUser(userId: string): Promise<UserState | undefined> {
    return Promise.resolve(this.users.get(userId));
  }

  async mutateUser(
    userId: string,
    fn: (user: UserState | undefined) => UserState | undefined | Promise<UserState | undefined>,
  ): Promise<UserState | undefined> {
    const previous = this.mutationTails.get(userId) ?? Promise.resolve();
    // Reads go through getUser/saveUser so subclasses (and tests) override a
    // single read/write path.
    const run = previous.then(async () => {
      const next = await fn(await this.getUser(userId));
      if (next !== undefined) await this.saveUser(next);
      return next;
    });
    // The stored tail swallows rejections so one failed mutation cannot
    // poison the queue for every later request from the same user.
    const tail = run.then(
      () => undefined,
      () => undefined,
    );
    this.mutationTails.set(userId, tail);
    try {
      return await run;
    } finally {
      // Housekeeping: drop the entry once no newer mutation has chained on,
      // so the map does not grow by one entry per user forever.
      if (this.mutationTails.get(userId) === tail) this.mutationTails.delete(userId);
    }
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
