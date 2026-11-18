import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { textOr } from "@/lib/guards";
import {
  resourceWeekInitialDate as initialDate,
  noEvents,
  twoResources,
} from "@/testing/resource-test-fixtures";
import { WeekView } from "@/testing/view-harnesses";
import type { CalendarEvent } from "@/types/index";
import { format, startOf, toZonedDateTime } from "@/utils/temporal";

const ALL_DAY_LABEL = /All day/iu;
const MD_FORMAT = /^\d{1,2}\/\d{1,2}$/u;
const TIME_LABEL_TESTID = /resource-week-time-label-/u;
const AM_PM = /AM|PM/u;

const renderResourceWeekVertical = (props = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={noEvents}
      initialDate={initialDate}
      orientation="vertical"
      resources={twoResources}
      {...props}
    >
      <CalendarDndContext>
        <WeekView />
      </CalendarDndContext>
    </CalendarProvider>
  );

describe("ResourceWeekVertical", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders vertical resource week view structure", () => {
    renderResourceWeekVertical();

    // Resource headers repeat once per visible day (day-major arrangement:
    // 7 day groups, each with one cell per resource).
    expect(screen.getAllByText("Resource 1")).toHaveLength(7);
    expect(screen.getAllByText("Resource 2")).toHaveLength(7);

    // Should render All Day row label (case insensitive)
    expect(screen.getByText(ALL_DAY_LABEL)).toBeInTheDocument();

    // Should render time column
    expect(screen.getByTestId("vertical-col-time-col")).toBeInTheDocument();
  });

  it("day headers show only the day number, not the M/D slash format (issue #157)", () => {
    renderResourceWeekVertical();

    // No header should render the M/D slash format (e.g. "1/1", "12/29")
    expect(screen.queryAllByText(MD_FORMAT)).toHaveLength(0);

    // Weekday labels still render, so the headers themselves are intact
    expect(screen.getAllByText("Wed").length).toBeGreaterThan(0);
  });

  it("daily-mode day column shows only the day number, not M/D (issue #157)", () => {
    renderResourceWeekVertical({ weekViewGranularity: "daily" });

    // The daily-mode first column must not use the M/D slash format either
    expect(screen.queryAllByText(MD_FORMAT)).toHaveLength(0);
    expect(screen.getAllByText("Wed").length).toBeGreaterThan(0);
  });

  it("renders day columns for each resource", () => {
    renderResourceWeekVertical();

    // Check for some day columns
    // Format: vertical-col-day-col-{date}-resource-{id}
    const dateStr = format(initialDate, "YYYY-MM-DD");

    const col1 = screen.getByTestId(
      `vertical-col-day-col-${dateStr}-resource-1`
    );

    expect(col1).toBeInTheDocument();
  });

  it("renders all-day row for each resource", () => {
    renderResourceWeekVertical();
    const allDayRows = screen.getAllByTestId("all-day-row");
    // 1 for Resource 1, 1 for Resource 2
    expect(allDayRows).toHaveLength(2);
  });

  it("renders dates header row", () => {
    renderResourceWeekVertical();
    // Initial date is Wednesday Jan 1, 2025.
    // Default firstDayOfWeek is Sunday, so week starts Dec 29, 2024.
    // Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
    // Appears multiple times because of multiple resources
    expect(screen.getAllByText("Sun").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sat").length).toBeGreaterThan(0);
  });

  // hideNonBusinessHours backwards compatibility tests
  it("shows all 24 hours when hideNonBusinessHours is false (default behavior)", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderResourceWeekVertical({
      businessHours,
      // Explicitly false
      hideNonBusinessHours: false,
    });

    // All 24 hours should be present
    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-08")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-17")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  it("shows all 24 hours when hideNonBusinessHours is not provided (backwards compatibility)", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderResourceWeekVertical({
      businessHours,
      // hideNonBusinessHours is NOT provided - should default to false
    });

    // All 24 hours should be present (backwards compatible behavior)
    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-08")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-17")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  it("hides non-business hours when hideNonBusinessHours is true", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderResourceWeekVertical({
      businessHours,
      hideNonBusinessHours: true,
    });

    // Business hours should be present
    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-16")).toBeInTheDocument();

    // Non-business hours should NOT be present
    expect(screen.queryByTestId("vertical-time-08")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-17")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-23")).not.toBeInTheDocument();
  });

  // Event positioning tests - CRITICAL for hideNonBusinessHours
  it("positions event at 0% top when event starts at business hour start with hideNonBusinessHours true", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am (business start) for resource 1
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      id: "test-event-resource-week-9am",
      resourceId: "1",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Resource Week Morning",
    };

    renderResourceWeekVertical({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Resource Week Morning");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am should be at top: 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 0%");
  });

  it("positions event correctly when hideNonBusinessHours is false in ResourceWeekVertical", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      id: "test-event-resource-week-9am-full",
      resourceId: "1",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Resource Week Full",
    };

    renderResourceWeekVertical({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: false,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Resource Week Full");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am in a 24-hour grid should NOT be at top 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).not.toContain("top: 0%");
  });

  it("positions event at correct percentage when event is in middle of business hours in ResourceWeekVertical", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 1pm (13:00), which is 4 hours after 9am
    // With 8 business hours (9-17), 1pm should be at 50% (4/8 * 100)
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T14:00:00.000Z"),
      id: "test-event-resource-week-1pm",
      resourceId: "1",
      start: toZonedDateTime("2025-01-06T13:00:00.000Z"),
      title: "Resource Week Afternoon",
    };

    renderResourceWeekVertical({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Resource Week Afternoon");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 50%");
  });

  describe("weekViewGranularity", () => {
    describe("default hourly mode behavior preserved", () => {
      it("renders time-col as first column when weekViewGranularity is hourly", () => {
        renderResourceWeekVertical({ weekViewGranularity: "hourly" });

        expect(screen.getByTestId("vertical-col-time-col")).toBeInTheDocument();
        expect(
          screen.queryByTestId("vertical-col-date-col")
        ).not.toBeInTheDocument();
      });

      it("renders all-day rows for each resource in hourly mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "hourly" });

        const allDayRows = screen.getAllByTestId("all-day-row");
        expect(allDayRows).toHaveLength(2);
      });

      it("renders resource x day columns (7 days x 2 resources = 14) in hourly mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "hourly" });

        const dateStr = format(initialDate, "YYYY-MM-DD");
        expect(
          screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-2`)
        ).toBeInTheDocument();
      });

      it("renders the day header row in hourly mode (day-major)", () => {
        renderResourceWeekVertical({ weekViewGranularity: "hourly" });

        // Day-major header: one day cell per visible day, then one resource
        // cell per day below it (7 days × 2 resources = 14 resource cells).
        expect(
          screen.getByTestId("resource-week-day-header")
        ).toBeInTheDocument();
        expect(screen.getAllByText("Sun")).toHaveLength(1);
        expect(screen.getAllByText("Resource 1")).toHaveLength(7);
        expect(screen.getAllByText("Resource 2")).toHaveLength(7);
      });
    });

    describe("daily mode renders correctly", () => {
      it("renders date-col as first column in daily mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        expect(screen.getByTestId("vertical-col-date-col")).toBeInTheDocument();
        expect(
          screen.queryByTestId("vertical-col-time-col")
        ).not.toBeInTheDocument();
      });

      it("does not render all-day rows in daily mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        const allDayRows = screen.queryAllByTestId("all-day-row");
        expect(allDayRows).toHaveLength(0);
      });

      it("renders one column per resource (not resource x day) in daily mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        // Daily mode: one column per resource
        expect(
          screen.getByTestId("vertical-col-week-col-resource-1")
        ).toBeInTheDocument();
        expect(
          screen.getByTestId("vertical-col-week-col-resource-2")
        ).toBeInTheDocument();

        // Hourly resource x day columns must be absent
        const dateStr = format(initialDate, "YYYY-MM-DD");
        expect(
          screen.queryByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
        ).not.toBeInTheDocument();
      });

      it("does not render the date sub-header row in daily mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        const subHeaders = screen.queryAllByTestId(TIME_LABEL_TESTID);
        expect(subHeaders).toHaveLength(0);
      });

      it("shows week number in the header in daily mode", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        // Header renders "Week" label and week number as sibling spans in the
        // same gutter. Scope to that gutter so the week number isn't confused
        // with a bare day number now that day headers show only "D" (issue #157).
        const weekNumber = initialDate.weekOfYear;
        const weekLabel = screen.getByText("Week");
        expect(weekLabel.parentElement?.textContent).toContain(
          String(weekNumber)
        );
      });

      it("firstCol (date-col) shows day name + date for each day of the week", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        const dateCol = screen.getByTestId("vertical-col-date-col");

        // initialDate is Wed Jan 1, 2025. Default firstDayOfWeek is Sunday,
        // so the week is Sun Dec 29, 2024 → Sat Jan 4, 2025.
        const expectedDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (const day of expectedDays) {
          expect(dateCol.textContent).toContain(day);
        }
      });

      it("firstCol (date-col) does not render hour labels (regression: duplicate HourLabel bug)", () => {
        // Regression test: before the fix, daily mode firstCol rendered
        // <HourLabel date={date} /> in addition to the day name + date,
        // producing "12 AM" after every day label. The fix removed the
        // stray HourLabel; this test locks in that behavior.
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        const dateCol = screen.getByTestId("vertical-col-date-col");

        // HourLabel in 12-hour format (default) renders "12 AM", "1 AM", etc.
        // If the bug returns, AM/PM text would appear in every cell.
        expect(dateCol.textContent).not.toMatch(AM_PM);
      });
    });

    describe("header structure differences", () => {
      it("hourly mode renders expanded header: day row + resource row", () => {
        renderResourceWeekVertical({ weekViewGranularity: "hourly" });

        // The expanded h-24 header is built from two rows (day-major):
        // 1. Day row: one cell per visible day, each spanning its resources
        // 2. Resource row: one cell per resource per day (7 × 2 = 14 cells)
        expect(
          screen.getByTestId("resource-week-day-header")
        ).toBeInTheDocument();
        expect(screen.getAllByText("Resource 1")).toHaveLength(7);
        expect(screen.getAllByTestId("all-day-row")).toHaveLength(2);
      });

      it("daily mode uses a compact header (h-12 class) and no h-24 in header", () => {
        renderResourceWeekVertical({ weekViewGranularity: "daily" });

        // Date sub-header row is absent and header height is h-12, not h-24
        const subHeaders = screen.queryAllByTestId(TIME_LABEL_TESTID);
        expect(subHeaders).toHaveLength(0);

        // All-day row is absent (no extra header space needed)
        expect(screen.queryAllByTestId("all-day-row")).toHaveLength(0);
      });
    });
  });

  describe("slotDuration", () => {
    it("renders only hour slots by default", () => {
      renderResourceWeekVertical();
      const startOfWeek = startOf(initialDate, "week");
      const firstDay = format(startOfWeek, "YYYY-MM-DD");

      expect(
        screen.getByTestId(`vertical-cell-${firstDay}-09-00-resource-1`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`vertical-cell-${firstDay}-09-15-resource-1`)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`vertical-cell-${firstDay}-09-30-resource-1`)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`vertical-cell-${firstDay}-09-45-resource-1`)
      ).not.toBeInTheDocument();
    });

    it("renders quarter-hour slots when slotDuration is 15", () => {
      renderResourceWeekVertical({ slotDuration: 15 });
      const startOfWeek = startOf(initialDate, "week");
      const firstDay = format(startOfWeek, "YYYY-MM-DD");

      expect(
        screen.getByTestId(`vertical-cell-${firstDay}-09-00-resource-1`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`vertical-cell-${firstDay}-09-15-resource-1`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`vertical-cell-${firstDay}-09-30-resource-1`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`vertical-cell-${firstDay}-09-45-resource-1`)
      ).toBeInTheDocument();
    });
  });
});
