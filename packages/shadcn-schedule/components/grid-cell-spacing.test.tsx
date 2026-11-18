import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GridCell } from "@/components/grid-cell";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { EVENT_BAR_HEIGHT } from "@/lib/constants";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import { isSame, toZonedDateTime } from "@/utils/temporal";

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const renderFixedHourCell = (events: CalendarEvent[]) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={events}
      initialDate={initialDate}
      resourceRowHeight={64}
    >
      <GridCell day={initialDate} gridType="hour" hour={0} />
    </CalendarProvider>
  );

const EVENT_TITLE_TEST_ID = /Event/iu;
const MORE_TEXT = /more/iu;

const mkEvent = (id: string): CalendarEvent => ({
  id,
  end: initialDate.add({ hours: 1 }),
  start: initialDate,
  title: `Event ${id}`,
});

const twoEvents = [mkEvent("1"), mkEvent("2")];
const threeEvents = [mkEvent("1"), mkEvent("2"), mkEvent("3")];

interface RenderGridCellOptions {
  dayMaxEvents?: number;
  eventHeight?: number;
  eventSpacing?: number;
  events?: CalendarEvent[];
  onMoreEventsClick?: (
    day: Temporal.ZonedDateTime,
    events: CalendarEvent[]
  ) => void;
}

// Shared harness for GridCell. Each suite varies only the CalendarProvider props
// it cares about; everything else falls back to sensible defaults.
const renderGridCell = ({
  dayMaxEvents = 3,
  eventSpacing,
  eventHeight,
  events = twoEvents,
  onMoreEventsClick,
}: RenderGridCellOptions = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={dayMaxEvents}
      eventHeight={eventHeight}
      eventSpacing={eventSpacing}
      events={events}
      initialDate={initialDate}
      onMoreEventsClick={onMoreEventsClick}
    >
      <GridCell day={initialDate} shouldRenderEvents={true} />
    </CalendarProvider>
  );

const renderOverflowCell = (
  onMoreEventsClick?: (
    day: Temporal.ZonedDateTime,
    events: CalendarEvent[]
  ) => void
) =>
  renderGridCell({ dayMaxEvents: 1, events: threeEvents, onMoreEventsClick });

describe("GridCell Event Spacing", () => {
  beforeEach(() => {
    cleanup();
  });

  it("grid-cell-content should have gap matching eventSpacing", () => {
    const spacing = 8;
    renderGridCell({ eventSpacing: spacing });
    const content = screen.getByTestId("grid-cell-content");

    expect(content.style.gap).toBe(`${spacing}px`);
  });

  it("event placeholders should have height matching EVENT_BAR_HEIGHT", () => {
    renderGridCell();
    const placeholders = screen.queryAllByTestId(EVENT_TITLE_TEST_ID);

    expect(placeholders).toHaveLength(2);
    expect(placeholders[0]?.style.height).toBe(`${EVENT_BAR_HEIGHT}px`);
    expect(placeholders[1]?.style.height).toBe(`${EVENT_BAR_HEIGHT}px`);
  });

  it("event placeholders should use custom eventHeight when provided", () => {
    const customHeight = 48;
    renderGridCell({ eventHeight: customHeight });
    const placeholders = screen.queryAllByTestId(EVENT_TITLE_TEST_ID);

    expect(placeholders).toHaveLength(2);
    expect(placeholders[0]?.style.height).toBe(`${customHeight}px`);
    expect(placeholders[1]?.style.height).toBe(`${customHeight}px`);
  });
});

describe("GridCell fixed-height hour rows", () => {
  beforeEach(() => {
    cleanup();
  });

  it("applies the row height as inline minHeight and drops the 60px default", () => {
    renderFixedHourCell(twoEvents);

    const cell = screen
      .getByTestId("day-cell-2025-01-01-00-00")
      .closest("[data-droppable-cell]");

    expect(cell?.getAttribute("style")).toContain("min-height: 64px");
    expect(cell?.className).not.toContain("min-h-[60px]");
  });

  it("renders no event placeholders or overflow button", () => {
    renderFixedHourCell(threeEvents);

    expect(screen.queryAllByTestId(EVENT_TITLE_TEST_ID)).toHaveLength(0);
    expect(screen.queryByText(MORE_TEXT)).toBeNull();
  });
});

describe('GridCell "+N more" overflow handling', () => {
  beforeEach(() => {
    cleanup();
  });

  // Three events with dayMaxEvents=1 → two are hidden, so the "+N more"
  // overflow indicator is rendered.

  it('renders the "+N more" indicator when events exceed dayMaxEvents', () => {
    renderOverflowCell();
    expect(screen.getByText(MORE_TEXT)).toBeInTheDocument();
  });

  it("opens the built-in dialog when onMoreEventsClick is not provided", () => {
    renderOverflowCell();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByText(MORE_TEXT));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onMoreEventsClick with the day and events, and does NOT open the dialog", () => {
    const onMoreEventsClick = vi.fn<
      (day: Temporal.ZonedDateTime, events: CalendarEvent[]) => void
    >(() => {});

    renderOverflowCell(onMoreEventsClick);

    fireEvent.click(screen.getByText(MORE_TEXT));

    expect(onMoreEventsClick).toHaveBeenCalledOnce();
    const [day, events] = elementAt(onMoreEventsClick.mock.calls, 0);
    expect(isSame(day, initialDate, "day")).toBeTruthy();
    expect(events).toHaveLength(3);

    // The built-in dialog must be bypassed when the callback is provided.
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("GridCell droppable ID uniqueness", () => {
  beforeEach(() => {
    cleanup();
  });

  it("all-day cell and midnight time cell for the same date render as separate droppable elements", () => {
    const midnightDate = toZonedDateTime("2025-01-13T00:00:00.000Z");
    render(
      <CalendarProvider dayMaxEvents={3} initialDate={midnightDate}>
        <GridCell allDay day={midnightDate} gridType="day" />
        <GridCell
          day={midnightDate}
          gridType="hour"
          hour={0}
          shouldRenderEvents={false}
        />
      </CalendarProvider>
    );

    // Both cells render with distinct test IDs
    expect(screen.getByTestId("day-cell-2025-01-13")).toBeInTheDocument();
    expect(screen.getByTestId("day-cell-2025-01-13-00-00")).toBeInTheDocument();

    // They are separate droppable cell DOM nodes (not sharing the same @dnd-kit registration)
    const allDayDroppable = screen
      .getByTestId("day-cell-2025-01-13")
      .closest("[data-droppable-cell]");

    const timeDroppable = screen
      .getByTestId("day-cell-2025-01-13-00-00")
      .closest("[data-droppable-cell]");

    expect(allDayDroppable).not.toBe(timeDroppable);
  });

  it("time cells for different hours on the same day render as separate droppable elements", () => {
    const date = toZonedDateTime("2025-01-13T00:00:00.000Z");
    render(
      <CalendarProvider dayMaxEvents={3} initialDate={date}>
        <GridCell
          day={date.with({ hour: 9 })}
          gridType="hour"
          hour={9}
          shouldRenderEvents={false}
        />
        <GridCell
          day={date.with({ hour: 10 })}
          gridType="hour"
          hour={10}
          shouldRenderEvents={false}
        />
      </CalendarProvider>
    );

    expect(screen.getByTestId("day-cell-2025-01-13-09-00")).toBeInTheDocument();
    expect(screen.getByTestId("day-cell-2025-01-13-10-00")).toBeInTheDocument();

    const cell9 = screen
      .getByTestId("day-cell-2025-01-13-09-00")
      .closest("[data-droppable-cell]");

    const cell10 = screen
      .getByTestId("day-cell-2025-01-13-10-00")
      .closest("[data-droppable-cell]");

    expect(cell9).not.toBe(cell10);
  });
});
