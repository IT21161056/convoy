/**
 * Ultra-lightweight reactive store for useSyncExternalStore.
 * Provides a minimal pub-sub container without external dependencies.
 */
export interface Store<T> {
  getState(): T;
  setState(updater: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(state)
          : updater;
      if (next !== state) {
        state = next;
        listeners.forEach((l) => l());
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
  };
}
