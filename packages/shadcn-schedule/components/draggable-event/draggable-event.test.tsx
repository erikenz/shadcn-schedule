import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { DayView } from "@/testing/view-harnesses";
import type { CalendarEvent, Resource } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

const RESOURCE: Resource = { id: "court-1", title: "Court 1" };

const EVENT: CalendarEvent = {
  end: toZonedDateTime("2025-01-01T11:00:00.000Z"),
  id: "event-1",
  resourceId: "court-1",
  start: toZonedDateTime("2025-01-01T10:00:00.000Z"),
  title: "Morning Booking",
};

const renderHorizontalDayView = (
  props: Partial<Parameters<typeof CalendarProvider>[0]> = {}
) =>
  render(
    <CalendarProvider
      events={[EVENT]}
      initialDate={toZonedDateTime("2025-01-01T00:00:00.000Z")}
      orientation="horizontal"
      resources={[RESOURCE]}
      {...props}
    >
      <CalendarDndContext>
        <DayView />
      </CalendarDndContext>
    </CalendarProvider>
  );

describe("DraggableEvent without drag and drop", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the event as a real button, not a dnd role=button div", () => {
    renderHorizontalDayView({ disableDragAndDrop: true });

    const event = screen.getByRole("button", { name: "Morning Booking" });
    // A native button: keyboard Enter/Space activation is guaranteed by the
    // browser, and no aria-disabled is emitted for a clickable control.
    expect(event.tagName).toBe("BUTTON");
    expect(event).not.toHaveAttribute("aria-disabled");
  });

  it("clicking the event fires onEventClick", () => {
    const onEventClick = vi.fn<(event: CalendarEvent) => void>();
    renderHorizontalDayView({ disableDragAndDrop: true, onEventClick });

    fireEvent.click(screen.getByRole("button", { name: "Morning Booking" }));

    expect(onEventClick).toHaveBeenCalledWith(EVENT, expect.anything());
  });

  it("disableEventClick disables the button", () => {
    renderHorizontalDayView({
      disableDragAndDrop: true,
      disableEventClick: true,
    });

    expect(
      screen.getByRole("button", { name: "Morning Booking" })
    ).toBeDisabled();
  });

  it("keeps the dnd div when dragging is enabled", () => {
    renderHorizontalDayView();

    const event = screen.getByRole("button", { name: "Morning Booking" });
    expect(event.tagName).toBe("DIV");
  });
});
