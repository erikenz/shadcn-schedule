import { useState } from "react";
import { toText } from "rrule-temporal/totext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { numberOr } from "@/lib/guards";
import { RecurrenceEndFields } from "@/plugins/recurrence/components/recurrence-editor/recurrence-end-fields";
import { RecurrenceFrequencyFields } from "@/plugins/recurrence/components/recurrence-editor/recurrence-frequency-fields";
import { RecurrenceMonthlyMode } from "@/plugins/recurrence/components/recurrence-editor/recurrence-monthly-mode";
import { RecurrencePresetSelect } from "@/plugins/recurrence/components/recurrence-editor/recurrence-preset-select";
import { RecurrenceWeekdayPicker } from "@/plugins/recurrence/components/recurrence-editor/recurrence-weekday-picker";
import { RecurrenceEditorProvider } from "@/plugins/recurrence/contexts/recurrence-editor-context";
import type {
  ClearedRuleField,
  EndType,
  RecurrenceEditorContextValue,
} from "@/plugins/recurrence/contexts/recurrence-editor-context";
import type { RRuleOptions, Weekday } from "@/plugins/recurrence/types";
import { FREQ } from "@/plugins/recurrence/utils/recurrence-constants";
import {
  detectPreset,
  getPresetRRule,
  resolveByweekday,
} from "@/plugins/recurrence/utils/recurrence-presets";
import type { RecurrencePreset } from "@/plugins/recurrence/utils/recurrence-presets";
import { toTemporalRule } from "@/plugins/recurrence/utils/temporal-rule";
import { endOf, now, toDate, toZonedDateTime } from "@/utils/temporal";

// End conditions are mutually exclusive: each one clears the fields the others
// rely on when it is selected.
const END_TYPE_FIELDS: Record<EndType, ClearedRuleField[]> = {
  count: ["until"],
  never: ["count", "until"],
  until: ["count"],
};

// `delete` only accepts a static key, so the clearable fields are listed one by
// one; typing the record over `ClearedRuleField` keeps that list exhaustive.
const CLEAR_FIELD: Record<ClearedRuleField, (opts: RRuleOptions) => void> = {
  bymonthday: (opts) => {
    delete opts.bymonthday;
  },
  byweekday: (opts) => {
    delete opts.byweekday;
  },
  count: (opts) => {
    delete opts.count;
  },
  until: (opts) => {
    delete opts.until;
  },
};

const getDescription = (
  opts: RRuleOptions | null,
  t: (k: string) => string
) => {
  if (!opts) {
    return t("customRecurrence");
  }

  try {
    const text = toText(toTemporalRule(opts), "en", {
      excludeTzAbbreviation: true,
    });

    const isUsableText = Boolean(text) && !text.toLowerCase().includes("error");

    if (!isUsableText) {
      return t("customRecurrence");
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return t("customRecurrence");
  }
};

interface Props {
  onChange: (v: RRuleOptions | null) => void;
  // Anchor for presets and the "nth weekday" math (the event's start). Falls
  // back to the rule's own dtstart, then today.
  referenceDate?: Date;
  value?: RRuleOptions | null;
}

export const RecurrenceEditor: React.FC<Props> = ({
  value,
  onChange,
  referenceDate,
}) => {
  const { t } = useCalendarContext();

  const getReferenceDate = (rule: RRuleOptions | null) =>
    rule?.dtstart ?? referenceDate ?? toDate(now());

  const [show, setShow] = useState(Boolean(value));
  const [opts, setOpts] = useState<RRuleOptions | null>(() => value ?? null);

  const [custom, setCustom] = useState(
    () =>
      detectPreset(value ?? null, getReferenceDate(value ?? null)) ===
      "customize"
  );

  // The editor is controlled by `value` but edits its own copy between
  // emissions, so re-seed while rendering when either prop changes (a syncing
  // effect would paint the previous rule first).
  const [syncedProps, setSyncedProps] = useState({ referenceDate, value });

  if (
    syncedProps.value !== value ||
    syncedProps.referenceDate !== referenceDate
  ) {
    setSyncedProps({ referenceDate, value });
    setShow(Boolean(value));

    if (value) {
      setOpts(value);
      const ref = value.dtstart ?? referenceDate ?? toDate(now());
      setCustom(detectPreset(value, ref) === "customize");
    }
  }

  const reference = getReferenceDate(opts);

  // A throwing consumer must not crash the editor mid-interaction (e.g. when
  // an upstream form rejects an update): emit changes through this guard.
  const emitChange = (nextValue: RRuleOptions | null) => {
    try {
      onChange(nextValue);
    } catch {
      // The consumer owns its errors; the editor keeps working.
    }
  };

  const update = (
    changes: Partial<RRuleOptions>,
    cleared: ClearedRuleField[] = []
  ) => {
    if (!opts) {
      return;
    }

    const next = { ...opts, ...changes };

    for (const field of cleared) {
      CLEAR_FIELD[field](next);
    }

    setOpts(next);
    emitChange(show ? next : null);
  };

  const toggle = (checked: boolean) => {
    setShow(checked);

    if (!checked) {
      emitChange(null);

      return;
    }

    if (opts) {
      emitChange(opts);

      return;
    }

    // The form section anchors dtstart from the event's start; the editor's
    // default carries just the pattern.
    const def = { freq: FREQ.DAILY, interval: 1 } satisfies RRuleOptions;
    setOpts(def);
    setCustom(false);
    emitChange(def);
  };

  // Apply a preset, preserving any end condition (presets only set the pattern).
  const selectPreset = (chosen: RecurrencePreset) => {
    if (chosen === "customize") {
      setCustom(true);

      return;
    }

    setCustom(false);
    const rule = getPresetRRule(chosen, reference);

    if (!rule) {
      return;
    }

    const next = { ...rule, count: opts?.count, until: opts?.until };
    setOpts(next);
    emitChange(next);
  };

  const toggleDay = (day: Weekday) => {
    // The weekday picker can only express weekday objects; drop any numeric
    // entries a stored rule may carry so the emitted list matches the UI.
    const curr = resolveByweekday(opts?.byweekday).filter(
      (d): d is Weekday => typeof d === "object"
    );

    const isSelected = curr.includes(day);
    const next = isSelected ? curr.filter((d) => d !== day) : [...curr, day];
    update({ byweekday: next.length ? next : undefined });
  };

  const setEndType = (type: EndType) => {
    const changes: Partial<RRuleOptions> = {};

    if (type === "count") {
      changes.count = numberOr(opts?.count, 1);
    }

    if (type === "until") {
      changes.until =
        opts?.until ?? toDate(endOf(now().add({ months: 1 }), "day"));
    }

    update(changes, END_TYPE_FIELDS[type]);
  };

  const setUntil = (d: Date | undefined) => {
    const until = d ? toDate(endOf(toZonedDateTime(d), "day")) : undefined;
    update({ until });
  };

  // Monthly "on day N" vs "on the Nth weekday" — reuse the preset builders so
  // the weekday/position math lives in one place.
  const setMonthlyMode = (mode: "day" | "weekday") => {
    if (mode === "weekday") {
      const rule = getPresetRRule("monthlyOnWeekday", reference);
      update({ byweekday: rule?.byweekday }, ["bymonthday"]);

      return;
    }

    const rule = getPresetRRule("monthlyOnDay", reference);
    update({ bymonthday: rule?.bymonthday }, ["byweekday"]);
  };

  const editor: RecurrenceEditorContextValue = {
    custom,
    opts,
    reference,
    selectPreset,
    setEndType,
    setMonthlyMode,
    setUntil,
    toggleDay,
    update,
  };

  const showSummary = Boolean(show && value);

  return (
    <RecurrenceEditorProvider value={editor}>
      <Card data-testid="recurrence-editor">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={show}
              data-testid="toggle-recurrence"
              id="recurring"
              onCheckedChange={toggle}
            />
            <CardTitle className="text-sm">{t("repeat")}</CardTitle>
          </div>
          {showSummary && (
            <p className="text-muted-foreground text-xs">
              {getDescription(value ?? null, t)}
            </p>
          )}
        </CardHeader>

        {show ? (
          <CardContent className="pt-0">
            <div className="space-y-4">
              <RecurrencePresetSelect />
              <RecurrenceFrequencyFields />
              <RecurrenceWeekdayPicker />
              <RecurrenceMonthlyMode />
              <RecurrenceEndFields />
            </div>
          </CardContent>
        ) : null}
      </Card>
    </RecurrenceEditorProvider>
  );
};
