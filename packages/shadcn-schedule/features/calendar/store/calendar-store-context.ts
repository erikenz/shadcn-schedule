import { createContext } from "react";

import type { CalendarStore } from "@/features/calendar/store/calendar-store";

/**
 * Holds the provider's store for the tree. The value is deliberately erased to
 * `unknown`: one provider can serve consumers that each name their own `TMeta`,
 * which a single generic context type cannot express. `isCalendarStore` brands
 * it back to the caller's `TMeta`.
 */
export const CalendarStoreContext = createContext<unknown>(null);

/**
 * Brands the erased context value to the caller's `TMeta`. `CalendarProvider`
 * only ever puts a store in the context, so the runtime shape check is what
 * guards the read and `TMeta` is the caller's contract with the provider.
 */
export const isCalendarStore = <TMeta = unknown>(
  value: unknown
): value is CalendarStore<TMeta> => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const store: { getState?: unknown; subscribe?: unknown } = value;

  return (
    typeof store.getState === "function" &&
    typeof store.subscribe === "function"
  );
};
