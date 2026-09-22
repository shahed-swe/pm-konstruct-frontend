/**
 * The one place a Zustand store is created.
 *
 * Every store goes through here so devtools naming and persistence are
 * consistent, and so the rule in `docs/adr/0006-state-boundaries.md` has
 * somewhere to live: **stores hold client state only**. Server data belongs
 * to TanStack Query, which knows how to refetch it and when it is stale. A
 * store holding a job list would go quietly out of date, and the legacy app
 * had exactly that -- an edited job kept its old name in the sidebar until a
 * full reload.
 *
 * Two functions rather than one with an optional flag: Zustand encodes its
 * middleware in the state creator's type, so a store that persists and one
 * that does not genuinely have different signatures.
 */
import { create, type StateCreator } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

const DEVTOOLS = process.env.NODE_ENV !== "production";

/** A store that starts fresh on every load. */
export function createStore<T extends object>(
  initializer: StateCreator<T, [["zustand/devtools", never]], []>,
  { name }: { name: string },
) {
  return create<T>()(devtools(initializer, { name, enabled: DEVTOOLS }));
}

/**
 * A store where the named keys survive a reload.
 *
 * Only the named keys: persisting a whole store is how stale flags and
 * half-finished modal state come back from the dead after a deploy.
 */
export function createPersistedStore<T extends object>(
  initializer: StateCreator<T, [["zustand/devtools", never], ["zustand/persist", unknown]], []>,
  { name, keys }: { name: string; keys: (keyof T)[] },
) {
  return create<T>()(
    devtools(
      persist(initializer, {
        name: `pmk.${name}`,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([k]) => keys.includes(k as keyof T)),
          ) as T,
      }),
      { name, enabled: DEVTOOLS },
    ),
  );
}
