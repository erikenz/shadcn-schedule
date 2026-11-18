import { cleanup, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { VerticalGridCol } from "@/components/vertical-grid/vertical-grid-col";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { hasText } from "@/lib/guards";
import { diff, format, toZonedDateTime } from "@/utils/temporal";

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const FLEX_COL_CLASS = /\bflex-col\b/u;
const FLEX_1_CLASS = /\bflex-1\b/u;
const FIXED_HEIGHT_CLASS = /\bh-\[15px\]\b/u;

const mockDays = [
  initialDate.with({ hour: 9 }),
  initialDate.with({ hour: 10 }),
];

const renderVerticalGridCol = (props = {}) => {
  const defaultProps = {
    day: initialDate,
    days: mockDays,
    gridType: "hour" as const,
    id: "test-col",
  };

  // Use CalendarProvider to ensure getEventsForResource is available
  return render(
    <CalendarProvider
      dayMaxEvents={3}
      events={[]}
      initialDate={initialDate}
      resources={[]}
    >
      <VerticalGridCol {...defaultProps} {...props} />
    </CalendarProvider>
  );
};

describe(VerticalGridCol, () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders with default id", () => {
    renderVerticalGridCol();
    expect(screen.getByTestId("vertical-col-test-col")).toBeInTheDocument();
  });

  it("renders custom testid if provided", () => {
    renderVerticalGridCol({ "data-testid": "custom-col-id" });
    expect(screen.getByTestId("custom-col-id")).toBeInTheDocument();
  });

  it("renders time labels when id is time-col", () => {
    renderVerticalGridCol({
      id: "time-col",
      renderCell: (date: Temporal.ZonedDateTime) => (
        <span>{format(date, "HH:mm")}</span>
      ),
    });

    expect(screen.getByTestId("vertical-time-09")).toHaveTextContent("09:00");
    expect(screen.getByTestId("vertical-time-10")).toHaveTextContent("10:00");
  });

  it("grid container draws lines via gap-px and bg-border", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol();
    const cell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`);
    const gridContainer = cell.closest("div.grid");
    expect(gridContainer).not.toBeNull();
    const gridClasses = gridContainer?.className.split(" ") ?? [];
    expect(gridClasses).toContain("gap-px");
    expect(gridClasses).toContain("bg-border");
  });

  it("cells carry no per-cell border classes", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol();
    const cell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`);
    const cellClasses = cell.className.split(" ");
    expect(cellClasses).not.toContain("border-r");
    expect(cellClasses).not.toContain("border-r-0");
    expect(cellClasses).not.toContain("border-b");
    expect(cellClasses).not.toContain("border-b-0");
  });

  it("no day cell carries a per-cell separator regardless of position", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol();

    // mockDays = [09:00, 10:00]; with gap-based lines neither the first nor
    // the last row gets a per-cell border-r/border-b.
    const firstHour = screen
      .getByTestId(`vertical-cell-${dateStr}-09-00`)
      .className.split(" ");

    const lastHour = screen
      .getByTestId(`vertical-cell-${dateStr}-10-00`)
      .className.split(" ");

    expect(firstHour).not.toContain("border-b");
    expect(firstHour).not.toContain("border-r");
    expect(lastHour).not.toContain("border-b");
    expect(lastHour).not.toContain("border-r");
  });

  it("the gutter draws its right separator with a box-shadow, not border-r", () => {
    renderVerticalGridCol({
      className:
        "shadow-[1px_0_0_0_color-mix(in_oklch,var(--background),var(--foreground)_10%)]",
      id: "time-col",
      renderCell: (date: Temporal.ZonedDateTime) => (
        <span>{format(date, "HH:mm")}</span>
      ),
    });
    const gutter = screen.getByTestId("vertical-col-time-col");
    expect(gutter.className).toContain("shadow-[1px_0_0_0");
    expect(gutter.className.split(" ")).not.toContain("border-r");
  });

  it("renders cells with correct IDs", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol();

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
    ).toBeInTheDocument();
  });

  it("includes the resource id in cell IDs when a resource is provided", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol({ resource: { id: "res-1", title: "Resource 1" } });

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-res-1`)
    ).toBeInTheDocument();
  });

  it("renders minute slots when slotDurationMinutes is provided", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol({
      slotDurationMinutes: 30,
    });

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-30`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-10-00`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-10-30`)
    ).toBeInTheDocument();
  });

  it("groups quarter-hour cells under one hour wrapper that shares the row equally", () => {
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol({
      slotDurationMinutes: 15,
    });

    const nineZero = screen.getByTestId(`vertical-cell-${dateStr}-09-00`);
    const nineFifteen = screen.getByTestId(`vertical-cell-${dateStr}-09-15`);
    const nineThirty = screen.getByTestId(`vertical-cell-${dateStr}-09-30`);
    const nineFortyFive = screen.getByTestId(`vertical-cell-${dateStr}-09-45`);

    // All 4 quarter-hour cells for 09:00 must share the same direct parent
    // so CSS Grid treats them as one row, not four scattered children.
    const wrapper = nineZero.parentElement;
    expect(wrapper).not.toBeNull();
    expect(nineFifteen.parentElement).toBe(wrapper);
    expect(nineThirty.parentElement).toBe(wrapper);
    expect(nineFortyFive.parentElement).toBe(wrapper);

    // The wrapper must be a flex column so the 4 cells split the hour evenly.
    expect(wrapper?.className).toMatch(FLEX_COL_CLASS);

    // Each quarter-hour cell must use flex-1 (1/N share) and NOT a fixed
    // h-[15px] that would bunch cells at the bottom of taller rows.
    for (const cell of [nineZero, nineFifteen, nineThirty, nineFortyFive]) {
      expect(cell.className).toMatch(FLEX_1_CLASS);
      expect(cell.className).not.toMatch(FIXED_HEIGHT_CLASS);
    }
  });

  it('daily cells (gridType="day") describe a full-day range, not a 1-hour slot', () => {
    // A daily-granularity vertical cell (resource month, week-daily) must span
    // the whole day like the horizontal grid does, so drag-to-create's
    // full-day-span region rule lets a selection cross days. Passing the hour
    // through made it a 00:00-01:00 slot and broke multi-day selection.
    const dateStr = format(initialDate, "YYYY-MM-DD");
    renderVerticalGridCol({ days: [initialDate], gridType: "day" });

    const cell = screen.getByTestId(`vertical-cell-${dateStr}-00-00`);
    const startISO = cell.dataset.start;
    const endISO = cell.dataset.end;
    expect(startISO).not.toBeNull();
    expect(endISO).not.toBeNull();
    expect(
      hasText(endISO) && hasText(startISO)
        ? Math.trunc(
            diff(toZonedDateTime(endISO), toZonedDateTime(startISO), "hour")
          )
        : null
    ).toBe(23);
  });

  it("renders events layer by default", () => {
    renderVerticalGridCol();
    expect(screen.getByTestId("vertical-events-test-col")).toBeInTheDocument();
  });

  it("does not render events layer if noEvents is true", () => {
    renderVerticalGridCol({ noEvents: true });
    expect(
      screen.queryByTestId("vertical-events-test-col")
    ).not.toBeInTheDocument();
  });
});
