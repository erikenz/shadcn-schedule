import { hasRef } from "@/lib/guards";
import type { RRuleOptions, Weekday } from "@/plugins/recurrence/types";
import {
  FREQ,
  WEEKDAY_ORDER,
  WEEKDAYS,
  isWeekday,
  withNth,
} from "@/plugins/recurrence/utils/recurrence-constants";
import { format, toZonedDateTime, weekday } from "@/utils/temporal";

// Google-Calendar-style quick presets. `once` is the absence of a rule; the
// `customize` option opens the detailed editor and has no rule of its own.
export type RecurrencePreset =
  | "once"
  | "daily"
  | "weekdays"
  | "weeklyOnDay"
  | "monthlyOnDay"
  | "monthlyOnWeekday"
  | "customize";

// Weekday objects in display order (0 = Sunday … 6 = Saturday).
const RRULE_WEEKDAYS = WEEKDAY_ORDER;

const WEEKDAY_PRESET = [
  WEEKDAYS.MO,
  WEEKDAYS.TU,
  WEEKDAYS.WE,
  WEEKDAYS.TH,
  WEEKDAYS.FR,
];

const ORDINALS = ["first", "second", "third", "fourth"];

const getRRuleWeekday = (date: Date) =>
  RRULE_WEEKDAYS.at(weekday(toZonedDateTime(date))) ?? WEEKDAYS.SU;

// Which occurrence of its own weekday a date is within its month: 1–4, or -1
// for the last one (no further same-weekday date remains that month).
export const getNthWeekdayOfMonth = (date: Date) => {
  const ref = toZonedDateTime(date);
  const isLastOccurrence = ref.add({ days: 7 }).month !== ref.month;

  return isLastOccurrence ? -1 : Math.ceil(ref.day / 7);
};

// The pattern (frequency + by-rules) for each concrete preset, anchored at
// `start`. `once`/`customize` are absent, so getPresetRRule returns null for them.
type PresetPattern = (start: Date) => {
  freq: RRuleOptions["freq"];
  byweekday?: RRuleOptions["byweekday"];
  bymonthday?: RRuleOptions["bymonthday"];
};

const PRESET_PATTERNS: Partial<Record<RecurrencePreset, PresetPattern>> = {
  daily: () => ({ freq: FREQ.DAILY }),
  monthlyOnDay: (start) => ({
    bymonthday: toZonedDateTime(start).day,
    freq: FREQ.MONTHLY,
  }),
  monthlyOnWeekday: (start) => ({
    byweekday: [withNth(getRRuleWeekday(start), getNthWeekdayOfMonth(start))],
    freq: FREQ.MONTHLY,
  }),
  weekdays: () => ({ byweekday: WEEKDAY_PRESET, freq: FREQ.WEEKLY }),
  weeklyOnDay: (start) => ({
    byweekday: [getRRuleWeekday(start)],
    freq: FREQ.WEEKLY,
  }),
};

// Map a high-level preset to a full rule anchored at `start`. `once`/`customize`
// produce no rule of their own.
export const getPresetRRule = (
  preset: RecurrencePreset,
  start: Date
): RRuleOptions | null => {
  const pattern = PRESET_PATTERNS[preset];

  if (!pattern) {
    return null;
  }

  return { dtstart: start, interval: 1, ...pattern(start) };
};

// Normalize a byweekday value (Weekday, number, array, or absent) into a stable
// comparable key, e.g. "0:2" for "2nd Monday".
const getWeekdayKey = (value: RRuleOptions["byweekday"]) => {
  if (value === null || value === undefined) {
    return "";
  }

  const list = Array.isArray(value) ? value : [value];

  return list
    .map((day) =>
      isWeekday(day) ? `${day.weekday}:${day.n ?? ""}` : `${day}:`
    )
    .toSorted()
    .join(",");
};

// Two rules describe the same recurrence pattern (ignoring end conditions, which
// the editor handles independently of the preset).
const isSamePattern = (a: RRuleOptions, b: RRuleOptions | null) => {
  if (!b) {
    return false;
  }

  const sameFreq = a.freq === b.freq;
  const sameDays = getWeekdayKey(a.byweekday) === getWeekdayKey(b.byweekday);
  const sameMonthday = (a.bymonthday ?? null) === (b.bymonthday ?? null);

  return sameFreq && sameDays && sameMonthday;
};

const SIMPLE_PRESETS: RecurrencePreset[] = [
  "daily",
  "weekdays",
  "weeklyOnDay",
  "monthlyOnDay",
  "monthlyOnWeekday",
];

// Identify which preset an existing rule represents so the picker can reflect a
// saved series. A non-1 interval or any unmatched pattern falls to `customize`;
// count/until are ignored (end conditions stay editable on any preset).
export const detectPreset = (
  opts: RRuleOptions | null,
  reference: Date
): RecurrencePreset => {
  if (!opts) {
    return "once";
  }

  const hasCustomInterval = Boolean(opts.interval) && opts.interval !== 1;

  if (hasCustomInterval) {
    return "customize";
  }

  const match = SIMPLE_PRESETS.find((preset) =>
    isSamePattern(opts, getPresetRRule(preset, reference))
  );

  return match ?? "customize";
};

// Human-readable label for a preset, anchored at `reference` (e.g. "Weekly on
// Monday", "Monthly on the second Tuesday").
export const getPresetLabel = (
  preset: RecurrencePreset,
  reference: Date,
  t: (key: string) => string
) => {
  const dayName = format(toZonedDateTime(reference), "dddd");
  const nth = getNthWeekdayOfMonth(reference);
  const ordinalKey = nth === -1 ? "last" : (ORDINALS.at(nth - 1) ?? "last");
  const ordinal = t(ordinalKey);

  const labels: Partial<Record<RecurrencePreset, string>> = {
    daily: t("daily"),
    monthlyOnDay: `${t("monthlyOnDay")} ${toZonedDateTime(reference).day}`,
    monthlyOnWeekday: `${t("monthlyOnThe")} ${ordinal} ${dayName}`,
    weekdays: t("everyWeekday"),
    weeklyOnDay: `${t("weeklyOn")} ${dayName}`,
  };

  return labels[preset] ?? t("customRecurrence");
};

// Normalize rrule's byweekday (a single value, an array, or absent) to an array.
export const resolveByweekday = (
  value: RRuleOptions["byweekday"]
): (Weekday | number)[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return hasRef(value) ? [value] : [];
};
