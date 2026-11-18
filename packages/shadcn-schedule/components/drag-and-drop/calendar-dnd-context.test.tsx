import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { isRecurringEvent } from "@/plugins/recurrence/index";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import type { CalendarEvent } from "@/types/index";
import { toDate, toZonedDateTime } from "@/utils/temporal";

const createRecurringEvent = (): CalendarEvent => ({
  allDay: false,
  color: "bg-green-500",
  end: toZonedDateTime("2025-01-15T10:00:00.000Z"),
  id: "recurring-event-1",
  rrule: {
    byweekday: [WEEKDAYS.MO],
    dtstart: toDate(toZonedDateTime("2025-01-15T00:00:00.000Z")),
    freq: FREQ.WEEKLY,
    interval: 1,
  },
  start: toZonedDateTime("2025-01-15T09:00:00.000Z"),
  title: "Weekly Meeting",
  uid: "recurring-event-1@calendar",
});

const renderWithCalendarProvider = (providerProps = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={5}
      disableDragAndDrop={false}
      events={[]}
      firstDayOfWeek={0}
      {...providerProps}
    >
      <CalendarDndContext>
        <div data-testid="calendar-content">Test Content</div>
      </CalendarDndContext>
    </CalendarProvider>
  );

describe(CalendarDndContext, () => {
  describe("Context Rendering", () => {
    it("should render with DndContext when drag and drop is enabled", () => {
      renderWithCalendarProvider({ disableDragAndDrop: false });
      expect(screen.getByTestId("calendar-content")).toBeInTheDocument();
    });

    it("should render without DndContext when drag and drop is disabled", () => {
      renderWithCalendarProvider({ disableDragAndDrop: true });
      expect(screen.getByTestId("calendar-content")).toBeInTheDocument();
    });

    it("should NOT show RecurrenceEditDialog initially", () => {
      renderWithCalendarProvider();
      const dialog = screen.queryByRole("dialog");
      expect(dialog).not.toBeInTheDocument();
    });
  });

  describe("isRecurringEvent Utility", () => {
    it("should return false for regular events without uid or rrule", () => {
      const regularEvent: CalendarEvent = {
        allDay: false,
        end: toZonedDateTime("2025-01-15T10:00:00.000Z"),
        id: "regular",
        start: toZonedDateTime("2025-01-15T09:00:00.000Z"),
        title: "Regular",
      };

      expect(isRecurringEvent(regularEvent)).toBeFalsy();
      expect(regularEvent.uid).toBeUndefined();
      expect(regularEvent.rrule).toBeUndefined();
      expect(regularEvent.recurrenceId).toBeUndefined();
    });

    it("should return true for events with rrule", () => {
      const recurringEvent = createRecurringEvent();

      expect(isRecurringEvent(recurringEvent)).toBeTruthy();
      expect(recurringEvent.rrule).toBeDefined();
      expect(recurringEvent.rrule?.freq).toBe(FREQ.WEEKLY);
    });

    it("should return true for events with uid", () => {
      const instance: CalendarEvent = {
        allDay: false,
        end: toZonedDateTime("2025-01-15T10:00:00.000Z"),
        id: "instance",
        start: toZonedDateTime("2025-01-15T09:00:00.000Z"),
        title: "Instance",
        uid: "recurring@calendar",
      };

      expect(isRecurringEvent(instance)).toBeTruthy();
      expect(instance.uid).toBe("recurring@calendar");
    });

    it("should return true for events with recurrenceId", () => {
      const modifiedInstance: CalendarEvent = {
        allDay: false,
        end: toZonedDateTime("2025-01-15T10:00:00.000Z"),
        id: "modified",
        recurrenceId: "2025-01-15T09:00:00.000Z",
        start: toZonedDateTime("2025-01-15T09:00:00.000Z"),
        title: "Modified",
        uid: "recurring@calendar",
      };

      expect(isRecurringEvent(modifiedInstance)).toBeTruthy();
      expect(modifiedInstance.recurrenceId).toBe("2025-01-15T09:00:00.000Z");
    });
  });
});
