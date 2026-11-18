import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createContext, useContext } from "react";
import type { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Calendar } from "@/features/calendar/components/calendar";
import type { EventFormProps } from "@/features/calendar/components/event-form/event-form";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { CellInfo, DateRange } from "@/features/calendar/types/index";
import { DISABLED_CELL_CLASSNAME } from "@/lib/constants";
import { textOr } from "@/lib/guards";
import { recurrencePlugin } from "@/plugins/recurrence/index";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import { clickCellSlot } from "@/test-utils/cell-interactions";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent, CalendarPlugin } from "@/types/index";
import {
  endOf,
  format,
  startOf,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

const createEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
  id: `event-${Date.now()}`,
  start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
  title: "Test Event",
  ...overrides,
});

const getClassName = (info: CellInfo) =>
  info.start.day === 20 ? "bg-amber-100" : "";

const isDisabled = (info: CellInfo) => info.start.day === 20;

const OrientationProbe = () => (
  <span data-testid="probe-orientation">
    {useCalendarContext().orientation}
  </span>
);

const WEEK_VIEW_BUTTON = /^week$/iu;
const DAY_VIEW_BUTTON = /^day$/iu;

const CustomEventForm = (props: EventFormProps) => {
  const handleAdd = () =>
    props.onAdd?.({
      end: toZonedDateTime("2025-01-15T15:00:00.000Z"),
      id: "new-event-1",
      start: toZonedDateTime("2025-01-15T14:00:00.000Z"),
      title: "New Event From Custom Form",
    });

  const handleUpdate = () => {
    if (!props.selectedEvent) {
      return;
    }

    props.onUpdate?.({
      ...props.selectedEvent,
      title: "Updated Event Title",
    });
  };

  const handleDelete = () => {
    if (props.selectedEvent) {
      props.onDelete?.(props.selectedEvent);
    }
  };

  return (
    <div data-testid="custom-event-form">
      <span data-testid="form-open">
        {props.open === true ? "open" : "closed"}
      </span>
      <span data-testid="selected-event-title">
        {textOr(props.selectedEvent?.title, "none")}
      </span>
      <span data-testid="selected-event-id">
        {props.selectedEvent?.id ?? "no-id"}
      </span>
      <button data-testid="add-event-btn" onClick={handleAdd} type="button">
        Add Event
      </button>
      <button
        data-testid="update-event-btn"
        onClick={handleUpdate}
        type="button"
      >
        Update Event
      </button>
      <button
        data-testid="delete-event-btn"
        onClick={handleDelete}
        type="button"
      >
        Delete Event
      </button>
      <button
        data-testid="close-form-btn"
        onClick={props.onClose}
        type="button"
      >
        Close
      </button>
    </div>
  );
};

/**
 * Renders `<Calendar>` with the custom event form and exposes the `onAdd`
 * handler the calendar passes to it, so tests can submit the form directly.
 */
const renderCalendarCapturingAdd = (
  props: Omit<Parameters<typeof Calendar>[0], "renderEventForm">
) => {
  let addEventFn: EventFormProps["onAdd"];

  const captureAddFn = (formProps: EventFormProps) => {
    addEventFn = formProps.onAdd;

    return <CustomEventForm {...formProps} />;
  };

  render(<Calendar {...props} renderEventForm={captureAddFn} />);

  return { getAddFn: () => addEventFn };
};

// Stable render prop: the tests only assert on the form's props, so one
// module-level renderer covers every plain renderEventForm usage.
const renderCustomEventForm = (props: EventFormProps) => (
  <CustomEventForm {...props} />
);

describe(Calendar, () => {
  // The drag-to-create plugin clips its selection overlay to the element
  // carrying `data-calendar-viewport`. It's an implicit cross-package contract,
  // so removing the marker would silently break that plugin with no other test
  // failing. This locks it in.
  describe("plugin DOM contract", () => {
    it("marks the calendar body with data-calendar-viewport", () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
        />
      );

      const body = screen.getByTestId("calendar-body");
      expect(body).toHaveAttribute("data-calendar-viewport", "true");
    });

    it("renders grid cells carrying data-start/data-end so plugins can hit-test the DOM", () => {
      // End-to-end: a view refactor that stopped rendering DroppableCell would
      // break drag-to-create even though droppable-cell.test still passes.
      const { container } = render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
        />
      );

      const cell = container.querySelector("[data-start]");
      expect(cell).not.toBeNull();
      expect(cell).toHaveAttribute("data-end");
    });

    it("marks the grid scroll content with data-calendar-scroll-content", () => {
      // The drag-to-create plugin mounts its selection overlay inside the
      // element carrying `data-calendar-scroll-content` (so it scrolls with the
      // cells and stays under the sticky chrome). Another cross-package marker
      // that nothing else would fail on if it were removed.
      const { container } = render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
        />
      );

      const scrollContent = container.querySelector(
        "[data-calendar-scroll-content]"
      );

      expect(scrollContent).not.toBeNull();
    });
  });

  describe("renderEventForm", () => {
    const mockOnEventAdd = vi.fn<(event: CalendarEvent) => void>();
    const mockOnEventUpdate = vi.fn<(event: CalendarEvent) => void>();
    const mockOnEventDelete = vi.fn<(event: CalendarEvent) => void>();

    beforeEach(() => {
      mockOnEventAdd.mockClear();
      mockOnEventUpdate.mockClear();
      mockOnEventDelete.mockClear();
    });

    describe("props passed to custom form", () => {
      it("should render custom event form when renderEventForm is provided", () => {
        render(
          <Calendar
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            renderEventForm={renderCustomEventForm}
          />
        );

        // Custom form should always be rendered (controls visibility via open prop)
        expect(screen.getByTestId("custom-event-form")).toBeInTheDocument();
      });

      it("should render custom event form component when components.EventForm is provided", () => {
        render(
          <Calendar
            components={{ EventForm: CustomEventForm }}
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          />
        );

        expect(screen.getByTestId("custom-event-form")).toBeInTheDocument();
      });

      it("should disable event form when components.EventForm is null", () => {
        render(
          <Calendar
            components={{ EventForm: null }}
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          />
        );

        expect(
          screen.queryByTestId("custom-event-form")
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      it("should pass open=false when form is not open", () => {
        render(
          <Calendar
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            renderEventForm={renderCustomEventForm}
          />
        );

        expect(screen.getByTestId("form-open")).toHaveTextContent("closed");
      });

      it("should pass open=true and selectedEvent when cell is clicked", async () => {
        render(
          <Calendar
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            renderEventForm={renderCustomEventForm}
          />
        );

        // Click on a specific day cell using correct testid format
        const dayCell = screen.getByTestId("day-cell-2025-01-15");
        clickCellSlot(dayCell);

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // selectedEvent should have a title (new event)
        expect(
          screen.getByTestId("selected-event-title")
        ).not.toHaveTextContent("none");
      });

      it("should pass selectedEvent with event data when existing event is clicked", async () => {
        const existingEvent = createEvent({
          end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
          id: "existing-1",
          start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
          title: "Existing Event",
        });

        render(
          <Calendar
            events={[existingEvent]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            renderEventForm={renderCustomEventForm}
          />
        );

        // Find and click the event
        const eventElement = screen.getByText("Existing Event");
        fireEvent.click(eventElement);

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        expect(screen.getByTestId("selected-event-title")).toHaveTextContent(
          "Existing Event"
        );
        expect(screen.getByTestId("selected-event-id")).toHaveTextContent(
          "existing-1"
        );
      });

      it("should provide onClose that closes the form", async () => {
        render(
          <Calendar
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            renderEventForm={renderCustomEventForm}
          />
        );

        // Open form by clicking a cell
        const dayCell = screen.getByTestId("day-cell-2025-01-15");
        clickCellSlot(dayCell);

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // Close the form
        fireEvent.click(screen.getByTestId("close-form-btn"));

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("closed");
        });
      });
    });

    describe("onAdd", () => {
      it("should add event to calendar when onAdd is called", async () => {
        render(
          <Calendar
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            onEventAdd={mockOnEventAdd}
            renderEventForm={renderCustomEventForm}
          />
        );

        // Open form
        const dayCell = screen.getByTestId("day-cell-2025-01-15");
        clickCellSlot(dayCell);

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // Add event using custom form
        fireEvent.click(screen.getByTestId("add-event-btn"));

        // Event should appear on calendar
        await waitFor(() => {
          expect(
            screen.getByText("New Event From Custom Form")
          ).toBeInTheDocument();
        });

        // Callback should be called
        expect(mockOnEventAdd).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            id: "new-event-1",
            title: "New Event From Custom Form",
          })
        );
      });

      it("should add multiple events", async () => {
        const { getAddFn } = renderCalendarCapturingAdd({
          events: [],
          initialDate: toZonedDateTime("2025-01-15T00:00:00.000Z"),
          initialView: "month",
        });

        // Open form
        const dayCell = screen.getByTestId("day-cell-2025-01-15");
        clickCellSlot(dayCell);

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // Add first event
        act(() => {
          getAddFn()?.({
            end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
            id: "event-1",
            start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
            title: "First Event",
          });
        });

        // Add second event
        act(() => {
          getAddFn()?.({
            end: toZonedDateTime("2025-01-16T11:00:00.000Z"),
            id: "event-2",
            start: toZonedDateTime("2025-01-16T10:00:00.000Z"),
            title: "Second Event",
          });
        });

        await waitFor(() => {
          expect(screen.getByText("First Event")).toBeInTheDocument();
          expect(screen.getByText("Second Event")).toBeInTheDocument();
        });
      });
    });

    describe("onUpdate", () => {
      it("should update event in calendar when onUpdate is called", async () => {
        const existingEvent = createEvent({
          end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
          id: "update-test-1",
          start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
          title: "Original Title",
        });

        render(
          <Calendar
            events={[existingEvent]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            onEventUpdate={mockOnEventUpdate}
            renderEventForm={renderCustomEventForm}
          />
        );

        // Verify original event is shown
        expect(screen.getByText("Original Title")).toBeInTheDocument();

        // Click event to open form
        fireEvent.click(screen.getByText("Original Title"));

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
          expect(screen.getByTestId("selected-event-id")).toHaveTextContent(
            "update-test-1"
          );
        });

        // Update event using custom form
        fireEvent.click(screen.getByTestId("update-event-btn"));

        // Event should be updated on calendar - check that new title appears
        await waitFor(() => {
          expect(screen.getByText("Updated Event Title")).toBeInTheDocument();
        });

        // Callback should be called with correct data
        expect(mockOnEventUpdate).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            id: "update-test-1",
            title: "Updated Event Title",
          })
        );
      });

      it("should preserve other event properties when updating", async () => {
        const existingEvent = createEvent({
          color: "bg-blue-100 text-blue-800",
          description: "Important description",
          end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
          id: "preserve-test-1",
          location: "Meeting Room A",
          start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
          title: "Event With Details",
        });

        let updateFn: EventFormProps["onUpdate"];

        const captureUpdateFn = (props: EventFormProps) => {
          updateFn = props.onUpdate;

          return <CustomEventForm {...props} />;
        };

        render(
          <Calendar
            events={[existingEvent]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            onEventUpdate={mockOnEventUpdate}
            renderEventForm={captureUpdateFn}
          />
        );

        // Click event to open form
        fireEvent.click(screen.getByText("Event With Details"));

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // Update only the title
        act(() => {
          updateFn?.({
            ...existingEvent,
            title: "New Title Only",
          });
        });

        // Callback should have all original properties plus new title
        await waitFor(() => {
          expect(mockOnEventUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
              color: "bg-blue-100 text-blue-800",
              description: "Important description",
              id: "preserve-test-1",
              location: "Meeting Room A",
              title: "New Title Only",
            })
          );
        });
      });
    });

    describe("onDelete", () => {
      it("should call onDelete callback with event data", async () => {
        const existingEvent = createEvent({
          end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
          id: "delete-test-1",
          start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
          title: "Event To Delete",
        });

        render(
          <Calendar
            events={[existingEvent]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            onEventDelete={mockOnEventDelete}
            renderEventForm={renderCustomEventForm}
          />
        );

        // Verify event is shown on calendar
        expect(screen.getByText("Event To Delete")).toBeInTheDocument();

        // Click event to open form
        fireEvent.click(screen.getByText("Event To Delete"));

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // Delete event using custom form
        fireEvent.click(screen.getByTestId("delete-event-btn"));

        // Callback should be called with correct data
        expect(mockOnEventDelete).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            id: "delete-test-1",
            title: "Event To Delete",
          })
        );
      });

      it("should remove event from DOM after delete", async () => {
        const existingEvent = createEvent({
          end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
          id: "delete-test-2",
          start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
          title: "DeleteMe",
        });

        render(
          <Calendar
            events={[existingEvent]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
            renderEventForm={renderCustomEventForm}
          />
        );

        // Verify event exists
        expect(screen.getByText("DeleteMe")).toBeInTheDocument();

        // Click event to open form
        fireEvent.click(screen.getByText("DeleteMe"));

        await waitFor(() => {
          expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        });

        // Delete event
        fireEvent.click(screen.getByTestId("delete-event-btn"));

        // Event should be removed (only custom form's selected-event-title might have it)
        // Close the form first to clear the selected event
        fireEvent.click(screen.getByTestId("close-form-btn"));

        await waitFor(() => {
          // After closing form, the event text should not appear anywhere
          const monthView = screen.getByTestId("horizontal-grid-scroll");
          expect(monthView).not.toHaveTextContent("DeleteMe");
        });
      });
    });

    describe("integration with calendar views", () => {
      it("should show added events in week view", async () => {
        const { getAddFn } = renderCalendarCapturingAdd({
          events: [],
          initialDate: toZonedDateTime("2025-01-15T00:00:00.000Z"),
          initialView: "week",
        });

        // Wait for week view to render
        await waitFor(() => {
          expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
        });

        // Add event directly via captured function
        act(() => {
          getAddFn()?.({
            end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
            id: "week-event-1",
            start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
            title: "Week View Event",
          });
        });

        await waitFor(async () => {
          const events = await screen.findAllByText("Week View Event");
          expect(events.length).toBeGreaterThan(0);
        });
      });

      it("should show added events in day view", async () => {
        const { getAddFn } = renderCalendarCapturingAdd({
          events: [],
          initialDate: toZonedDateTime("2025-01-15T00:00:00.000Z"),
          initialView: "day",
        });

        // Wait for day view to render
        await waitFor(() => {
          expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
        });

        // Add event directly
        act(() => {
          getAddFn()?.({
            end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
            id: "day-event-1",
            start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
            title: "Day View Event",
          });
        });

        await waitFor(async () => {
          const events = await screen.findAllByText("Day View Event");
          expect(events.length).toBeGreaterThan(0);
        });
      });

      it("should persist events when switching views", async () => {
        const { getAddFn } = renderCalendarCapturingAdd({
          events: [],
          initialDate: toZonedDateTime("2025-01-15T00:00:00.000Z"),
          initialView: "month",
        });

        // Wait for form function to be captured
        await waitFor(() => {
          expect(getAddFn()).toBeDefined();
        });

        // Add event
        act(() => {
          getAddFn()?.({
            end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
            id: "persist-event",
            start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
            title: "Persistent Event",
          });
        });

        await waitFor(async () => {
          const events = await screen.findAllByText("Persistent Event");
          expect(events.length).toBeGreaterThan(0);
        });

        // The segmented view switcher renders tabs.
        fireEvent.click(screen.getByRole("tab", { name: WEEK_VIEW_BUTTON }));

        await waitFor(() => {
          expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
        });

        // Event should still be visible
        await waitFor(async () => {
          const events = await screen.findAllByText("Persistent Event");
          expect(events.length).toBeGreaterThan(0);
        });

        fireEvent.click(screen.getByRole("tab", { name: DAY_VIEW_BUTTON }));

        await waitFor(() => {
          expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
        });

        // Event should still be visible
        await waitFor(async () => {
          const events = await screen.findAllByText("Persistent Event");
          expect(events.length).toBeGreaterThan(0);
        });
      });
    });

    describe("default EventForm fallback", () => {
      it("should use default EventForm when renderEventForm is not provided", async () => {
        render(
          <Calendar
            events={[]}
            initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
            initialView="month"
          />
        );

        // Custom form should not be present
        expect(
          screen.queryByTestId("custom-event-form")
        ).not.toBeInTheDocument();

        // Click a cell to open form
        const dayCell = screen.getByTestId("day-cell-2025-01-15");
        clickCellSlot(dayCell);

        // Default form should appear (has "Create Event" title)
        await waitFor(() => {
          expect(screen.getByText("Create Event")).toBeInTheDocument();
        });
      });
    });
  });

  describe("onCellClick", () => {
    const mockOnCellClick = vi.fn<(info: CellInfo) => void>();

    beforeEach(() => {
      mockOnCellClick.mockClear();
    });

    it("should call onCellClick with correct time range in month view", () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          initialView="month"
          onCellClick={mockOnCellClick}
        />
      );

      const dayCell = screen.getByTestId("day-cell-2025-01-15");
      clickCellSlot(dayCell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(toISOString(callArgs.start)).toBe("2025-01-15T00:00:00.000Z");
      // Month view full day (hour and minute are undefined)
      expect(callArgs.end.hour).toBe(23);
      expect(callArgs.end.minute).toBe(59);
    });

    it("should call onCellClick with correct flags and undefined resource in month view", () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          initialView="month"
          onCellClick={mockOnCellClick}
        />
      );

      const dayCell = screen.getByTestId("day-cell-2025-01-15");
      clickCellSlot(dayCell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(callArgs.allDay).toBeFalsy();
      expect(callArgs.resource).toBeUndefined();
    });

    it("should call onCellClick with correct hour in week view", () => {
      const initialDate = toZonedDateTime("2025-01-15T00:00:00.000Z");
      render(
        <Calendar
          events={[]}
          initialDate={initialDate}
          initialView="week"
          onCellClick={mockOnCellClick}
        />
      );

      const dateStr = format(initialDate, "YYYY-MM-DD");
      const timeCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`);
      clickCellSlot(timeCell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(toISOString(callArgs.start)).toBe("2025-01-15T10:00:00.000Z");
      // Week view time slots are 1 hour (minute is undefined)
      expect(toISOString(callArgs.end)).toBe("2025-01-15T11:00:00.000Z");
      expect(callArgs.allDay).toBeFalsy();
      expect(callArgs.resource).toBeUndefined();
    });

    it("should call onCellClick with correct arguments in day view", () => {
      const initialDate = toZonedDateTime("2025-01-15T00:00:00.000Z");
      render(
        <Calendar
          events={[]}
          initialDate={initialDate}
          initialView="day"
          onCellClick={mockOnCellClick}
          slotDuration={15}
        />
      );

      const dateStr = format(initialDate, "YYYY-MM-DD");
      // Day view uses VerticalGrid with time cells
      const timeCell = screen.getByTestId(`vertical-cell-${dateStr}-14-00`);
      clickCellSlot(timeCell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(toISOString(callArgs.start)).toBe("2025-01-15T14:00:00.000Z");
      // slotDuration=15 → end is 15 minutes after start
      expect(toISOString(callArgs.end)).toBe("2025-01-15T14:15:00.000Z");
      expect(callArgs.allDay).toBeFalsy();
      expect(callArgs.resource).toBeUndefined();
    });
  });

  describe("custom disabled state classesOverride", () => {
    it("should apply default disabled state classes when no custom className is provided", async () => {
      render(
        <Calendar
          businessHours={{
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            endTime: 17,
            startTime: 9,
          }}
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          initialView="month"
        />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("horizontal-grid-scroll")
        ).toBeInTheDocument();
      });

      // Find a Saturday cell (non-business day) - should have default disabled styling
      const saturdayCell = screen.getByTestId("day-cell-2025-01-18");
      expect(saturdayCell).toHaveClass(DISABLED_CELL_CLASSNAME);
    });

    it("should apply custom disabledCell className when provided", async () => {
      render(
        <Calendar
          businessHours={{
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            endTime: 17,
            startTime: 9,
          }}
          classesOverride={{
            disabledCell: "bg-gray-100 text-gray-400 cursor-not-allowed",
          }}
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          initialView="month"
        />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("horizontal-grid-scroll")
        ).toBeInTheDocument();
      });

      // Find a Saturday cell (non-business day)
      const saturdayCell = screen.getByTestId("day-cell-2025-01-18");
      expect(saturdayCell).toHaveClass("bg-gray-100");
      expect(saturdayCell).toHaveClass("text-gray-400");
      expect(saturdayCell).toHaveClass("cursor-not-allowed");
      // Should NOT have default classes
      expect(saturdayCell).not.toHaveClass("bg-secondary");
      expect(saturdayCell).not.toHaveClass("text-muted-foreground");
    });

    it("should apply custom disabledCell className in week view", async () => {
      const initialDate = toZonedDateTime("2025-01-15T00:00:00.000Z");
      render(
        <Calendar
          businessHours={{
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            endTime: 17,
            startTime: 9,
          }}
          classesOverride={{
            disabledCell: "bg-red-50 text-red-300",
          }}
          events={[]}
          initialDate={initialDate}
          initialView="week"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
      });

      // Find a time cell outside business hours (e.g., 8 AM)
      // Week view uses time cells with format: vertical-cell-{date}-{hour}-{minute}
      const dateStr = format(initialDate, "YYYY-MM-DD");

      const nonBusinessTimeCell = screen.getByTestId(
        `vertical-cell-${dateStr}-08-00`
      );

      expect(nonBusinessTimeCell).toHaveClass("bg-red-50");
      expect(nonBusinessTimeCell).toHaveClass("text-red-300");
      // Should NOT have default classes
      expect(nonBusinessTimeCell).not.toHaveClass("bg-secondary");
      expect(nonBusinessTimeCell).not.toHaveClass("text-muted-foreground");
    });

    it("should apply custom disabledCell className in day view", async () => {
      const initialDate = toZonedDateTime("2025-01-15T00:00:00.000Z");
      render(
        <Calendar
          businessHours={{
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            endTime: 17,
            startTime: 9,
          }}
          classesOverride={{
            disabledCell: "bg-yellow-50 text-yellow-300",
          }}
          events={[]}
          initialDate={initialDate}
          initialView="day"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
      });

      // Find a time cell outside business hours (e.g., 8:00 AM)
      // Day view uses time cells with format: vertical-cell-{date}-{hour}-{minute}
      const dateStr = format(initialDate, "YYYY-MM-DD");

      const nonBusinessTimeCell = screen.getByTestId(
        `vertical-cell-${dateStr}-08-00`
      );

      expect(nonBusinessTimeCell).toHaveClass("bg-yellow-50");
      expect(nonBusinessTimeCell).toHaveClass("text-yellow-300");
      // Should NOT have default classes
      expect(nonBusinessTimeCell).not.toHaveClass("bg-secondary");
      expect(nonBusinessTimeCell).not.toHaveClass("text-muted-foreground");
    });
  });

  describe("getCellClassName", () => {
    it("styles unavailable cells without blocking clicks in month view", () => {
      const onCellClick = vi.fn<(info: CellInfo) => void>();
      render(
        <Calendar
          events={[]}
          getCellClassName={getClassName}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          initialView="month"
          onCellClick={onCellClick}
        />
      );

      const styledCell = screen.getByTestId("day-cell-2025-01-20");
      const plainCell = screen.getByTestId("day-cell-2025-01-15");

      expect(styledCell).toHaveClass("bg-amber-100");
      expect(plainCell).not.toHaveClass("bg-amber-100");
      expect(styledCell.dataset.disabled).toBe("false");

      clickCellSlot(styledCell);
      expect(onCellClick).toHaveBeenCalledOnce();
    });
  });

  describe("isCellDisabled (issue #79)", () => {
    it("disables the matching cell and blocks its click in month view", () => {
      const onCellClick = vi.fn<(info: CellInfo) => void>();
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-01-15T00:00:00.000Z")}
          initialView="month"
          isCellDisabled={isDisabled}
          onCellClick={onCellClick}
        />
      );

      const disabledCell = screen.getByTestId("day-cell-2025-01-20");
      const enabledCell = screen.getByTestId("day-cell-2025-01-15");

      expect(disabledCell.dataset.disabled).toBe("true");
      expect(enabledCell.dataset.disabled).toBe("false");

      // Disabled cell blocks creation; enabled cell still fires onCellClick.
      clickCellSlot(disabledCell);
      expect(onCellClick).toHaveBeenCalledTimes(0);

      clickCellSlot(enabledCell);
      expect(onCellClick).toHaveBeenCalledOnce();
    });
  });
});

describe("plugin views", () => {
  it("renders a plugin view and exposes the plugin provider context to it", () => {
    const FakeContext = createContext("default");

    const FakeView = () => {
      const value = useContext(FakeContext);

      return <div data-testid="fake-view">{value}</div>;
    };

    const fakePlugin: CalendarPlugin = {
      name: "fake",
      provider: ({ children }) => (
        <FakeContext.Provider value="from-plugin">
          {children}
        </FakeContext.Provider>
      ),
      views: [
        {
          component: FakeView,
          icon: () => null,
          label: "Fake",
          name: "fake-view",
          navigationUnit: "day",
        },
      ],
    };

    render(<Calendar initialView="fake-view" plugins={[fakePlugin]} />);

    const el = screen.getByTestId("fake-view");
    expect(el).toBeDefined();
    expect(el.textContent).toBe("from-plugin");
  });

  it("renders a spec-driven plugin view that declares no component", () => {
    const specOnlyPlugin: CalendarPlugin = {
      name: "spec-only",
      views: [
        {
          columns: (date) => [
            {
              day: date,
              days: [
                startOf(date, "day").with({ hour: 9 }),
                startOf(date, "day").with({ hour: 10 }),
              ],
              gridType: "hour",
              id: "three-day-col",
            },
          ],
          icon: () => null,
          label: "Three day",
          layout: "vertical",
          name: "three-day",
          navigationStep: { amount: 3, unit: "day" },
          range: (date) => ({
            end: endOf(date.add({ days: 2 }), "day"),
            start: startOf(date, "day"),
          }),
        },
      ],
    };

    render(<Calendar initialView="three-day" plugins={[specOnlyPlugin]} />);

    expect(screen.getByTestId("vertical-col-three-day-col")).toBeDefined();
  });
});

describe("orientation without resources", () => {
  it("renders fine when orientation is passed without resources", () => {
    render(<Calendar orientation="vertical" />);
    // The calendar still renders; `orientation` only affects resource views.
    expect(screen.getByTestId("calendar")).toBeInTheDocument();
  });

  it("exposes the resolved orientation on the public context", () => {
    render(
      <Calendar
        headerComponent={<OrientationProbe />}
        orientation="vertical"
        resources={[{ id: "r1", title: "Room 1" }]}
      />
    );
    expect(screen.getByTestId("probe-orientation").textContent).toBe(
      "vertical"
    );
  });

  it("defaults the public orientation to horizontal", () => {
    render(<Calendar headerComponent={<OrientationProbe />} />);
    expect(screen.getByTestId("probe-orientation").textContent).toBe(
      "horizontal"
    );
  });
});

describe("Calendar - internal edits survive re-render (issue #197)", () => {
  const STANDUP: CalendarEvent = {
    end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
    exdates: [],
    id: "standup",
    rrule: {
      byweekday: [
        WEEKDAYS.MO,
        WEEKDAYS.TU,
        WEEKDAYS.WE,
        WEEKDAYS.TH,
        WEEKDAYS.FR,
      ],
      dtstart: new Date("2025-01-06T10:00:00.000Z"),
      freq: FREQ.WEEKLY,
      interval: 1,
    },
    start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
    title: "Daily Standup",
  };

  // Stable references across renders, mirroring a consumer holding events/plugins
  // in state. The bug was a fresh array from normalizeEvents on every render.
  const EVENTS: CalendarEvent[] = [STANDUP];
  const PLUGINS = [recurrencePlugin()];
  // Wednesday of the rendered week
  const WED_PREFIX = "2025-01-08";

  // Rendered inside the provider (headerComponent), so it reads the live context:
  // extends the Wednesday occurrence by 1h (scope "this") and reports its end.
  const EditHarness = () => {
    const { events, applyScopedEdit } = useCalendarContext();

    const wednesdayStandups = events.filter(
      (e) =>
        e.title === "Daily Standup" &&
        toISOString(e.start).startsWith(WED_PREFIX)
    );

    const target = wednesdayStandups.at(0);

    const handleExtend = () => {
      if (target) {
        applyScopedEdit(target, { end: target.end.add({ hours: 1 }) }, "this");
      }
    };

    return (
      <div>
        <button data-testid="extend-wed" onClick={handleExtend} type="button">
          extend
        </button>
        <span data-testid="wed-ends">
          {wednesdayStandups.map((e) => toISOString(e.end)).join("|")}
        </span>
      </div>
    );
  };

  const calendar = () => (
    <Calendar
      events={EVENTS}
      headerComponent={<EditHarness />}
      initialDate={toZonedDateTime("2025-01-08T12:00:00.000Z")}
      initialView="week"
      plugins={PLUGINS}
      timezone="UTC"
    />
  );

  it('keeps a scope-"this" edit after Calendar re-renders', () => {
    const { rerender } = render(calendar());

    expect(screen.getByTestId("wed-ends").textContent).toBe(
      "2025-01-08T11:00:00.000Z"
    );

    fireEvent.click(screen.getByTestId("extend-wed"));
    expect(screen.getByTestId("wed-ends").textContent).toBe(
      "2025-01-08T12:00:00.000Z"
    );

    // A re-render of Calendar (what the demo triggers on navigation via a
    // controlled initialDate) must not discard the in-memory override.
    rerender(calendar());
    expect(screen.getByTestId("wed-ends").textContent).toBe(
      "2025-01-08T12:00:00.000Z"
    );
  });
});

describe("Calendar Swipe Navigation", () => {
  it("navigates to next period on swipe left", () => {
    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    render(
      <Calendar
        initialDate={toZonedDateTime("2025-01-15T12:00:00.000Z")}
        initialView="day"
        onDateChange={onDateChange}
      />
    );

    const body = screen.getByTestId("calendar-body");

    // Swipe left (finger moves right-to-left: start at 200, end at 50)
    fireEvent.touchStart(body, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(body, {
      changedTouches: [{ clientX: 50, clientY: 100 }],
    });

    expect(onDateChange).toHaveBeenCalledWith(
      expect.objectContaining({ day: 16 }),
      expect.anything()
    );
  });

  it("navigates to previous period on swipe right", () => {
    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    render(
      <Calendar
        initialDate={toZonedDateTime("2025-01-15T12:00:00.000Z")}
        initialView="day"
        onDateChange={onDateChange}
      />
    );

    const body = screen.getByTestId("calendar-body");

    // Swipe right (finger moves left-to-right: start at 50, end at 200)
    fireEvent.touchStart(body, {
      touches: [{ clientX: 50, clientY: 100 }],
    });
    fireEvent.touchEnd(body, {
      changedTouches: [{ clientX: 200, clientY: 100 }],
    });

    expect(onDateChange).toHaveBeenCalledWith(
      expect.objectContaining({ day: 14 }),
      expect.anything()
    );
  });

  it("does not navigate on predominantly vertical scroll", () => {
    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    render(
      <Calendar
        initialDate={toZonedDateTime("2025-01-15T12:00:00.000Z")}
        initialView="day"
        onDateChange={onDateChange}
      />
    );

    const body = screen.getByTestId("calendar-body");

    // Vertical scroll (start at (100, 100), end at (120, 300) -> deltaX=20, deltaY=200)
    fireEvent.touchStart(body, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(body, {
      changedTouches: [{ clientX: 120, clientY: 300 }],
    });

    expect(onDateChange).not.toHaveBeenCalled();
  });
});
