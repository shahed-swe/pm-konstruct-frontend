/**
 * The one place a Zustand store is created.
 *
 * Every store goes through here so devtools naming and persistence are
 * consistent, and so the rule in `docs/adr/0006-state-boundaries.md` has
 * somewhere to live: **stores hold client state only**. Server data belongs
 * to TanStack Query, which knows how to refetch it and when it is stale. A
 * store holding a job list would go quietly out of date, and the legacy app
 * had exactly that bug -- an edited job kept its old name in the sidebar
 * until a full reload.
 */
import { create, type StateCreator } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

interface Options<T> {
  name: string;
  /** Keys to keep in `localStorage`. Omit for a store that should not survive a reload. */
  persistKeys?: (keyof T)[];
}

export function createStore<T extends object>(
  initializer: StateCreator<T, [["zustand/devtools", never]], []>,
  { name, persistKeys }: Options<T>,
) {
  const withDevtools = devtools(initializer, { name, enabled: process.env.NODE_ENV !== "production" });

  if (!persistKeys) {
    return create<T>()(withDevtools);
  }

  return create<T>()(
    persist(withDevtools as StateCreator<T, [], []>, {
      name: `pmk.${name}`,
      storage: createJSONStorage(() => localStorage),
      // Only the named keys. Persisting a whole store is how stale flags and
      // half-finished modal state come back from the dead after a deploy.
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([k]) => persistKeys.includes(k as keyof T)),
        ) as T,
    }),
  );
}
