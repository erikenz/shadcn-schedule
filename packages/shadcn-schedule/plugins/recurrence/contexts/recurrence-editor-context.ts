import { createContext, useContext } from "react";

import type { RRuleOptions, Weekday } from "@/plugins/recurrence/types";
import type { RecurrencePreset } from "@/plugins/recurrence/utils/recurrence-presets";

export type EndType = "never" | "count" | "until";

type MonthlyMode = "day" | "weekday";

/** Rule fields the editor toggles, and therefore has to clear explicitly. */
export type ClearedRuleField = "bymonthday" | "byweekday" | "count" | "until";

// The editor's state and mutations, shared with the field sub-components so each
// derives the values it needs from `opts`/`reference` instead of taking props.
export interface RecurrenceEditorContextValue {
  custom: boolean;
  opts: RRuleOptions | null;
  reference: Date;
  selectPreset: (preset: RecurrencePreset) => void;
  setEndType: (type: EndType) => void;
  setMonthlyMode: (mode: MonthlyMode) => void;
  setUntil: (date: Date | undefined) => void;
  toggleDay: (day: Weekday) => void;
  update: (
    changes: Partial<RRuleOptions>,
    cleared?: ClearedRuleField[]
  ) => void;
}

const RecurrenceEditorContext =
  createContext<RecurrenceEditorContextValue | null>(null);

export const RecurrenceEditorProvider = RecurrenceEditorContext.Provider;

export const useRecurrenceEditor = () => {
  const context = useContext(RecurrenceEditorContext);

  if (!context) {
    throw new Error(
      "useRecurrenceEditor must be used within a RecurrenceEditor"
    );
  }

  return context;
};
