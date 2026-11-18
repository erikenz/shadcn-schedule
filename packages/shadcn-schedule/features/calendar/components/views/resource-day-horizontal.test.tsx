import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { CalendarProviderProps } from "@/features/calendar/contexts/calendar-context/provider";
import { textOr } from "@/lib/guards";
import { DayView } from "@/testing/view-harnesses";
import type { BusinessHours, CalendarEvent, Resource } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

const RESOURCE_DAY_TIME_LABEL = /resource-day-time-label-/u;

const mockResources: Resource[] = [
  { id: "1", title: "Resource 1" },
  { id: "2", title: "Resource 2" },
];

// Half a second into the day
const initialDate = toZonedDateTime("2025-01-01T00:00:00.500Z");
// Wednesday

const renderResourceDayHorizontal = (
  props: Partial<CalendarProviderProps> = {}
) => {
  const { events = [], ...rest } = props;

  return render(
    <CalendarProvider
      dayMaxEvents={3}
      events={events}
      initialDate={initialDate}
      orientation="horizontal"
      resources={mockResources}
      {...rest}
    >
      <CalendarDndContext>
        <DayView />
      </CalendarDndContext>
    </CalendarProvider>
  );
};

describe("ResourceDayHorizontal", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("basic structure", () => {
    it("renders horizontal resource day view structure", () => {
      renderResourceDayHorizontal();

      // Should render resource labels
      expect(screen.getByText("Resource 1")).toBeInTheDocument();
      expect(screen.getByText("Resource 2")).toBeInTheDocument();

      // The corner cell is intentionally empty: the row labels below say what
      // the column is, so there is no "Resources" header to assert.
    });

    it("renders time labels for each hour", () => {
      renderResourceDayHorizontal();

      // Should render time labels (24 hours for a single day)
      const timeLabels = screen.getAllByTestId(RESOURCE_DAY_TIME_LABEL);
      expect(timeLabels).toHaveLength(24);
    });
  });

  describe("business hours filtering", () => {
    it("shows all 24 hours when hideNonBusinessHours is false", () => {
      const businessHours = {
        daysOfWeek: ["wednesday"],
        endTime: 17,
        startTime: 9,
      } satisfies BusinessHours;

      renderResourceDayHorizontal({
        businessHours,
        hideNonBusinessHours: false,
      });

      // All hours should be present
      expect(
        screen.getByTestId("resource-day-time-label-00")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resource-day-time-label-08")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resource-day-time-label-09")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resource-day-time-label-17")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resource-day-time-label-23")
      ).toBeInTheDocument();
    });

    it("hides non-business hours when hideNonBusinessHours is true", () => {
      const businessHours = {
        daysOfWeek: ["wednesday"],
        endTime: 17,
        startTime: 9,
      } satisfies BusinessHours;

      renderResourceDayHorizontal({
        businessHours,
        hideNonBusinessHours: true,
      });

      // Business hours should be present (9:00 to 16:00, because 17:00 is end)
      expect(
        screen.getByTestId("resource-day-time-label-09")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resource-day-time-label-16")
      ).toBeInTheDocument();

      // Non-business hours should NOT be present
      expect(
        screen.queryByTestId("resource-day-time-label-08")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("resource-day-time-label-17")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("resource-day-time-label-23")
      ).not.toBeInTheDocument();
    });
  });

  describe("event positioning", () => {
    it("renders event for resource in correct row", () => {
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T11:00:00.000Z"),
        id: "test-event-1",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        title: "Horizontal Day Event",
      };

      renderResourceDayHorizontal({
        events: [testEvent],
      });

      // Event should be rendered
      expect(screen.getByText("Horizontal Day Event")).toBeInTheDocument();
    });

    it("positions event with left and width styles", () => {
      // Create an event for resource 1 from 10am to 12pm (2 hours)
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T12:00:00.000Z"),
        id: "test-event-positioned",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        title: "Positioned Event",
      };

      renderResourceDayHorizontal({
        events: [testEvent],
      });

      // Find the event wrapper using testid
      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-positioned"
      );

      expect(eventWrapper).toBeInTheDocument();

      // Event at 10am-12pm in 24-hour grid:
      // left = 10/24 * 100 = 41.67%, width = 2/24 * 100 = 8.33%
      const left = Number(textOr(eventWrapper.dataset.left, ""));
      const width = Number(textOr(eventWrapper.dataset.width, ""));

      expect(left).toBeCloseTo(41.67, 1);
      expect(width).toBeCloseTo(8.33, 1);
    });

    it("positions event correctly when hideNonBusinessHours is true", () => {
      const businessHours = {
        daysOfWeek: ["wednesday"],
        endTime: 17,
        startTime: 9,
      } satisfies BusinessHours;

      // Event starts at 9am (business hour start)
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        id: "test-event-9am",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T09:00:00.000Z"),
        title: "9AM Event",
      };

      renderResourceDayHorizontal({
        businessHours,
        events: [testEvent],
        hideNonBusinessHours: true,
      });

      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-9am"
      );

      // In an 8-hour grid (9-17), 9am should be at left 0%
      const left = Number(textOr(eventWrapper.dataset.left, ""));
      expect(left).toBe(0);

      // Duration 1 hour in 8-hour grid = 1/8 * 100 = 12.5%
      const width = Number(textOr(eventWrapper.dataset.width, ""));
      expect(width).toBe(12.5);
    });

    it("positions event at 50% left when starting halfway through business day", () => {
      const businessHours = {
        daysOfWeek: ["wednesday"],
        endTime: 17,
        startTime: 9,
      } satisfies BusinessHours;

      // 1pm is 4 hours after 9am in an 8-hour day (50%)
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T14:00:00.000Z"),
        id: "test-event-1pm",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T13:00:00.000Z"),
        title: "1PM Event",
      };

      renderResourceDayHorizontal({
        businessHours,
        events: [testEvent],
        hideNonBusinessHours: true,
      });

      const eventWrapper = screen.getByTestId(
        "horizontal-event-test-event-1pm"
      );

      const left = Number(textOr(eventWrapper.dataset.left, ""));
      expect(left).toBe(50);
    });

    it("events for different resources appear in different rows", () => {
      const event1: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T11:00:00.000Z"),
        id: "res-1-event",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        title: "Res 1 Event",
      };

      const event2: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T11:00:00.000Z"),
        id: "res-2-event",
        resourceId: "2",
        start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        title: "Res 2 Event",
      };

      renderResourceDayHorizontal({
        events: [event1, event2],
      });

      const el1 = screen.getByText("Res 1 Event");
      const el2 = screen.getByText("Res 2 Event");

      const row1 = el1.closest<HTMLElement>('[data-testid^="horizontal-row-"]');
      const row2 = el2.closest<HTMLElement>('[data-testid^="horizontal-row-"]');

      expect(row1).not.toBeNull();
      expect(row2).not.toBeNull();
      expect(row1).not.toBe(row2);
      expect(row1?.dataset.testid).toBe("horizontal-row-1");
      expect(row2?.dataset.testid).toBe("horizontal-row-2");
    });

    it("multi-day events are rendered on each day (as single-day block in day view)", () => {
      // Event spanning Wed-Thu
      const testEvent: CalendarEvent = {
        // Thu
        end: toZonedDateTime("2025-01-02T12:00:00.000Z"),
        id: "multi-day-event",
        resourceId: "1",
        // Wed
        start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        title: "Multi-Day Event",
      };

      // Viewing Wednesday
      renderResourceDayHorizontal({
        events: [testEvent],
      });

      const eventWrapper = screen.getByTestId(
        "horizontal-event-multi-day-event"
      );

      // In day view, we only see the part that intersects with the current day (Wednesday)
      // Which is from 10am to end of day.
      // But wait, the grid logic for 'hour' type is based on the 'days' array provided.
      // In ResourceDayHorizontal, days = [currentDate's hours]
      // So firstDay = 2025-01-01T00:00:00, lastDay = 2025-01-01T23:59:59
      // The event starts at 10am on Wed and ends Thu.
      // It should span from 10am to 24:00 on Wed.

      const left = Number(textOr(eventWrapper.dataset.left, ""));
      const width = Number(textOr(eventWrapper.dataset.width, ""));

      // left = 10/24 * 100 = 41.67%
      expect(left).toBeCloseTo(41.67, 1);

      // width = (24-10)/24 * 100 = 14/24 * 100 = 58.33%
      expect(width).toBeCloseTo(58.33, 1);
    });

    it("positions 10am event precisely at 10/24 percentage (index 10)", () => {
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T11:00:00.000Z"),
        id: "precise-10am",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
        title: "10AM Event",
      };

      renderResourceDayHorizontal({
        events: [testEvent],
      });

      const eventWrapper = screen.getByTestId("horizontal-event-precise-10am");
      const left = Number(textOr(eventWrapper.dataset.left, ""));

      // 10/24 * 100 = 41.666...
      expect(left).toBeCloseTo(41.67, 1);
    });

    it("positions 10:15am event correctly (not snapping to 9am)", () => {
      const testEvent: CalendarEvent = {
        end: toZonedDateTime("2025-01-01T11:00:00.000Z"),
        id: "precise-1015am",
        resourceId: "1",
        start: toZonedDateTime("2025-01-01T10:15:00.000Z"),
        title: "10:15AM Event",
      };

      renderResourceDayHorizontal({
        events: [testEvent],
      });

      const eventWrapper = screen.getByTestId(
        "horizontal-event-precise-1015am"
      );

      const left = Number(textOr(eventWrapper.dataset.left, ""));

      // Hour grids position at minute precision: 10.25/24 * 100 = 42.708.
      // If it were snapping to 9am, left would be 9/24 * 100 = 37.5.
      expect(left).toBeCloseTo(42.71, 1);
      expect(left).not.toBeCloseTo(37.5, 1);
      expect(left).not.toBeCloseTo(41.67, 1);
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

    it("scrolls the viewport when scrollTime is set", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceDayHorizontal({ scrollTime: "08:00:00" });

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", left: 0 });
    });

    it("scrolls along the horizontal axis (uses `left`, not `top`)", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceDayHorizontal({ scrollTime: "09:00" });

      const scrollOptions = scrollSpy.mock.calls.at(0)?.at(0);
      expect(scrollOptions).toHaveProperty("left");
      expect(scrollOptions).not.toHaveProperty("top");
    });

    it("does not scroll when scrollTime is not provided", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceDayHorizontal();

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
