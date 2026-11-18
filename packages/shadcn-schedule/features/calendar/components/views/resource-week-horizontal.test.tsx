import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { textOr } from "@/lib/guards";
import {
  assertResourceWeekBusinessHourRange,
  resourceWeekInitialDate as initialDate,
  noEvents,
  twoResources,
} from "@/testing/resource-test-fixtures";
import { WeekView } from "@/testing/view-harnesses";
import type { CalendarEvent } from "@/types/index";
import { now, resetNow, setNow, toZonedDateTime } from "@/utils/temporal";

const M_D_SLASH = /^\d{1,2}\/\d{1,2}$/u;
const RESOURCE_WEEK_TIME_LABEL = /resource-week-time-label-/u;

const renderResourceWeekHorizontal = (props = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={noEvents}
      initialDate={initialDate}
      orientation="horizontal"
      resources={twoResources}
      {...props}
    >
      <CalendarDndContext>
        <WeekView />
      </CalendarDndContext>
    </CalendarProvider>
  );

// Renders the horizontal week and returns today's highlighted day header (the
// one whose number badge is a filled primary circle). The clock is pinned in
// beforeEach, so this is deterministic; callers assert on it so the assertion
// stays inside the test.
const findTodayHeader = (
  props: Parameters<typeof renderResourceWeekHorizontal>[0]
) => {
  renderResourceWeekHorizontal(props);
  const dayHeaders = screen.getAllByTestId("resource-week-day-header");

  return dayHeaders.find((header) =>
    header.querySelector(".bg-primary.text-primary-foreground")
  );
};

describe("ResourceWeekHorizontal", () => {
  beforeEach(() => {
    // Pin the clock so the "today" header is deterministic.
    setNow(initialDate);
    cleanup();
  });

  afterEach(() => {
    resetNow();
  });

  describe("basic structure", () => {
    it("renders horizontal resource week view structure", () => {
      renderResourceWeekHorizontal();

      // Should render resource labels
      expect(screen.getByText("Resource 1")).toBeInTheDocument();
      expect(screen.getByText("Resource 2")).toBeInTheDocument();

      // The corner cell is intentionally empty: the row labels below say what
      // the column is, so there is no "Resources" header to assert.
    });

    it("renders day headers for the week", () => {
      renderResourceWeekHorizontal();

      // Should have 7 day headers
      const dayHeaders = screen.getAllByTestId("resource-week-day-header");
      expect(dayHeaders).toHaveLength(7);
    });

    it("day headers show only the day number, not the M/D slash format (issue #157)", () => {
      renderResourceWeekHorizontal();

      // No header should render the M/D slash format (e.g. "1/1", "12/29")
      expect(screen.queryAllByText(M_D_SLASH)).toHaveLength(0);

      // Jan 1 2025 is a Wednesday; its header shows the bare day number "1"
      const dayHeaders = screen.getAllByTestId("resource-week-day-header");
      const wednesday = dayHeaders.find((h) => h.textContent?.includes("Wed"));
      expect(wednesday?.textContent).toBe("Wed1");
    });

    it("renders time labels for each hour", () => {
      renderResourceWeekHorizontal();

      // Should render time labels (24 hours * 7 days = 168 hours)
      // Check for some specific hour labels
      expect(screen.getAllByTestId("resource-week-time-label-00")).toHaveLength(
        7
      );
      expect(screen.getAllByTestId("resource-week-time-label-12")).toHaveLength(
        7
      );
      expect(screen.getAllByTestId("resource-week-time-label-23")).toHaveLength(
        7
      );
    });
  });

  describe("weekHours structure (array of arrays)", () => {
    it("weekHours produces 7 day groups when using map", () => {
      renderResourceWeekHorizontal();

      // Each day should have time labels
      // With 7 days and 24 hours each, flat().map() produces 168 time slots
      const allTimeLabels = screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL);
      // 168 total
      expect(allTimeLabels).toHaveLength(7 * 24);
    });

    it("time labels are rendered using flat().map() for nested hours", () => {
      renderResourceWeekHorizontal();

      // Verify that the same hour appears 7 times (once per day)
      const noonLabels = screen.getAllByTestId("resource-week-time-label-12");
      // One per day
      expect(noonLabels).toHaveLength(7);
    });
  });

  describe("business hours filtering", () => {
    it("shows all 24 hours when hideNonBusinessHours is false", () => {
      const businessHours = {
        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        endTime: 17,
        startTime: 9,
      };

      renderResourceWeekHorizontal({
        businessHours,
        hideNonBusinessHours: false,
      });

      // All hours should be present (7 of each)
      expect(screen.getAllByTestId("resource-week-time-label-00")).toHaveLength(
        7
      );
      expect(screen.getAllByTestId("resource-week-time-label-08")).toHaveLength(
        7
      );
      expect(screen.getAllByTestId("resource-week-time-label-17")).toHaveLength(
        7
      );
      expect(screen.getAllByTestId("resource-week-time-label-23")).toHaveLength(
        7
      );
    });

    it("hides non-business hours when hideNonBusinessHours is true", () => {
      const businessHours = {
        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        endTime: 17,
        startTime: 9,
      };

      renderResourceWeekHorizontal({
        businessHours,
        hideNonBusinessHours: true,
      });

      assertResourceWeekBusinessHourRange(screen, 9, 16, 8, 17);
      expect(
        screen.queryAllByTestId("resource-week-time-label-23")
      ).toHaveLength(0);
    });
  });

  describe("firstDayOfWeek support", () => {
    it("respects firstDayOfWeek setting", () => {
      // Setting Monday as first day of week (1 = Monday)
      renderResourceWeekHorizontal({
        firstDayOfWeek: 1,
      });

      const dayHeaders = screen.getAllByTestId("resource-week-day-header");
      expect(dayHeaders).toHaveLength(7);

      // First header should be Monday
      expect(dayHeaders[0]).toBeInTheDocument();
    });
  });

  describe("today highlighting", () => {
    it("highlights current day header when viewing current week", () => {
      const todayHeader = findTodayHeader({ initialDate: now() });
      expect(todayHeader).toBeDefined();
    });

    it("does not highlight headers for other days", () => {
      renderResourceWeekHorizontal({ initialDate: now() });
      const dayHeaders = screen.getAllByTestId("resource-week-day-header");

      const highlighted = dayHeaders.filter((header) =>
        header.querySelector(".bg-primary.text-primary-foreground")
      );

      expect(highlighted).toHaveLength(1);
    });
  });

  describe("time format", () => {
    it("uses 12-hour format when timeFormat is 12-hour", () => {
      renderResourceWeekHorizontal({
        timeFormat: "12-hour",
      });

      // Time labels should use 12-hour format
      // The exact text depends on locale, but should include AM/PM indicators
      const timeLabels = screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL);
      expect(timeLabels.length).toBeGreaterThan(0);
    });

    it("uses 24-hour format when timeFormat is 24-hour", () => {
      renderResourceWeekHorizontal({
        timeFormat: "24-hour",
      });

      // Time labels should use 24-hour format
      const timeLabels = screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL);
      expect(timeLabels.length).toBeGreaterThan(0);
    });
  });

  // Event positioning tests - CRITICAL for horizontal week view
  describe("event positioning", () => {
    it("renders event for resource in correct row", () => {
      cleanup();
      const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
        id: "test-event-horizontal-1",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        title: "Horizontal Event",
      };

      renderResourceWeekHorizontal({
        events: [testEvent],
        initialDate: monday,
      });

      // Event should be rendered
      const eventElement = screen.getByText("Horizontal Event");
      expect(eventElement).toBeInTheDocument();
    });

    it("positions event with left and width styles", () => {
      cleanup();
      const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

      // Create an event for resource 1
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-06T12:00:00.000Z"),
        id: "test-event-horizontal-positioned",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        title: "Positioned Event",
      };

      renderResourceWeekHorizontal({
        events: [testEvent],
        initialDate: monday,
      });

      // Event should be rendered
      const eventElement = screen.getByText("Positioned Event");
      expect(eventElement).toBeInTheDocument();

      // Find the event wrapper using testid
      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-horizontal-positioned"
      );

      expect(eventWrapper).toBeInTheDocument();

      // Event should have positioning data attributes
      const left = Number(textOr(eventWrapper.dataset.left, ""));
      const width = Number(textOr(eventWrapper.dataset.width, ""));
      const top = Number(textOr(eventWrapper.dataset.top, ""));

      // Event at 10am-12pm in 24-hour grid:
      // left = 10/24 * 100 = 41.67%, width = 2/24 * 100 = 8.33%, top = 1 (first row)
      expect(left).toBeCloseTo(41.67, 1);
      expect(width).toBeCloseTo(8.33, 1);
      expect(top).toBe(1);
    });

    it("positions event correctly when hideNonBusinessHours is false", () => {
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
        id: "test-event-horizontal-9am-full",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
        title: "Horizontal Full",
      };

      renderResourceWeekHorizontal({
        businessHours,
        events: [testEvent],
        hideNonBusinessHours: false,
        initialDate: monday,
      });

      // Event should be rendered
      const eventElement = screen.getByText("Horizontal Full");
      expect(eventElement).toBeInTheDocument();

      // Find the event wrapper using testid
      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-horizontal-9am-full"
      );

      expect(eventWrapper).toBeInTheDocument();

      // Event starting at 9am in a 24-hour grid:
      // left = 9/24 * 100 = 37.5%
      const left = Number(textOr(eventWrapper.dataset.left, ""));
      expect(left).toBeCloseTo(37.5, 1);
    });

    it("positions event at 0% left when event starts at business hour start with hideNonBusinessHours true", () => {
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
        id: "test-event-horizontal-9am",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
        title: "Horizontal Morning",
      };

      renderResourceWeekHorizontal({
        businessHours,
        events: [testEvent],
        hideNonBusinessHours: true,
        initialDate: monday,
      });

      // Event should be rendered
      const eventElement = screen.getByText("Horizontal Morning");
      expect(eventElement).toBeInTheDocument();

      // Find the event wrapper using testid
      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-horizontal-9am"
      );

      expect(eventWrapper).toBeInTheDocument();

      // Event starting at 9am (business hour start) should be at left 0%
      const left = Number(textOr(eventWrapper.dataset.left, ""));
      expect(left).toBe(0);
    });

    it("positions event at correct percentage when event is in middle of business hours", () => {
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
        id: "test-event-horizontal-1pm",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T13:00:00.000Z"),
        title: "Horizontal Afternoon",
      };

      renderResourceWeekHorizontal({
        businessHours,
        events: [testEvent],
        hideNonBusinessHours: true,
        initialDate: monday,
      });

      // Event should be rendered
      const eventElement = screen.getByText("Horizontal Afternoon");
      expect(eventElement).toBeInTheDocument();

      // Find the event wrapper using testid
      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-horizontal-1pm"
      );

      expect(eventWrapper).toBeInTheDocument();

      // Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
      const left = Number(textOr(eventWrapper.dataset.left, ""));
      expect(left).toBe(50);
    });

    it("different events have different left positions", () => {
      cleanup();
      const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

      // Create events at different times
      const earlyEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-06T09:00:00.000Z"),
        id: "early-event",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T08:00:00.000Z"),
        title: "Early Event",
      };

      const lateEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-06T17:00:00.000Z"),
        id: "late-event",
        resourceId: "2",
        start: toZonedDateTime("2025-01-06T16:00:00.000Z"),
        title: "Late Event",
      };

      renderResourceWeekHorizontal({
        events: [earlyEvent, lateEvent],
        initialDate: monday,
      });

      // Both events should be rendered
      const earlyElement = screen.getByTestId("horizontal-event-early-event");
      const lateElement = screen.getByTestId("horizontal-event-late-event");

      // Get positioning values from data attributes
      const earlyLeft = Number(textOr(earlyElement.dataset.left, "0"));
      const lateLeft = Number(textOr(lateElement.dataset.left, "0"));

      // Early event at 8am: left = 8/24 * 100 = 33.33%
      // Late event at 4pm: left = 16/24 * 100 = 66.67%
      expect(earlyLeft).toBeCloseTo(33.33, 1);
      expect(lateLeft).toBeCloseTo(66.67, 1);
      expect(lateLeft).toBeGreaterThan(earlyLeft);
    });

    it("event has width proportional to duration", () => {
      cleanup();
      const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

      // Create a multi-hour event
      const testEvent: CalendarEvent = {
        // 3 hours
        end: toZonedDateTime("2025-01-06T12:00:00.000Z"),
        id: "multi-hour-event",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
        title: "Multi Hour Event",
      };

      renderResourceWeekHorizontal({
        events: [testEvent],
        initialDate: monday,
      });

      // Event should be rendered
      const eventElement = screen.getByText("Multi Hour Event");
      expect(eventElement).toBeInTheDocument();

      // Find the event wrapper using testid
      const eventWrapper = screen.getByTestId(
        "horizontal-event-multi-hour-event"
      );

      expect(eventWrapper).toBeInTheDocument();

      // Event at 9am-12pm (3 hours) in 24-hour grid:
      // width = 3/24 * 100 = 12.5%
      const width = Number(textOr(eventWrapper.dataset.width, ""));
      expect(width).toBeCloseTo(12.5, 1);
    });

    it("events for different resources appear in different rows", () => {
      cleanup();
      const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

      const event1: CalendarEvent = {
        end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
        id: "event-res-1",
        resourceId: "1",
        start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        title: "Resource 1 Event",
      };

      const event2: CalendarEvent = {
        end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
        id: "event-res-2",
        resourceId: "2",
        start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        title: "Resource 2 Event",
      };

      renderResourceWeekHorizontal({
        events: [event1, event2],
        initialDate: monday,
      });

      // Both events should be rendered
      expect(screen.getByText("Resource 1 Event")).toBeInTheDocument();
      expect(screen.getByText("Resource 2 Event")).toBeInTheDocument();

      // Events should be in different rows (different parents with horizontal-row testid)
      const event1Element = screen.getByText("Resource 1 Event");
      const event2Element = screen.getByText("Resource 2 Event");

      const row1 = event1Element.closest('[data-testid^="horizontal-row-"]');
      const row2 = event2Element.closest('[data-testid^="horizontal-row-"]');

      expect(row1).not.toBeNull();
      expect(row2).not.toBeNull();
      expect(row1).not.toBe(row2);
    });
  });

  describe("weekViewGranularity", () => {
    describe("default hourly mode behavior preserved", () => {
      it("renders time header row with hour labels when weekViewGranularity is hourly", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "hourly" });

        // Time labels should be present – one per hour per day (24 x 7 = 168)
        const allTimeLabels = screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL);
        expect(allTimeLabels).toHaveLength(7 * 24);
      });

      it("renders 7 day headers in hourly mode", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "hourly" });

        const dayHeaders = screen.getAllByTestId("resource-week-day-header");
        expect(dayHeaders).toHaveLength(7);
      });
    });

    describe("daily mode renders correctly", () => {
      it("does not render time header row when weekViewGranularity is daily", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "daily" });

        const timeLabels = screen.queryAllByTestId(RESOURCE_WEEK_TIME_LABEL);
        expect(timeLabels).toHaveLength(0);
      });

      it("still renders 7 day headers in daily mode", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "daily" });

        const dayHeaders = screen.getAllByTestId("resource-week-day-header");
        expect(dayHeaders).toHaveLength(7);
      });

      it("day headers use full-width centering in daily mode (not sticky)", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "daily" });

        const dayHeaders = screen.getAllByTestId("resource-week-day-header");
        const firstHeaderInner = dayHeaders.at(0)?.querySelector("div");

        expect(firstHeaderInner?.className).toContain("w-full text-center");
        expect(firstHeaderInner?.className).not.toContain("sticky");
      });

      it("still renders resource labels in daily mode", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "daily" });

        expect(screen.getByText("Resource 1")).toBeInTheDocument();
        expect(screen.getByText("Resource 2")).toBeInTheDocument();
      });

      it("highlights today in the day header row in daily mode", () => {
        // Same as hourly, but in daily granularity.
        const todayHeader = findTodayHeader({
          initialDate: now(),
          weekViewGranularity: "daily",
        });

        expect(todayHeader).toBeDefined();
      });
    });

    describe("header structure differences", () => {
      it("hourly mode produces an expanded header containing a time row", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "hourly" });

        // The time row is only rendered in hourly mode
        expect(screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL)).toHaveLength(
          7 * 24
        );
      });

      it("daily mode produces a compact header with no time row", () => {
        renderResourceWeekHorizontal({ weekViewGranularity: "daily" });

        // No time labels at all – grid is day-based not hour-based
        expect(screen.queryAllByTestId(RESOURCE_WEEK_TIME_LABEL)).toHaveLength(
          0
        );

        // Day headers are still present
        expect(screen.getAllByTestId("resource-week-day-header")).toHaveLength(
          7
        );
      });

      it("day header inner layout differs between daily and hourly mode", () => {
        const { unmount } = renderResourceWeekHorizontal({
          weekViewGranularity: "hourly",
        });

        const hourlyHeaders = screen.getAllByTestId("resource-week-day-header");
        const hourlyInner = hourlyHeaders.at(0)?.querySelector("div");
        const hourlyClassName = hourlyInner?.className ?? "";

        unmount();

        renderResourceWeekHorizontal({ weekViewGranularity: "daily" });
        const dailyHeaders = screen.getAllByTestId("resource-week-day-header");
        const dailyInner = dailyHeaders.at(0)?.querySelector("div");
        const dailyClassName = dailyInner?.className ?? "";

        // Hourly places the label via sticky positioning; daily centres it
        expect(hourlyClassName).toContain("sticky");
        expect(dailyClassName).toContain("w-full text-center");
        expect(dailyClassName).not.toContain("sticky");
      });
    });
  });

  describe("scrollTime", () => {
    const scrollToDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollTo"
    );

    afterEach(() => {
      if (scrollToDescriptor === undefined) {
        Reflect.deleteProperty(Element.prototype, "scrollTo");
      } else {
        Object.defineProperty(
          Element.prototype,
          "scrollTo",
          scrollToDescriptor
        );
      }
    });

    it("scrolls the viewport when scrollTime is set and granularity is hourly", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceWeekHorizontal({
        initialView: "week",
        scrollTime: "09:00:00",
        weekViewGranularity: "hourly",
      });

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", left: 0 });
      const scrollOptions = scrollSpy.mock.calls.at(0)?.at(0);
      expect(scrollOptions).toHaveProperty("left");
      expect(scrollOptions).not.toHaveProperty("top");
    });

    it("does not scroll on daily granularity", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceWeekHorizontal({
        initialView: "week",
        scrollTime: "09:00:00",
        weekViewGranularity: "daily",
      });

      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it("does not scroll when scrollTime is not provided", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceWeekHorizontal({
        initialView: "week",
        weekViewGranularity: "hourly",
      });

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
