// No mocking - test the real CalendarDndContext

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Calendar } from "@/features/calendar/components/calendar";
import type { EventFormProps } from "@/features/calendar/components/event-form/event-form";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type {
  CellInfo,
  DateRange,
  EventSegment,
} from "@/features/calendar/types/index";
import type { CollectFn } from "@/lib/utils/export-ical";
import { clickCellSlot } from "@/test-utils/cell-interactions";
import { elementAt } from "@/test-utils/element-at";
import type {
  CalendarEvent,
  CalendarPlugin,
  CalendarView,
  Resource,
} from "@/types/index";
import { format, toISOString, toZonedDateTime } from "@/utils/temporal";

const RESOURCE_DAY_TIME_LABEL = /^resource-day-time-label-/u;
const RESOURCE_WEEK_TIME_LABEL = /^resource-week-time-label-/u;
const AMPM = /AM|PM/iu;
const TIME_OR_HOUR = /\d{1,2}(?::\d{2})?/u;

const translator = (key: string) => `Translated: ${key}`;

const customRenderEvent = (event: CalendarEvent) => (
  <div data-testid={`custom-event-${event.id}`}>Custom: {event.title}</div>
);

// Renders inside the provider tree (via headerComponent) and forwards a fixed
// CellInfo into the context's onCellClick — lets tests drive the cell-click
// fallback with inputs (allDay: true) the resource DOM never produces.
const CellClickProbe = ({ info }: { info: CellInfo }) => {
  const { onCellClick } = useSmartCalendarContext();

  const handleClick = () => {
    onCellClick(info);
  };

  return (
    <button data-testid="probe-cell-click" onClick={handleClick} type="button">
      probe cell click
    </button>
  );
};

const CustomResourceEventForm = ({
  open,
  selectedEvent,
  onAdd,
  onUpdate,
  onDelete,
}: EventFormProps) => {
  // The selected event's fields, or the "nothing selected" placeholders.
  const {
    title = "none",
    id = "no-id",
    resourceId = "no-resource",
    resourceIds = [],
    allDay = false,
  } = selectedEvent ?? {};

  const handleAdd = () =>
    onAdd?.({
      end: toZonedDateTime("2025-08-04T15:00:00.000Z"),
      id: "new-resource-event-1",
      resourceId: "resource-1",
      start: toZonedDateTime("2025-08-04T14:00:00.000Z"),
      title: "New Resource Event",
    });

  const handleAddCrossResource = () =>
    onAdd?.({
      end: toZonedDateTime("2025-08-04T15:00:00.000Z"),
      id: "cross-resource-event-1",
      resourceIds: ["resource-1", "resource-2"],
      start: toZonedDateTime("2025-08-04T14:00:00.000Z"),
      title: "Cross Resource Event",
    });

  const handleUpdate = () => {
    if (selectedEvent) {
      onUpdate?.({ ...selectedEvent, title: "Updated Resource Event" });
    }
  };

  const handleUpdateResource = () => {
    if (selectedEvent) {
      onUpdate?.({ ...selectedEvent, resourceId: "resource-2" });
    }
  };

  const handleDelete = () => {
    if (selectedEvent) {
      onDelete?.(selectedEvent);
    }
  };

  return (
    <div data-testid="custom-event-form">
      <span data-testid="form-open">{open === true ? "open" : "closed"}</span>
      <span data-testid="selected-event-title">{title}</span>
      <span data-testid="selected-event-id">{id}</span>
      <span data-testid="selected-event-resource-id">{resourceId}</span>
      <span data-testid="selected-event-resource-ids">
        {resourceIds.join(",") || "no-resources"}
      </span>
      <span data-testid="selected-event-all-day">
        {allDay ? "all-day" : "timed"}
      </span>
      <button data-testid="add-event-btn" onClick={handleAdd} type="button">
        Add Event
      </button>
      <button
        data-testid="add-cross-resource-event-btn"
        onClick={handleAddCrossResource}
        type="button"
      >
        Add Cross Resource Event
      </button>
      {selectedEvent ? (
        <>
          <button
            data-testid="update-event-btn"
            onClick={handleUpdate}
            type="button"
          >
            Update Event
          </button>
          <button
            data-testid="update-event-resource-btn"
            onClick={handleUpdateResource}
            type="button"
          >
            Move to Resource 2
          </button>
          <button
            data-testid="delete-event-btn"
            onClick={handleDelete}
            type="button"
          >
            Delete Event
          </button>
        </>
      ) : null}
    </div>
  );
};

// Mock the export function

vi.mock(import("../../../lib/utils/export-ical.ts"), () => ({
  downloadICalendar:
    vi.fn<
      (
        events: CalendarEvent[],
        collect: CollectFn,
        filename?: string,
        calendarName?: string
      ) => void
    >(),
}));

describe(Calendar, () => {
  const mockResources: [Resource, Resource, Resource] = [
    {
      backgroundColor: "#EFF6FF",
      color: "#3B82F6",
      id: "resource-1",
      title: "Conference Room A",
    },
    {
      backgroundColor: "#FEF2F2",
      color: "#EF4444",
      id: "resource-2",
      title: "Conference Room B",
    },
    {
      backgroundColor: "#ECFDF5",
      color: "#10B981",
      id: "resource-3",
      title: "Meeting Room C",
    },
  ];

  const mockEvents: CalendarEvent[] = [
    {
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      id: "event-1",
      resourceId: "resource-1",
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Team Meeting",
      uid: "event-1@calendar.local",
    },
    {
      end: toZonedDateTime("2025-08-04T15:30:00.000Z"),
      id: "event-2",
      // Cross-resource event
      resourceIds: ["resource-1", "resource-2"],
      start: toZonedDateTime("2025-08-04T14:00:00.000Z"),
      title: "Client Presentation",
      uid: "event-2@calendar.local",
    },
    {
      end: toZonedDateTime("2025-08-05T11:00:00.000Z"),
      id: "event-3",
      resourceId: "resource-3",
      start: toZonedDateTime("2025-08-05T10:00:00.000Z"),
      title: "Department Standup",
      uid: "event-3@calendar.local",
    },
  ];

  it("should render without crashing", () => {
    render(<Calendar />);

    // Should render the calendar header
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should render with resources and events", () => {
    render(<Calendar events={mockEvents} resources={mockResources} />);

    // Should render the calendar header
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();

    // Should render header with resource controls
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should use default props correctly", () => {
    render(<Calendar />);

    // Component should render with empty resources/events arrays
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle firstDayOfWeek prop correctly", () => {
    const { rerender } = render(<Calendar firstDayOfWeek="monday" />);

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();

    // Test sunday as well
    rerender(<Calendar firstDayOfWeek="sunday" />);
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle initialView prop", () => {
    render(<Calendar initialView="week" resources={mockResources} />);

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle initialDate prop with dayjs", () => {
    const initialDate = toZonedDateTime("2025-06-15T10:00:00.000Z");

    render(
      <Calendar
        events={mockEvents}
        initialDate={initialDate}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle initialDate prop with Date object", () => {
    const initialDate = new Date("2025-06-15T10:00:00.000Z");

    render(
      <Calendar
        events={mockEvents}
        initialDate={initialDate}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle initialDate prop with ISO string", () => {
    const initialDate = "2025-06-15T10:00:00.000Z";

    render(
      <Calendar
        events={mockEvents}
        initialDate={initialDate}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should render custom header when provided", () => {
    const customHeader = <div data-testid="custom-header">Custom Header</div>;

    render(
      <Calendar headerComponent={customHeader} resources={mockResources} />
    );

    expect(screen.getByTestId("custom-header")).toBeInTheDocument();
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
  });

  it("should handle event callbacks", () => {
    const onEventClick = vi.fn<(event: CalendarEvent) => void>();
    const onCellClick = vi.fn<(info: CellInfo) => void>();
    const onEventAdd = vi.fn<(event: CalendarEvent) => void>();
    const onEventUpdate = vi.fn<(event: CalendarEvent) => void>();
    const onEventDelete = vi.fn<(event: CalendarEvent) => void>();
    const onViewChange = vi.fn<(view: CalendarView) => void>();

    const onDateChange =
      vi.fn<(date: Temporal.ZonedDateTime, range: DateRange) => void>();

    render(
      <Calendar
        events={mockEvents}
        onCellClick={onCellClick}
        onDateChange={onDateChange}
        onEventAdd={onEventAdd}
        onEventClick={onEventClick}
        onEventDelete={onEventDelete}
        onEventUpdate={onEventUpdate}
        onViewChange={onViewChange}
        resources={mockResources}
      />
    );

    // All callbacks should be properly passed to provider
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle disabled states", () => {
    render(
      <Calendar
        disableCellClick={true}
        disableDragAndDrop={true}
        disableEventClick={true}
        events={mockEvents}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle dayMaxEvents prop", () => {
    render(
      <Calendar
        dayMaxEvents={5}
        events={mockEvents}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle sticky view header", () => {
    render(
      <Calendar
        resources={mockResources}
        stickyViewHeader={true}
        viewHeaderClassName="border-b border-border"
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle internationalization props", () => {
    render(
      <Calendar
        locale="en"
        resources={mockResources}
        timezone="America/New_York"
        translator={translator}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle resource-specific events correctly", () => {
    render(<Calendar events={mockEvents} resources={mockResources} />);

    // Should render without errors when events have resourceId and resourceIds
    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should handle cross-resource events", () => {
    const crossResourceEvent: CalendarEvent = {
      end: toZonedDateTime("2025-08-04T17:00:00.000Z"),
      id: "cross-resource-event",
      // Spans all resources
      resourceIds: ["resource-1", "resource-2", "resource-3"],
      start: toZonedDateTime("2025-08-04T16:00:00.000Z"),
      title: "All Hands Meeting",
      uid: "cross-resource-event@calendar.local",
    };

    render(
      <Calendar
        events={[...mockEvents, crossResourceEvent]}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("renders the regular (non-resource) grid when resources is empty", () => {
    render(
      <Calendar
        events={mockEvents}
        initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
        initialView="month"
        resources={[]}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
    // The regular month grid (week rows), not the resource axis (resource rows).
    expect(screen.getByTestId("horizontal-row-week-0")).toBeInTheDocument();
    expect(
      screen.queryByTestId("horizontal-row-resource-1")
    ).not.toBeInTheDocument();
  });

  it("should handle events without resource assignments", () => {
    const eventWithoutResource: CalendarEvent = {
      end: toZonedDateTime("2025-08-04T13:00:00.000Z"),
      id: "no-resource-event",
      start: toZonedDateTime("2025-08-04T12:00:00.000Z"),
      title: "Floating Event",
      uid: "no-resource-event@calendar.local",
      // No resourceId or resourceIds
    };

    render(
      <Calendar
        events={[...mockEvents, eventWithoutResource]}
        initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
    // Resources are present, the event has no resource fields → it renders nowhere.
    expect(screen.queryByText("Floating Event")).not.toBeInTheDocument();
  });

  it('renders the regular year grid when initialView="year" is forced with resources', () => {
    render(
      <Calendar
        events={[]}
        initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
        initialView="year"
        resources={mockResources}
      />
    );

    // The year view is resource-incapable: forced programmatically, it renders
    // as a regular (resource-less) view — the resource axis simply doesn't apply.
    expect(screen.getByTestId("year-month-08")).toBeInTheDocument();
  });

  it("should support custom renderEvent function", () => {
    render(
      <Calendar
        events={mockEvents}
        renderEvent={customRenderEvent}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("should pass segment info (isStart, isEnd) to custom renderEvent", () => {
    let capturedSegment: EventSegment | undefined;

    render(
      <Calendar
        events={mockEvents}
        initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
        renderEvent={(event: CalendarEvent, segment: EventSegment) => {
          capturedSegment = segment;

          return (
            <div data-testid={`custom-event-${event.id}`}>{event.title}</div>
          );
        }}
        resources={mockResources}
      />
    );

    expect(capturedSegment).toBeDefined();
    expect(capturedSegment?.isStart).toBeTruthy();
    expect(capturedSegment?.isEnd).toBeTruthy();
  });

  it("should handle view changes between different resource views", () => {
    const { rerender } = render(
      <Calendar
        events={mockEvents}
        initialView="month"
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();

    // Test switching to week view
    rerender(
      <Calendar
        events={mockEvents}
        initialView="week"
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();

    // Test switching to day view
    rerender(
      <Calendar
        events={mockEvents}
        initialView="day"
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("calendar-header")).toBeInTheDocument();
  });

  it("hides plugin views without supportsResources from the resource switcher, shows capable ones", () => {
    const plugins: CalendarPlugin[] = [
      {
        name: "incapable",
        views: [
          {
            component: () => null,
            icon: () => null,
            label: "Agenda",
            name: "agenda",
          },
        ],
      },
      {
        name: "capable",
        views: [
          {
            component: () => null,
            icon: () => null,
            label: "Timeline",
            name: "timeline",
            supportsResources: true,
          },
        ],
      },
    ];

    render(<Calendar plugins={plugins} resources={mockResources} />);

    // The segmented view switcher renders tabs; the label is the accessible name.
    expect(screen.queryByRole("tab", { name: "Agenda" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Timeline" })).toBeDefined();
  });

  it("renders a resource-capable plugin view through the shared resolution path", () => {
    const plugin: CalendarPlugin = {
      name: "custom",
      views: [
        {
          component: () => <div data-testid="custom-view">custom</div>,
          icon: () => null,
          label: "Custom",
          name: "custom-view",
          supportsResources: true,
        },
      ],
    };

    render(
      <Calendar
        initialView="custom-view"
        plugins={[plugin]}
        resources={mockResources}
      />
    );

    expect(screen.getByTestId("custom-view")).toBeDefined();
  });

  describe("onCellClick", () => {
    const mockOnCellClick = vi.fn<(info: CellInfo) => void>();

    beforeEach(() => {
      mockOnCellClick.mockClear();
    });

    it("should call onCellClick with correct arguments in day view", () => {
      const initialDate = toZonedDateTime("2025-08-04T00:00:00.000Z");
      render(
        <Calendar
          events={[]}
          initialDate={initialDate}
          initialView="day"
          onCellClick={mockOnCellClick}
          resources={mockResources}
        />
      );

      const dateStr = format(initialDate, "YYYY-MM-DD");
      const resourceId = "resource-1";
      // In Resource calendar, day view actually uses HorizontalGrid with gridType='hour'
      // which renders day-cell-{date}-{hour}-{minute} inside a row
      const row = screen.getByTestId(`horizontal-row-${resourceId}`);
      const cell = within(row).getByTestId(`day-cell-${dateStr}-10-00`);
      clickCellSlot(cell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(toISOString(callArgs.start)).toBe("2025-08-04T10:00:00.000Z");
      // Resource Horizontal day view uses 1 hour slots (minute is undefined)
      expect(toISOString(callArgs.end)).toBe("2025-08-04T11:00:00.000Z");
      expect(callArgs.allDay).toBeFalsy();
      expect(callArgs.resource?.id).toBe(resourceId);
    });

    it("should call onCellClick with correct time range in month view", () => {
      const initialDate = toZonedDateTime("2025-08-04T00:00:00.000Z");
      render(
        <Calendar
          events={[]}
          initialDate={initialDate}
          initialView="month"
          onCellClick={mockOnCellClick}
          resources={mockResources}
        />
      );

      const dateStr = format(initialDate, "YYYY-MM-DD");
      const resourceId = "resource-2";
      const row = screen.getByTestId(`horizontal-row-${resourceId}`);
      const cell = within(row).getByTestId(`day-cell-${dateStr}`);
      clickCellSlot(cell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(toISOString(callArgs.start)).toBe("2025-08-04T00:00:00.000Z");
      // Month view full day (hour and minute are undefined)
      expect(callArgs.end.hour).toBe(23);
      expect(callArgs.end.minute).toBe(59);
    });

    it("should call onCellClick with correct metadata in month view", () => {
      const initialDate = toZonedDateTime("2025-08-04T00:00:00.000Z");
      render(
        <Calendar
          events={[]}
          initialDate={initialDate}
          initialView="month"
          onCellClick={mockOnCellClick}
          resources={mockResources}
        />
      );

      const dateStr = format(initialDate, "YYYY-MM-DD");
      const resourceId = "resource-2";
      const row = screen.getByTestId(`horizontal-row-${resourceId}`);
      const cell = within(row).getByTestId(`day-cell-${dateStr}`);
      clickCellSlot(cell);

      expect(mockOnCellClick).toHaveBeenCalledOnce();
      const [callArgs] = elementAt(mockOnCellClick.mock.calls, 0);
      expect(callArgs.allDay).toBeFalsy();
      expect(callArgs.resource?.id).toBe(resourceId);
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

    it("should render custom event form when renderEventForm is provided", () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      expect(screen.getByTestId("custom-event-form")).toBeInTheDocument();
      expect(screen.getByTestId("form-open")).toHaveTextContent("closed");
    });

    it("should pass selectedEvent with resourceId when resource event is clicked", async () => {
      const resourceEvent: CalendarEvent = {
        end: toZonedDateTime("2025-08-04T11:00:00.000Z"),
        id: "resource-event-1",
        resourceId: "resource-1",
        start: toZonedDateTime("2025-08-04T10:00:00.000Z"),
        title: "Resource Event",
        uid: "resource-event-1@test",
      };

      render(
        <Calendar
          events={[resourceEvent]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Click on the event
      const eventElement = screen.getByText("Resource Event");
      fireEvent.click(eventElement);

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
      });

      expect(screen.getByTestId("selected-event-title")).toHaveTextContent(
        "Resource Event"
      );
      expect(
        screen.getByTestId("selected-event-resource-id")
      ).toHaveTextContent("resource-1");
    });

    it("should pass selectedEvent with resourceIds for cross-resource events", async () => {
      const crossResourceEvent: CalendarEvent = {
        end: toZonedDateTime("2025-08-04T11:00:00.000Z"),
        id: "cross-event-1",
        resourceIds: ["resource-1", "resource-2"],
        start: toZonedDateTime("2025-08-04T10:00:00.000Z"),
        title: "Cross Resource Meeting",
        uid: "cross-event-1@test",
      };

      render(
        <Calendar
          events={[crossResourceEvent]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Cross-resource events appear in multiple places, click the first one
      const eventElements = screen.getAllByText("Cross Resource Meeting");
      fireEvent.click(elementAt(eventElements, 0));

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
      });

      expect(
        screen.getByTestId("selected-event-resource-ids")
      ).toHaveTextContent("resource-1,resource-2");
    });

    it("should add event with resourceId via onAdd callback", async () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          onEventAdd={mockOnEventAdd}
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Click add event button
      fireEvent.click(screen.getByTestId("add-event-btn"));

      await waitFor(() => {
        expect(mockOnEventAdd).toHaveBeenCalledOnce();
      });

      expect(mockOnEventAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "new-resource-event-1",
          resourceId: "resource-1",
          title: "New Resource Event",
        })
      );

      // Event should appear on calendar
      await waitFor(() => {
        expect(screen.getByText("New Resource Event")).toBeInTheDocument();
      });
    });

    it("should add cross-resource event with resourceIds via onAdd callback", async () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          onEventAdd={mockOnEventAdd}
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Click add cross-resource event button
      fireEvent.click(screen.getByTestId("add-cross-resource-event-btn"));

      await waitFor(() => {
        expect(mockOnEventAdd).toHaveBeenCalledOnce();
      });

      expect(mockOnEventAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "cross-resource-event-1",
          resourceIds: ["resource-1", "resource-2"],
          title: "Cross Resource Event",
        })
      );
    });

    it("should update event and preserve resourceId via onUpdate callback", async () => {
      const resourceEvent: CalendarEvent = {
        end: toZonedDateTime("2025-08-04T11:00:00.000Z"),
        id: "update-event-1",
        resourceId: "resource-1",
        start: toZonedDateTime("2025-08-04T10:00:00.000Z"),
        title: "Event to Update",
        uid: "update-event-1@test",
      };

      render(
        <Calendar
          events={[resourceEvent]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          onEventUpdate={mockOnEventUpdate}
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Click event to open form
      fireEvent.click(screen.getByText("Event to Update"));

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
      });

      // Update event title
      fireEvent.click(screen.getByTestId("update-event-btn"));

      await waitFor(() => {
        expect(mockOnEventUpdate).toHaveBeenCalledOnce();
      });

      // Should preserve resourceId while updating title
      expect(mockOnEventUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "update-event-1",
          resourceId: "resource-1",
          title: "Updated Resource Event",
        })
      );
    });

    it("should move event to different resource via onUpdate callback", async () => {
      const resourceEvent: CalendarEvent = {
        end: toZonedDateTime("2025-08-04T11:00:00.000Z"),
        id: "move-event-1",
        resourceId: "resource-1",
        start: toZonedDateTime("2025-08-04T10:00:00.000Z"),
        title: "Event to Move",
        uid: "move-event-1@test",
      };

      render(
        <Calendar
          events={[resourceEvent]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          onEventUpdate={mockOnEventUpdate}
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Click event to open form
      fireEvent.click(screen.getByText("Event to Move"));

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
        expect(
          screen.getByTestId("selected-event-resource-id")
        ).toHaveTextContent("resource-1");
      });

      // Move to different resource
      fireEvent.click(screen.getByTestId("update-event-resource-btn"));

      await waitFor(() => {
        expect(mockOnEventUpdate).toHaveBeenCalledOnce();
      });

      // Should have new resourceId
      expect(mockOnEventUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "move-event-1",
          resourceId: "resource-2",
        })
      );
    });

    it("should delete resource event via onDelete callback", async () => {
      const resourceEvent: CalendarEvent = {
        end: toZonedDateTime("2025-08-04T11:00:00.000Z"),
        id: "delete-event-1",
        resourceId: "resource-1",
        start: toZonedDateTime("2025-08-04T10:00:00.000Z"),
        title: "Event to Delete",
        uid: "delete-event-1@test",
      };

      render(
        <Calendar
          events={[resourceEvent]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          onEventDelete={mockOnEventDelete}
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      // Event should be visible
      expect(screen.getByText("Event to Delete")).toBeInTheDocument();

      // Click event to open form
      fireEvent.click(screen.getByText("Event to Delete"));

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
      });

      // Delete event
      fireEvent.click(screen.getByTestId("delete-event-btn"));

      await waitFor(() => {
        expect(mockOnEventDelete).toHaveBeenCalledOnce();
      });

      expect(mockOnEventDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "delete-event-1",
          resourceId: "resource-1",
          title: "Event to Delete",
        })
      );
    });

    it("should use default EventForm when renderEventForm is not provided", async () => {
      render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          resources={mockResources}
        />
      );

      // Custom form should not be present
      expect(screen.queryByTestId("custom-event-form")).not.toBeInTheDocument();

      // Click on an event to open default form
      fireEvent.click(screen.getByText("Team Meeting"));

      // Default form should appear
      await waitFor(() => {
        expect(screen.getByText("Edit Event")).toBeInTheDocument();
      });
    });

    it("should display time in 24-hour format in day view when timeFormat is 24-hour", () => {
      render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="day"
          resources={mockResources}
          timeFormat="24-hour"
        />
      );

      // Find time labels in day view using data-testid
      const timeLabels = screen.getAllByTestId(RESOURCE_DAY_TIME_LABEL);

      // Should have time labels (24 hours)
      expect(timeLabels.length).toBeGreaterThan(0);

      // All time labels should not contain AM/PM in 24-hour format
      for (const label of timeLabels) {
        const text = label.textContent || "";
        expect(text).not.toMatch(AMPM);
        // Should contain time format (with or without :00 for on-the-hour)
        expect(text).toMatch(TIME_OR_HOUR);
      }
    });

    it("should display time in 12-hour format in day view when timeFormat is 12-hour", () => {
      render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="day"
          resources={mockResources}
          timeFormat="12-hour"
        />
      );

      // Find time labels in day view using data-testid
      const timeLabels = screen.getAllByTestId(RESOURCE_DAY_TIME_LABEL);

      // Should have time labels (24 hours)
      expect(timeLabels.length).toBeGreaterThan(0);

      // At least some time labels should contain AM/PM in 12-hour format
      const hasAMPM = timeLabels.some((label) => {
        const text = label.textContent || "";

        return AMPM.test(text);
      });

      expect(hasAMPM).toBeTruthy();
    });

    it("should display time in 24-hour format in week view when timeFormat is 24-hour", () => {
      render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="week"
          resources={mockResources}
          timeFormat="24-hour"
        />
      );

      // Find time labels in week view using data-testid
      const timeLabels = screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL);

      // Should have time labels (24 hours * 7 days = 168)
      expect(timeLabels.length).toBeGreaterThan(0);

      // All time labels should not contain AM/PM in 24-hour format
      for (const label of timeLabels) {
        const text = label.textContent || "";
        expect(text).not.toMatch(AMPM);
        // Should contain time format (with or without :00 for on-the-hour)
        expect(text).toMatch(TIME_OR_HOUR);
      }
    });

    it("should display time in 12-hour format in week view when timeFormat is 12-hour", () => {
      render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="week"
          resources={mockResources}
          timeFormat="12-hour"
        />
      );

      // Find time labels in week view using data-testid
      const timeLabels = screen.getAllByTestId(RESOURCE_WEEK_TIME_LABEL);

      // Should have time labels (24 hours * 7 days = 168)
      expect(timeLabels.length).toBeGreaterThan(0);

      // At least some time labels should contain AM/PM in 12-hour format
      const hasAMPM = timeLabels.some((label) => {
        const text = label.textContent || "";

        return AMPM.test(text);
      });

      expect(hasAMPM).toBeTruthy();
    });

    it("should default to 12-hour format when timeFormat is not provided", () => {
      render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="day"
          resources={mockResources}
        />
      );

      // Find time labels using data-testid
      const timeLabels = screen.getAllByTestId(RESOURCE_DAY_TIME_LABEL);

      // Should have time labels
      expect(timeLabels.length).toBeGreaterThan(0);

      // Should default to 12-hour format
      const hasAMPM = timeLabels.some((label) => {
        const text = label.textContent || "";

        return AMPM.test(text);
      });

      expect(hasAMPM).toBeTruthy();
    });

    it("should update time format when timeFormat changes", () => {
      const { rerender } = render(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="day"
          resources={mockResources}
          timeFormat="12-hour"
        />
      );

      // Initially should show 12-hour format
      let timeLabels = [...document.querySelectorAll(".text-xs")].filter(
        (el) => {
          const text = el.textContent || "";

          return TIME_OR_HOUR.test(text);
        }
      );

      const hasAMPM = timeLabels.some((label) => {
        const text = label.textContent || "";

        return AMPM.test(text);
      });

      expect(hasAMPM).toBeTruthy();

      // Rerender with 24-hour format
      rerender(
        <Calendar
          events={mockEvents}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="day"
          resources={mockResources}
          timeFormat="24-hour"
        />
      );

      // Now should show 24-hour format
      timeLabels = [...document.querySelectorAll(".text-xs")].filter((el) => {
        const text = el.textContent || "";

        return TIME_OR_HOUR.test(text);
      });

      for (const label of timeLabels) {
        const text = label.textContent || "";
        expect(text).not.toMatch(AMPM);
      }
    });
  });

  describe("resources prop sync (issue #153)", () => {
    const courtOne: Resource = { id: "court-1", title: "Court #1" };
    const courtTwo: Resource = { id: "court-2", title: "Court #2" };
    const courtThree: Resource = { id: "court-3", title: "Court #3" };

    it("reflects a replaced resources prop without remount", () => {
      const { rerender } = render(
        <Calendar initialView="day" resources={[courtOne]} />
      );

      expect(screen.getByText("Court #1")).toBeInTheDocument();
      expect(screen.queryByText("Court #2")).not.toBeInTheDocument();

      rerender(<Calendar initialView="day" resources={[courtTwo]} />);

      expect(screen.queryByText("Court #1")).not.toBeInTheDocument();
      expect(screen.getByText("Court #2")).toBeInTheDocument();
    });

    it("shows newly-added resources by default", () => {
      const { rerender } = render(
        <Calendar initialView="day" resources={[courtOne, courtTwo]} />
      );

      expect(screen.queryByText("Court #3")).not.toBeInTheDocument();

      rerender(
        <Calendar
          initialView="day"
          resources={[courtOne, courtTwo, courtThree]}
        />
      );

      expect(screen.getByText("Court #1")).toBeInTheDocument();
      expect(screen.getByText("Court #2")).toBeInTheDocument();
      expect(screen.getByText("Court #3")).toBeInTheDocument();
    });

    it("drops removed resources from the visible set", () => {
      const { rerender } = render(
        <Calendar
          initialView="day"
          resources={[courtOne, courtTwo, courtThree]}
        />
      );

      expect(screen.getByText("Court #2")).toBeInTheDocument();

      rerender(
        <Calendar initialView="day" resources={[courtOne, courtThree]} />
      );

      expect(screen.getByText("Court #1")).toBeInTheDocument();
      expect(screen.queryByText("Court #2")).not.toBeInTheDocument();
      expect(screen.getByText("Court #3")).toBeInTheDocument();
    });
  });

  describe("isCellDisabled (issue #79)", () => {
    it("disables the matching cell and passes the full resource", () => {
      const onCellClick = vi.fn<(info: CellInfo) => void>();
      const seenResourceIds: (string | number | undefined)[] = [];

      const isDisabled = (info: CellInfo) => {
        seenResourceIds.push(info.resource?.id);

        return info.start.day === 10;
      };

      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          isCellDisabled={isDisabled}
          onCellClick={onCellClick}
          resources={[mockResources[0]]}
        />
      );

      const row = screen.getByTestId("horizontal-row-resource-1");
      const disabledCell = within(row).getByTestId("day-cell-2025-08-10");
      const enabledCell = within(row).getByTestId("day-cell-2025-08-04");

      expect(disabledCell.dataset.disabled).toBe("true");
      expect(enabledCell.dataset.disabled).toBe("false");

      clickCellSlot(disabledCell);
      expect(onCellClick).toHaveBeenCalledTimes(0);

      // The predicate received the full resource object, not just the id.
      expect(seenResourceIds).toContain("resource-1");
    });
  });

  describe("cell click fallback (no onCellClick)", () => {
    const allDayCellInfo: CellInfo = {
      allDay: true,
      end: toZonedDateTime("2025-08-04T23:59:59.999Z"),
      resource: mockResources.at(0),
      start: toZonedDateTime("2025-08-04T00:00:00.000Z"),
    };

    it("opens the form with a new event carrying the clicked cell resource", async () => {
      render(
        <Calendar
          events={[]}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      const row = screen.getByTestId("horizontal-row-resource-2");
      clickCellSlot(within(row).getByTestId("day-cell-2025-08-04"));

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
      });
      expect(screen.getByTestId("selected-event-title")).toHaveTextContent(
        "New Event"
      );
      expect(
        screen.getByTestId("selected-event-resource-id")
      ).toHaveTextContent("resource-2");
      expect(screen.getByTestId("selected-event-all-day")).toHaveTextContent(
        "timed"
      );
    });

    it("respects the allDay flag of the clicked cell (v2 unified behavior)", async () => {
      render(
        <Calendar
          events={[]}
          headerComponent={<CellClickProbe info={allDayCellInfo} />}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      fireEvent.click(screen.getByTestId("probe-cell-click"));

      await waitFor(() => {
        expect(screen.getByTestId("form-open")).toHaveTextContent("open");
      });
      expect(screen.getByTestId("selected-event-all-day")).toHaveTextContent(
        "all-day"
      );
      expect(
        screen.getByTestId("selected-event-resource-id")
      ).toHaveTextContent("resource-1");
    });

    it("ignores the fallback entirely when disableCellClick is set", () => {
      render(
        <Calendar
          disableCellClick={true}
          events={[]}
          headerComponent={<CellClickProbe info={allDayCellInfo} />}
          initialDate={toZonedDateTime("2025-08-04T00:00:00.000Z")}
          initialView="month"
          renderEventForm={CustomResourceEventForm}
          resources={mockResources}
        />
      );

      fireEvent.click(screen.getByTestId("probe-cell-click"));

      expect(screen.getByTestId("form-open")).toHaveTextContent("closed");
    });
  });
});
