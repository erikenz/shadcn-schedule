import { cleanup, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { textOr } from "@/lib/guards";
import { DayView } from "@/testing/view-harnesses";
import type { CalendarEvent, Resource } from "@/types/index";
import { format, toZonedDateTime } from "@/utils/temporal";

const renderHour = (date: Temporal.ZonedDateTime) => (
  <span data-testid={`custom-hour-${format(date, "HH")}`}>
    {format(date, "HH:mm")}
  </span>
);

const ALL_DAY_LABEL = /All day/iu;

const mockResources: Resource[] = [
  { id: "1", title: "Resource 1" },
  { id: "2", title: "Resource 2" },
];

const mockEvents: CalendarEvent[] = [];
const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const renderResourceDayVertical = (props = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={mockEvents}
      initialDate={initialDate}
      orientation="vertical"
      resources={mockResources}
      {...props}
    >
      <CalendarDndContext>
        <DayView />
      </CalendarDndContext>
    </CalendarProvider>
  );

describe("ResourceDayVertical", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders vertical resource day view structure", () => {
    renderResourceDayVertical();

    // Should render resource headers
    expect(screen.getByText("Resource 1")).toBeInTheDocument();
    expect(screen.getByText("Resource 2")).toBeInTheDocument();

    // Should render All Day row label (case insensitive)
    expect(screen.getByText(ALL_DAY_LABEL)).toBeInTheDocument();

    // Should render time column
    // firstCol id is 'time-col'
    expect(screen.getByTestId("vertical-col-time-col")).toBeInTheDocument();
  });

  it("renders resource columns in scroll area", () => {
    renderResourceDayVertical();

    // Check if resource columns exist
    // VerticalGridCol uses vertical-col-{id}
    const dateStr = format(initialDate, "YYYY-MM-DD");

    const col1 = screen.getByTestId(
      `vertical-col-day-col-${dateStr}-resource-1`
    );

    expect(col1).toBeInTheDocument();

    // Find cell for Resource 1 at 09:00 using data-testid
    // VerticalGridCol uses vertical-cell-{date}-{hour}-{minute}-resource-{resourceId}
    const resource1Cell = screen.getByTestId(
      `vertical-cell-${dateStr}-09-00-resource-1`
    );

    expect(resource1Cell).toBeInTheDocument();
  });

  it("renders all day cells for each resource", () => {
    renderResourceDayVertical();
    const allDayRows = screen.getAllByTestId("all-day-row");
    // 1 for Resource 1, 1 for Resource 2
    expect(allDayRows).toHaveLength(2);
  });

  it("renders 15-minute slots when slotDuration is 15", () => {
    renderResourceDayVertical({ slotDuration: 15 });
    const dateStr = format(initialDate, "YYYY-MM-DD");

    // Should have 00, 15, 30, 45 slots
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-1`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-15-resource-1`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-30-resource-1`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-45-resource-1`)
    ).toBeInTheDocument();
  });

  it("renders only hour slots by default", () => {
    renderResourceDayVertical();
    const dateStr = format(initialDate, "YYYY-MM-DD");

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00-resource-1`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-15-resource-1`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-30-resource-1`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-45-resource-1`)
    ).not.toBeInTheDocument();
  });

  // hideNonBusinessHours backwards compatibility tests
  it("shows all 24 hours when hideNonBusinessHours is false (default behavior)", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    renderResourceDayVertical({
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
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    renderResourceDayVertical({
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

  it("does not crash when hideNonBusinessHours produces an empty hour range", () => {
    cleanup();

    renderResourceDayVertical({
      businessHours: {
        daysOfWeek: ["wednesday"],
        endTime: 0,
        startTime: 0,
      },
      hideNonBusinessHours: true,
    });

    expect(screen.getByTestId("vertical-grid-all-day")).toBeInTheDocument();
    expect(screen.queryByTestId("vertical-grid-body")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-00")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-12")).not.toBeInTheDocument();
  });

  it("hides non-business hours when hideNonBusinessHours is true", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    renderResourceDayVertical({
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

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am (business start) for resource 1
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-01T10:00:00.000Z"),
      id: "test-event-resource-9am",
      resourceId: "1",
      start: toZonedDateTime("2025-01-01T09:00:00.000Z"),
      title: "Resource Morning Meeting",
    };

    renderResourceDayVertical({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Resource Morning Meeting");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am should be at top: 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 0%");
  });

  it("positions event correctly when hideNonBusinessHours is false in ResourceDayVertical", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-01T10:00:00.000Z"),
      id: "test-event-resource-9am-full",
      resourceId: "1",
      start: toZonedDateTime("2025-01-01T09:00:00.000Z"),
      title: "Resource Morning Full",
    };

    renderResourceDayVertical({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: false,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Resource Morning Full");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am in a 24-hour grid should NOT be at top 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).not.toContain("top: 0%");
  });

  it("positions event at correct percentage when event is in middle of business hours", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 1pm (13:00), which is 4 hours after 9am
    // With 8 business hours (9-17), 1pm should be at 50% (4/8 * 100)
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-01T14:00:00.000Z"),
      id: "test-event-resource-1pm",
      resourceId: "1",
      start: toZonedDateTime("2025-01-01T13:00:00.000Z"),
      title: "Resource Afternoon",
    };

    renderResourceDayVertical({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Resource Afternoon");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 50%");
  });

  it("customizes early and mid-day hours when renderHour prop is provided", () => {
    cleanup();

    renderResourceDayVertical({ renderHour });

    const customMidnight = screen.getByTestId("custom-hour-00");
    expect(customMidnight).toBeInTheDocument();
    expect(customMidnight).toHaveTextContent("00:00");

    const customNoon = screen.getByTestId("custom-hour-12");
    expect(customNoon).toBeInTheDocument();
    expect(customNoon).toHaveTextContent("12:00");
  });

  it("customizes late-day hours when renderHour prop is provided", () => {
    cleanup();

    renderResourceDayVertical({ renderHour });

    const customLastHour = screen.getByTestId("custom-hour-23");
    expect(customLastHour).toBeInTheDocument();
    expect(customLastHour).toHaveTextContent("23:00");
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
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>(
        (_options?: ScrollToOptions) => {}
      );

      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceDayVertical({ scrollTime: "08:00:00" });

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
    });

    it("does not scroll when scrollTime is not provided", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>(
        (_options?: ScrollToOptions) => {}
      );

      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderResourceDayVertical();

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
