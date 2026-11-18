/**
 * A React-style setter argument: either the next value, or an updater that
 * receives the current one. Structurally identical to `React.SetStateAction`,
 * restated here so the store's zustand slice carries its own vocabulary.
 */
export type SetAction<T> = T | ((prev: T) => T);

/** Narrows a `SetAction` to its updater form. */
const isUpdater = <T>(action: SetAction<T>): action is (prev: T) => T =>
  typeof action === "function";

/** Resolves a `SetAction` against `prev`, the way React's state setters do. */
export const resolveSetAction = <T>(action: SetAction<T>, prev: T): T =>
  isUpdater(action) ? action(prev) : action;
