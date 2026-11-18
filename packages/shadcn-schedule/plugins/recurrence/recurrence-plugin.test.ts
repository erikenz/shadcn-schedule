import { describe, expect, it } from "vitest";

import { recurrencePlugin } from "@/plugins/recurrence/recurrence-plugin";
import { FREQ } from "@/plugins/recurrence/utils/recurrence-constants";
import type { CalendarEvent } from "@/types/index";
import { isSame, toZonedDateTime } from "@/utils/temporal";

const base: CalendarEvent = {
  end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
  id: "daily-1",
  rrule: {
    dtstart: new Date("2025-01-06T09:00:00.000Z"),
    freq: FREQ.DAILY,
    interval: 1,
  },
  start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
  title: "Daily",
  uid: "daily-1@calendar.local",
};

const range = {
  end: toZonedDateTime("2025-01-08T23:59:59.999Z"),
  start: toZonedDateTime("2025-01-06T00:00:00.000Z"),
};

describe(recurrencePlugin, () => {
  it("managesEvent matches the previous isRecurringEvent gate", () => {
    const plugin = recurrencePlugin();
    // An event is managed if it has an rrule (base), a recurrenceId (modified
    // instance), or a uid (generated instance). A plain event with none of
    // those is not managed.
    expect(plugin.managesEvent?.(base)).toBeTruthy();
    expect(
      plugin.managesEvent?.({
        ...base,
        recurrenceId: "2025-01-08T09:00:00.000Z",
        rrule: null,
        uid: null,
      })
    ).toBeTruthy();

    const plain = {
      end: base.end,
      id: "plain",
      start: base.start,
      title: "Plain",
    };

    expect(plugin.managesEvent?.(plain)).toBeFalsy();
  });

  it("transformEvents expands an rrule event into its occurrences", () => {
    const plugin = recurrencePlugin();
    const occurrences = plugin.transformEvents?.([base], range);
    expect(occurrences?.length).toBe(3);
  });

  it("transformEvents merges a detached override into its occurrence", () => {
    const plugin = recurrencePlugin();

    const override = {
      ...base,
      end: toZonedDateTime("2025-01-07T15:00:00.000Z"),
      id: "daily-1_override",
      recurrenceId: "2025-01-07T09:00:00.000Z",
      rrule: null,
      start: toZonedDateTime("2025-01-07T14:00:00.000Z"),
      title: "Moved",
    };

    const occurrences = plugin.transformEvents?.([base, override], range);

    const moved = occurrences?.find((e) =>
      isSame(e.start, toZonedDateTime("2025-01-07T14:00:00.000Z"))
    );

    expect(moved?.title).toBe("Moved");
  });

  it("transformEvents passes a non-rrule event through untouched", () => {
    const plugin = recurrencePlugin();
    const plain = { ...base, id: "plain", rrule: null };
    expect(plugin.transformEvents?.([plain], range)).toStrictEqual([plain]);
  });

  it("contribute returns the RRULE line for a base event at the ical point", () => {
    const plugin = recurrencePlugin();
    const lines = plugin.contribute?.("ical:vevent-properties", base);
    expect(lines).toStrictEqual(["RRULE:FREQ=DAILY"]);
  });

  it("contribute returns the EXDATE line for an event with exdates", () => {
    const plugin = recurrencePlugin();

    const withExdates = {
      ...base,
      exdates: ["2025-01-07T09:00:00.000Z", "2025-01-08T09:00:00.000Z"],
    };

    const lines = plugin.contribute?.("ical:vevent-properties", withExdates);
    expect(lines).toStrictEqual([
      "RRULE:FREQ=DAILY",
      "EXDATE:20250107T090000Z,20250108T090000Z",
    ]);
  });

  it("contribute returns the RECURRENCE-ID line for a modified instance", () => {
    const plugin = recurrencePlugin();

    const modified = {
      ...base,
      recurrenceId: "2025-01-07T09:00:00.000Z",
      rrule: null,
    };

    const lines = plugin.contribute?.("ical:vevent-properties", modified);
    expect(lines).toStrictEqual(["RECURRENCE-ID:20250107T090000Z"]);
  });

  it("contribute returns an empty array for an unrelated point", () => {
    const plugin = recurrencePlugin();
    expect(plugin.contribute?.("some:other-point", base)).toStrictEqual([]);
  });
});
