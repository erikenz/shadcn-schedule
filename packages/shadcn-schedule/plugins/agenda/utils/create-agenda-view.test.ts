import { describe, expect, it } from "vitest";

import { createAgendaView } from "@/plugins/agenda/utils/create-agenda-view";
import { format, toZonedDateTime } from "@/utils/temporal";

const date = toZonedDateTime("2026-06-13T12:00:00");
const cfg = { firstDayOfWeek: 0 };

describe(createAgendaView, () => {
  it("defaults to standard agenda view metadata", () => {
    const view = createAgendaView();
    expect(view.name).toBe("agenda");
    expect(view.label).toBe("agenda");
    expect(view.supportsResources).toBeFalsy();
    expect(view.navigationStep).toStrictEqual({ amount: 1, unit: "month" });
  });

  it("defaults to a month window range", () => {
    const view = createAgendaView();
    const range = view.range?.(date, cfg);
    expect(range ? format(range.start, "YYYY-MM-DD") : undefined).toBe(
      "2026-06-01"
    );
    expect(range ? format(range.end, "YYYY-MM-DD") : undefined).toBe(
      "2026-06-30"
    );
  });

  it("scopes a day window to the reference day", () => {
    const view = createAgendaView({ window: "day" });
    expect(view.navigationStep).toStrictEqual({ amount: 1, unit: "day" });
    const range = view.range?.(date, cfg);
    expect(range ? format(range.start, "YYYY-MM-DD") : undefined).toBe(
      "2026-06-13"
    );
    expect(range ? format(range.end, "YYYY-MM-DD") : undefined).toBe(
      "2026-06-13"
    );
  });

  it("aligns a week window to firstDayOfWeek", () => {
    const view = createAgendaView({ window: "week" });
    expect(view.navigationStep).toStrictEqual({ amount: 1, unit: "week" });
    // 2026-06-13 is a Saturday; Sunday-start week is 06-07..06-13.
    const sundayStart = view.range?.(date, { firstDayOfWeek: 0 });
    expect(
      sundayStart ? format(sundayStart.start, "YYYY-MM-DD") : undefined
    ).toBe("2026-06-07");
    expect(
      sundayStart ? format(sundayStart.end, "YYYY-MM-DD") : undefined
    ).toBe("2026-06-13");
    // Monday-start week shifts to 06-08..06-14.
    const mondayStart = view.range?.(date, { firstDayOfWeek: 1 });
    expect(
      mondayStart ? format(mondayStart.start, "YYYY-MM-DD") : undefined
    ).toBe("2026-06-08");
    expect(
      mondayStart ? format(mondayStart.end, "YYYY-MM-DD") : undefined
    ).toBe("2026-06-14");
  });

  it("supports a fixed N-day window stepped by N days", () => {
    const view = createAgendaView({ window: 7 });
    expect(view.navigationStep).toStrictEqual({ amount: 7, unit: "day" });
    const range = view.range?.(date, cfg);
    expect(range ? format(range.start, "YYYY-MM-DD") : undefined).toBe(
      "2026-06-13"
    );
    expect(range ? format(range.end, "YYYY-MM-DD") : undefined).toBe(
      "2026-06-19"
    );
  });

  it("renders via a component (escape hatch)", () => {
    expect(createAgendaView().component).toBeTypeOf("function");
  });
});
