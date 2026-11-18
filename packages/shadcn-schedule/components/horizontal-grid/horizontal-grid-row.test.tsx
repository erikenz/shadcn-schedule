import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HorizontalGridRow } from "@/components/horizontal-grid/horizontal-grid-row";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import {
  DAY_NUMBER_HEIGHT,
  EVENT_BAR_HEIGHT,
  GAP_BETWEEN_ELEMENTS,
  HORIZONTAL_EVENT_INSET,
} from "@/lib/constants";
import type { CalendarEvent, Resource } from "@/types/index";
import {
  format,
  now,
  resetNow,
  setNow,
  startOf,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

const eventWrapper = (id: string) =>
  screen.getByTestId(`horizontal-event-${id}`);

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const renderRowWithEvents = ({
  events,
  dayNumberHeight,
  eventSpacing,
  eventHeight,
}: {
  events: CalendarEvent[];
  dayNumberHeight?: number;
  eventSpacing?: number;
  eventHeight?: number;
}) => {
  const columns = [{ day: initialDate, gridType: "day" as const, id: "col-1" }];

  return render(
    <CalendarProvider
      dayMaxEvents={4}
      eventHeight={eventHeight}
      eventSpacing={eventSpacing}
      events={events}
      initialDate={initialDate}
      resources={[]}
    >
      <HorizontalGridRow
        columns={columns}
        dayNumberHeight={dayNumberHeight}
        id="row-1"
        variant="regular"
      />
    </CalendarProvider>
  );
};

const mkEvent = (id: string, startHour: number): CalendarEvent => ({
  id,
  end: initialDate.with({ hour: startHour + 1 }).with({ minute: 0 }),
  start: initialDate.with({ hour: startHour }).with({ minute: 0 }),
  title: id,
});

const mockResource: Resource = {
  color: "blue",
  id: "res-1",
  title: "Resource 1",
};

const renderFixedRowWithEvents = (events: CalendarEvent[]) =>
  render(
    <CalendarProvider
      dayMaxEvents={4}
      events={events}
      initialDate={initialDate}
      resourceRowHeight={64}
      resources={[mockResource]}
    >
      <HorizontalGridRow
        columns={[10, 11].map((hour) => ({
          day: initialDate.with({ hour }),
          gridType: "hour" as const,
          id: `hour-${hour}`,
        }))}
        gridType="hour"
        id="row-1"
        resource={mockResource}
        variant="resource"
      />
    </CalendarProvider>
  );

const mkHourEvent = (
  id: string,
  startHour: number,
  endHour: number
): CalendarEvent => ({
  id,
  end: initialDate.with({ hour: endHour }).with({ minute: 0 }),
  resourceId: mockResource.id,
  start: initialDate.with({ hour: startHour }).with({ minute: 0 }),
  title: id,
});

const renderHorizontalGridRow = (props = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={[]}
      initialDate={initialDate}
      resources={[mockResource]}
    >
      <HorizontalGridRow id="row-1" resource={mockResource} {...props} />
    </CalendarProvider>
  );

describe(HorizontalGridRow, () => {
  beforeEach(() => {
    // Pin the clock so current-time gating is deterministic rather than
    // resilient-by-2-hour-window.
    setNow(toZonedDateTime("2025-01-01T10:30:00.000Z"));
    cleanup();
  });

  afterEach(() => {
    resetNow();
  });

  describe("basic rendering", () => {
    const defaultColumns = [
      {
        day: initialDate,
        gridType: "day" as const,
        id: "col-1",
      },
    ];

    it("renders row with correct testid", () => {
      renderHorizontalGridRow({ columns: defaultColumns });
      expect(screen.getByTestId("horizontal-row-row-1")).toBeInTheDocument();
    });

    it("renders resource label for resource variant", () => {
      renderHorizontalGridRow({ columns: defaultColumns, variant: "resource" });
      expect(
        screen.getByTestId("horizontal-row-label-res-1")
      ).toBeInTheDocument();
      expect(screen.getByText("Resource 1")).toBeInTheDocument();
    });

    it("does not render resource label for regular variant", () => {
      renderHorizontalGridRow({ columns: defaultColumns, variant: "regular" });
      expect(
        screen.queryByTestId("horizontal-row-label-res-1")
      ).not.toBeInTheDocument();
    });
  });

  describe("flat columns (single day per column)", () => {
    it("renders grid cells for flat day columns", () => {
      const days = [initialDate, initialDate.add({ days: 1 })] as const;

      const columns = days.map((day) => ({
        day,
        gridType: "day" as const,
        id: `col-${toISOString(day)}`,
      }));

      renderHorizontalGridRow({ columns });

      expect(
        screen.getByTestId(`day-cell-${format(days[0], "YYYY-MM-DD")}`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`day-cell-${format(days[1], "YYYY-MM-DD")}`)
      ).toBeInTheDocument();
    });

    it("draws cell separators via gap-px bg-border (no per-cell borders)", () => {
      const columns = [
        {
          day: initialDate,
          gridType: "day" as const,
          id: "col-1",
        },
      ];

      const { container } = renderHorizontalGridRow({ columns });

      const cellsContainer = container.querySelector(".flex.w-full.min-w-0");
      expect(cellsContainer).toHaveClass("gap-px");
      expect(cellsContainer).toHaveClass("bg-border");

      const cell = screen.getByTestId(
        `day-cell-${format(initialDate, "YYYY-MM-DD")}`
      );

      expect(cell).not.toHaveClass("border-b");
      expect(cell).not.toHaveClass("border-b-0");
    });

    it("uses gap-based separators with container gap and background classes", () => {
      const days = [initialDate, initialDate.add({ days: 1 })] as const;

      const columns = days.map((day) => ({
        day,
        gridType: "day" as const,
        id: `col-${format(day, "YYYY-MM-DD")}`,
      }));

      const { container } = renderHorizontalGridRow({ columns });

      const cellsContainer = container.querySelector(".flex.w-full.min-w-0");
      expect(cellsContainer).toHaveClass("gap-px");
      expect(cellsContainer).toHaveClass("bg-border");
    });

    it("omits per-column right borders when using gap-based separators", () => {
      const days = [initialDate, initialDate.add({ days: 1 })] as const;

      const columns = days.map((day) => ({
        day,
        gridType: "day" as const,
        id: `col-${format(day, "YYYY-MM-DD")}`,
      }));

      renderHorizontalGridRow({ columns });

      const first = screen.getByTestId(
        `day-cell-${format(days[0], "YYYY-MM-DD")}`
      );

      const last = screen.getByTestId(
        `day-cell-${format(days[1], "YYYY-MM-DD")}`
      );

      expect(first).not.toHaveClass("border-r");
      expect(first).not.toHaveClass("border-r-0");
      expect(last).not.toHaveClass("border-r");
      expect(last).not.toHaveClass("border-r-0");
    });
  });

  describe("grouped columns (multiple days per column - week view)", () => {
    it("renders grid cells for grouped day columns", () => {
      // Each column contains multiple hours for a single day
      const day1Hours = [
        initialDate.with({ hour: 9, minute: 0 }),
        initialDate.with({ hour: 10, minute: 0 }),
        initialDate.with({ hour: 11, minute: 0 }),
      ];

      const day2Hours = [
        initialDate.add({ days: 1 }).with({ hour: 9, minute: 0 }),
        initialDate.add({ days: 1 }).with({ hour: 10, minute: 0 }),
        initialDate.add({ days: 1 }).with({ hour: 11, minute: 0 }),
      ];

      const columns = [
        {
          days: day1Hours,
          gridType: "hour" as const,
          id: "col-day-1",
        },
        {
          days: day2Hours,
          gridType: "hour" as const,
          id: "col-day-2",
        },
      ];

      renderHorizontalGridRow({ columns, gridType: "hour" });

      // Should render cells for each hour - testid format: day-cell-YYYY-MM-DD-HH-mm
      expect(
        screen.getByTestId("day-cell-2025-01-01-09-00")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("day-cell-2025-01-01-10-00")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("day-cell-2025-01-02-09-00")
      ).toBeInTheDocument();
    });

    it("draws grouped column separators via gap-px bg-border (no per-cell borders)", () => {
      const day1Hours = [
        initialDate.with({ hour: 9, minute: 0 }),
        initialDate.with({ hour: 10, minute: 0 }),
      ];

      const day2Hours = [
        initialDate.add({ days: 1 }).with({ hour: 9, minute: 0 }),
        initialDate.add({ days: 1 }).with({ hour: 10, minute: 0 }),
      ];

      const columns = [
        {
          className: "test-col-1",
          days: day1Hours,
          gridType: "hour" as const,
          id: "col-day-1",
        },
        {
          className: "test-col-2",
          days: day2Hours,
          gridType: "hour" as const,
          id: "col-day-2",
        },
      ];

      const { container } = renderHorizontalGridRow({
        columns,
        gridType: "hour",
      });

      // The grouped column inner container draws the day separators.
      const groupedContainer = container.querySelector(".flex.w-full.gap-px");
      expect(groupedContainer).toHaveClass("bg-border");

      // Cells no longer carry a per-cell right border.
      const firstColCell = screen.getByTestId("day-cell-2025-01-01-09-00");
      expect(firstColCell).not.toHaveClass("border-r!");

      const lastColCell = screen.getByTestId("day-cell-2025-01-02-09-00");
      expect(lastColCell).not.toHaveClass("border-r!");
    });

    it("grouped column container has full width", () => {
      const dayHours = [
        initialDate.with({ hour: 9, minute: 0 }),
        initialDate.with({ hour: 10, minute: 0 }),
      ];

      const columns = [
        {
          days: dayHours,
          gridType: "hour" as const,
          id: "col-day-1",
        },
      ];

      const { container } = renderHorizontalGridRow({
        columns,
        gridType: "hour",
      });

      // Find the grouped column container div
      const groupedContainer = container.querySelector(".flex.relative.w-full");
      expect(groupedContainer).toBeInTheDocument();
    });
  });

  describe("isGrouped detection", () => {
    it("detects grouped columns when days array is present", () => {
      const columns = [
        {
          days: [
            initialDate.with({ hour: 9, minute: 0 }),
            initialDate.with({ hour: 10, minute: 0 }),
          ],
          gridType: "hour" as const,
          id: "col-grouped",
        },
      ];

      renderHorizontalGridRow({ columns, gridType: "hour" });

      // When grouped, events layer should be inside each column group
      // The non-grouped events layer should not be rendered
      const row = screen.getByTestId("horizontal-row-row-1");
      expect(row).toBeInTheDocument();
    });
  });

  describe("current time indicator gating", () => {
    it('mounts the indicator when gridType is "hour"', () => {
      const currentHour = startOf(now(), "hour");

      const columns = [
        {
          day: currentHour,
          gridType: "hour" as const,
          id: "gate-hour-cell-1",
        },
        {
          day: currentHour.add({ hours: 1 }),
          gridType: "hour" as const,
          id: "gate-hour-cell-2",
        },
      ];

      renderHorizontalGridRow({ columns, gridType: "hour" });

      expect(screen.getByTestId("current-time-indicator")).toBeInTheDocument();
    });

    it('does not mount the indicator when gridType is "day"', () => {
      const columns = [
        {
          day: initialDate,
          gridType: "day" as const,
          id: "gate-day-cell",
        },
      ];

      renderHorizontalGridRow({ columns, gridType: "day" });

      expect(
        screen.queryByTestId("current-time-indicator")
      ).not.toBeInTheDocument();
    });
  });

  describe("event bar pixel placement (math owned by the events layer)", () => {
    // Hour-long event on the grid's day; ids double as titles.

    it("places the first row at default dayNumberHeight + spacing with default bar height", () => {
      renderRowWithEvents({ events: [mkEvent("a", 10)] });
      const expectedTop = DAY_NUMBER_HEIGHT + GAP_BETWEEN_ELEMENTS;
      expect(eventWrapper("a").style.top).toBe(`${expectedTop}px`);
      expect(eventWrapper("a").style.height).toBe(`${EVENT_BAR_HEIGHT}px`);
    });

    it("uses the dayNumberHeight prop in the top calculation", () => {
      renderRowWithEvents({ dayNumberHeight: 50, events: [mkEvent("a", 10)] });
      expect(eventWrapper("a").style.top).toBe(
        `${50 + GAP_BETWEEN_ELEMENTS}px`
      );
    });

    it("sets the bar height from context eventHeight", () => {
      renderRowWithEvents({ eventHeight: 40, events: [mkEvent("a", 10)] });
      expect(eventWrapper("a").style.height).toBe("40px");
    });

    it("derives stacked row tops from eventHeight + eventSpacing", () => {
      renderRowWithEvents({
        eventHeight: 48,
        events: [mkEvent("a", 10), mkEvent("b", 12)],
      });
      const rowZeroTop = DAY_NUMBER_HEIGHT + GAP_BETWEEN_ELEMENTS;

      const rowOneTop =
        DAY_NUMBER_HEIGHT +
        GAP_BETWEEN_ELEMENTS +
        1 * (48 + GAP_BETWEEN_ELEMENTS);

      expect(
        [eventWrapper("a"), eventWrapper("b")].map((el) => el.style.top)
      ).toStrictEqual([`${rowZeroTop}px`, `${rowOneTop}px`]);
    });

    it("uses custom eventSpacing in stacked row tops", () => {
      renderRowWithEvents({
        eventSpacing: 4,
        events: [mkEvent("a", 10), mkEvent("b", 12)],
      });
      const rowZeroTop = DAY_NUMBER_HEIGHT + 4;
      const rowOneTop = DAY_NUMBER_HEIGHT + 4 + 1 * (EVENT_BAR_HEIGHT + 4);
      expect(
        [eventWrapper("a"), eventWrapper("b")].map((el) => el.style.top)
      ).toStrictEqual([`${rowZeroTop}px`, `${rowOneTop}px`]);
    });
  });

  describe("fixed-height hour rows (resourceRowHeight)", () => {
    it("non-overlapping events fill the whole row", () => {
      renderFixedRowWithEvents([
        mkHourEvent("a", 10, 11),
        mkHourEvent("b", 11, 12),
      ]);

      expect(eventWrapper("a").style.top).toBe(
        `calc(0% + ${HORIZONTAL_EVENT_INSET}px)`
      );
      expect(eventWrapper("a").style.height).toBe(
        `calc(100% - ${HORIZONTAL_EVENT_INSET * 2}px)`
      );
      expect(eventWrapper("b").style.top).toBe(
        `calc(0% + ${HORIZONTAL_EVENT_INSET}px)`
      );
    });

    it("overlapping events split the row into equal slices", () => {
      renderFixedRowWithEvents([
        mkHourEvent("a", 10, 11),
        mkHourEvent("b", 10, 11),
      ]);

      expect(eventWrapper("a").style.top).toBe(
        `calc(0% + ${HORIZONTAL_EVENT_INSET}px)`
      );
      expect(eventWrapper("b").style.top).toBe(
        `calc(50% + ${HORIZONTAL_EVENT_INSET}px)`
      );
      expect(eventWrapper("a").style.height).toBe(
        `calc(50% - ${HORIZONTAL_EVENT_INSET * 2}px)`
      );
      expect(eventWrapper("b").style.height).toBe(
        `calc(50% - ${HORIZONTAL_EVENT_INSET * 2}px)`
      );
    });
  });
});
