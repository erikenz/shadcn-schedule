import { act, render } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { CalendarProviderProps } from "@/features/calendar/contexts/calendar-context/provider";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { hasText } from "@/lib/guards";
import { recurrencePlugin } from "@/plugins/recurrence/index";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import type { BusinessHours, CalendarEvent, Resource } from "@/types/index";
import {
  endOf,
  format,
  isSame,
  monthIndex,
  now,
  startOf,
  toDate,
  toZonedDateTime,
  weekday,
} from "@/utils/temporal";

const TestNoDuplicates = () => {
  const { getEventsForDateRange } = useSmartCalendarContext();

  // Get events for a range that includes the modified date
  const rangeEvents = getEventsForDateRange(
    toZonedDateTime("2025-01-01T00:00:00.000Z"),
    toZonedDateTime("2025-01-05T00:00:00.000Z")
  );

  // Count events on the modified date (Jan 3rd)
  const jan3Events = rangeEvents.filter((event) =>
    isSame(event.start, toZonedDateTime("2025-01-03T00:00:00.000Z"), "day")
  );

  return (
    <div>
      <div data-testid="jan3-event-count">{jan3Events.length}</div>
      <div data-testid="jan3-event-hour">
        {jan3Events[0]?.start.hour ?? "none"}
      </div>
      <div data-testid="jan3-event-id">{jan3Events[0]?.id ?? "none"}</div>
    </div>
  );
};

const TestView = () => {
  const { view } = useSmartCalendarContext();

  return <div data-testid="current-view">{view}</div>;
};

const TestResourceAxis = () => {
  const ctx = useSmartCalendarContext();
  const r1Events = ctx.getEventsForResource("r1");
  const crossEvent = r1Events.at(1);
  const isCross = crossEvent && ctx.isEventCrossResource(crossEvent);

  return (
    <div>
      <div data-testid="axis-resources">
        {(ctx.resources ?? []).map((r) => r.id).join(",")}
      </div>
      <div data-testid="axis-orientation">{ctx.orientation}</div>
      <div data-testid="axis-granularity">{ctx.weekViewGranularity}</div>
      <div data-testid="axis-r1-events">
        {r1Events.map((e) => e.id).join(",")}
      </div>
      <div data-testid="axis-resource-title">
        {ctx.getResourceById("r1")?.title ?? "none"}
      </div>
      <div data-testid="axis-cross">
        {isCross === true ? "cross" : "single"}
      </div>
    </div>
  );
};

const BusinessHoursProbe = () => {
  const { businessHours: contextBusinessHours } = useSmartCalendarContext();

  return (
    <div data-testid="business-hours">
      {JSON.stringify(contextBusinessHours)}
    </div>
  );
};

const WeekRangeProbe = () => {
  const { getEventsForDateRange } = useSmartCalendarContext();

  // Test date: Wednesday Oct 15, 2025
  const testDate = toZonedDateTime("2025-10-15T00:00:00.000Z");

  // Calculate week range - should be Mon Oct 13 to Sun Oct 19
  const currentDay = weekday(testDate);
  // firstDayOfWeek = 1 (Monday)
  const diff = (currentDay - 1 + 7) % 7;
  const expectedStart = startOf(testDate.subtract({ days: diff }), "day");
  const expectedEnd = endOf(expectedStart.add({ days: 6 }), "day");

  const weekEvents = getEventsForDateRange(expectedStart, expectedEnd);

  return (
    <div>
      <div data-testid="week-start-day">{format(expectedStart, "dddd")}</div>
      <div data-testid="week-start-date">{format(expectedStart, "D")}</div>
      <div data-testid="week-end-day">{format(expectedEnd, "dddd")}</div>
      <div data-testid="week-end-date">{format(expectedEnd, "D")}</div>
      <div data-testid="events-count">{weekEvents.length}</div>
    </div>
  );
};

const SundayWeekProbe = () => {
  // Test date: Sunday Oct 12, 2025
  const testDate = toZonedDateTime("2025-10-12T00:00:00.000Z");

  // Calculate week range - should be Mon Oct 6 to Sun Oct 12
  const currentDay = weekday(testDate);
  // firstDayOfWeek = 1 (Monday)
  const diff = (currentDay - 1 + 7) % 7;
  const expectedStart = startOf(testDate.subtract({ days: diff }), "day");
  const expectedEnd = endOf(expectedStart.add({ days: 6 }), "day");

  return (
    <div>
      <div data-testid="week-start-day">{format(expectedStart, "dddd")}</div>
      <div data-testid="week-start-date">{format(expectedStart, "D")}</div>
      <div data-testid="week-end-day">{format(expectedEnd, "dddd")}</div>
      <div data-testid="week-end-date">{format(expectedEnd, "D")}</div>
    </div>
  );
};

const MonthRangeProbe = () => {
  // October 2025 starts on Wednesday Oct 1
  const oct1 = toZonedDateTime("2025-10-01T00:00:00.000Z");

  // For month view with Monday as first day:
  // Should start on Monday Sep 29 (to complete the first week)
  // Should end on Sunday Nov 2 (to complete the last week)
  const monthStart = startOf(oct1, "month");
  const monthStartDay = weekday(monthStart);
  const startDiff = (monthStartDay - 1 + 7) % 7;

  const expectedStart = startOf(
    monthStart.subtract({ days: startDiff }),
    "day"
  );

  const monthEnd = endOf(oct1, "month");
  const monthEndDay = weekday(monthEnd);
  const endDiff = 6 - ((monthEndDay - 1 + 7) % 7);
  const expectedEnd = endOf(monthEnd.add({ days: endDiff }), "day");

  return (
    <div>
      <div data-testid="month-start-day">{format(expectedStart, "dddd")}</div>
      <div data-testid="month-start-date">{format(expectedStart, "MMM D")}</div>
      <div data-testid="month-end-day">{format(expectedEnd, "dddd")}</div>
      <div data-testid="month-end-date">{format(expectedEnd, "MMM D")}</div>
    </div>
  );
};

// Default test props
const defaultProps = {
  dayMaxEvents: 5,
  events: [] satisfies CalendarEvent[],
  firstDayOfWeek: 0,
};

// Compact event factory: id doubles as title; July 1 9-10am unless overridden.
const mkEvent = (
  id: string,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-07-01T10:00:00.000Z"),
  id,
  start: toZonedDateTime("2025-07-01T09:00:00.000Z"),
  title: id,
  ...extra,
});

// Factory for a daily recurring event starting July 1 at 9am
const makeDailyRecurringEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-07-01").with({ hour: 10 }),
  id: "test-recurring",
  rrule: {
    dtstart: toDate(toZonedDateTime("2025-07-01").with({ hour: 9 })),
    freq: FREQ.DAILY,
    interval: 1,
  },
  start: toZonedDateTime("2025-07-01").with({ hour: 9 }),
  title: "Daily Meeting",
  uid: "test-recurring@calendar.test",
  ...overrides,
});

// Test component to capture context values
// oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
const TestWrapper = ({
  children,
  testId,
}: {
  children: React.ReactNode;
  testId?: string;
}) => {
  const { currentDate } = useSmartCalendarContext();

  if (!hasText(testId)) {
    return children;
  }

  return (
    <>
      <div data-testid={`${testId}-year`}>{currentDate.year}</div>
      <div data-testid={`${testId}-month`}>{monthIndex(currentDate)}</div>
      <div data-testid={`${testId}-date`}>{currentDate.day}</div>
      {children}
    </>
  );
};

// Render helper function
const renderProvider = (
  children: React.ReactNode,
  props: Partial<CalendarProviderProps> = {},
  testId?: string
) =>
  render(
    <CalendarProvider {...defaultProps} {...props}>
      <TestWrapper testId={testId}>{children}</TestWrapper>
    </CalendarProvider>
  );

const renderResourceAxis = () => {
  const resources: Resource[] = [{ id: "r1", title: "Room 1" }];

  const events = [
    mkEvent("e1", { resourceId: "r1" }),
    mkEvent("e2", { resourceIds: ["r1", "r2"] }),
    // unassigned
    mkEvent("e3"),
  ];

  return renderProvider(<TestResourceAxis />, {
    events,
    resources,
    initialDate: toZonedDateTime("2025-07-01T00:00:00.000Z"),
    orientation: "vertical",
  });
};

// Test component to access context
const TestComponent = () => {
  const { events, getEventsForDateRange } = useSmartCalendarContext();

  // Test on-demand generation for a specific range
  const rangeEvents = getEventsForDateRange(
    toZonedDateTime("2025-07-01"),
    endOf(toZonedDateTime("2025-07-07"), "day")
  );

  return (
    <div>
      <div data-testid="total-events">{events.length}</div>
      <div data-testid="range-events">{rangeEvents.length}</div>
    </div>
  );
};

describe("CalendarProvider - On-Demand Generation", () => {
  it("should generate recurring events on-demand for current view only", () => {
    const recurringEvent = makeDailyRecurringEvent();

    const { getByTestId } = renderProvider(<TestComponent />, {
      dayMaxEvents: 3,
      events: [recurringEvent],
      plugins: [recurrencePlugin()],
    });

    // Should generate events for the current view range (7 days from July 1-7)
    const rangeEventsCount = Math.trunc(
      Number(getByTestId("range-events").textContent || "0")
    );

    expect(rangeEventsCount).toBe(7);
  });

  it("should handle non-recurring events efficiently", () => {
    const nonRecurringEvent: CalendarEvent = {
      end: toZonedDateTime("2025-07-03").with({ hour: 10 }),
      id: "test-single",
      start: toZonedDateTime("2025-07-03").with({ hour: 9 }),
      title: "One-time Meeting",
    };

    const { getByTestId } = renderProvider(<TestComponent />, {
      dayMaxEvents: 3,
      events: [nonRecurringEvent],
    });

    // Should include the single event in range
    const rangeEventsCount = Math.trunc(
      Number(getByTestId("range-events").textContent || "0")
    );

    expect(rangeEventsCount).toBe(1);
  });

  it("should exclude events with EXDATE exclusions", () => {
    const recurringEventWithExdates = makeDailyRecurringEvent({
      // Exclude all dates in range
      exdates: [
        "2025-07-01T09:00:00.000Z",
        "2025-07-02T09:00:00.000Z",
        "2025-07-03T09:00:00.000Z",
        "2025-07-04T09:00:00.000Z",
        "2025-07-05T09:00:00.000Z",
        "2025-07-06T09:00:00.000Z",
        "2025-07-07T09:00:00.000Z",
      ],
      id: "test-excluded",
      title: "Meeting with Exclusions",
      uid: "test-excluded@calendar.test",
    });

    const { getByTestId } = renderProvider(<TestComponent />, {
      dayMaxEvents: 3,
      events: [recurringEventWithExdates],
      plugins: [recurrencePlugin()],
    });

    // Should not generate any events for excluded dates
    const rangeEventsCount = Math.trunc(
      Number(getByTestId("range-events").textContent || "0")
    );

    expect(rangeEventsCount).toBe(0);
  });
});

describe("CalendarProvider - recurring event integration", () => {
  it("should not create duplicate events when recurring events are modified", () => {
    // Create a base recurring event
    const baseEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-01T09:30:00.000Z"),
      id: "daily-standup",
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-01-01T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-01T09:00:00.000Z"),
      title: "Daily Standup",
      uid: "daily-standup@calendar",
    };

    // Create a modified instance (what gets created when user drags/edits an occurrence)
    const modifiedInstance: CalendarEvent = {
      end: toZonedDateTime("2025-01-03T10:30:00.000Z"),
      id: "daily-standup_modified_123",
      // Original occurrence time
      recurrenceId: "2025-01-03T09:00:00.000Z",
      // Moved to different time
      start: toZonedDateTime("2025-01-03T10:00:00.000Z"),
      title: "Daily Standup",
      // Same UID as base
      uid: "daily-standup@calendar",
    };

    // Update base event with EXDATE to exclude the modified occurrence
    const baseEventWithExdate: CalendarEvent = {
      ...baseEvent,
      exdates: ["2025-01-03T09:00:00.000Z"],
    };

    const events = [baseEventWithExdate, modifiedInstance];

    const { getByTestId } = renderProvider(<TestNoDuplicates />, {
      events,
      dayMaxEvents: 5,
      plugins: [recurrencePlugin()],
    });

    // Should have 2 events on Jan 3rd (the base event generates one instance, and the modified instance is also present)
    expect(getByTestId("jan3-event-count").textContent).toBe("2");
    // Should be the modified time (10:00), not original (09:00)
    expect(getByTestId("jan3-event-hour").textContent).toBe("10");
    expect(getByTestId("jan3-event-id").textContent).toBe(
      "daily-standup_modified_123"
    );
  });

  it("should call regular callbacks for recurring event operations", () => {
    const onEventUpdate = vi.fn<(event: CalendarEvent) => void>(() => {});
    const onEventAdd = vi.fn<(event: CalendarEvent) => void>(() => {});
    const onEventDelete = vi.fn<(event: CalendarEvent) => void>(() => {});

    const recurringEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
      exdates: [],
      id: "weekly-meeting",
      rrule: {
        byweekday: [WEEKDAYS.MO],
        dtstart: toDate(toZonedDateTime("2025-01-06T10:00:00.000Z")),
        freq: FREQ.WEEKLY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      title: "Weekly Meeting",
      uid: "weekly-meeting@calendar.local",
    };

    const TestRecurringCallbacks = () => {
      const { applyScopedEdit, applyScopedDelete } = useSmartCalendarContext();

      const handleUpdateRecurring = () => {
        applyScopedEdit(
          recurringEvent,
          { title: "Updated Weekly Meeting" },
          "this"
        );
      };

      const handleDeleteRecurring = () => {
        applyScopedDelete(recurringEvent, "this");
      };

      return (
        <div>
          <button
            data-testid="update-recurring"
            onClick={handleUpdateRecurring}
            type="button"
          >
            Update Recurring
          </button>
          <button
            data-testid="delete-recurring"
            onClick={handleDeleteRecurring}
            type="button"
          >
            Delete Recurring
          </button>
        </div>
      );
    };

    const { getByTestId } = renderProvider(<TestRecurringCallbacks />, {
      onEventAdd,
      onEventDelete,
      onEventUpdate,
      dayMaxEvents: 5,
      events: [recurringEvent],
      plugins: [recurrencePlugin()],
    });

    // Scope "this" on base: update base (EXDATE) + add detached override
    act(() => {
      getByTestId("update-recurring").click();
    });
    expect(onEventUpdate).toHaveBeenCalledOnce();
    expect(onEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        exdates: ["2025-01-06T10:00:00.000Z"],
        id: "weekly-meeting",
      })
    );

    expect(onEventAdd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: expect.stringContaining("weekly-meeting_modified_"),
        title: "Updated Weekly Meeting",
      })
    );

    // Scope "this" delete on the base after an edit: the base already exdates
    // this occurrence, so only the detached override is reported (onEventDelete).
    act(() => {
      getByTestId("delete-recurring").click();
    });
    expect(onEventUpdate).toHaveBeenCalledOnce();
    expect(onEventDelete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: expect.stringContaining("weekly-meeting_modified_"),
        recurrenceId: "2025-01-06T10:00:00.000Z",
      })
    );
  });

  it("should call onEventUpdate for rrule changes", () => {
    const onEventUpdate = vi.fn<(event: CalendarEvent) => void>(() => {});
    const onEventAdd = vi.fn<(event: CalendarEvent) => void>(() => {});

    const recurringEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T09:30:00.000Z"),
      exdates: [],
      id: "daily-standup",
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Daily Standup",
      uid: "daily-standup@calendar.local",
    };

    const TestRruleUpdate = () => {
      const { applyScopedEdit } = useSmartCalendarContext();

      const handleUpdateRrule = () => {
        // Change from daily to weekly
        applyScopedEdit(
          recurringEvent,
          {
            rrule: {
              byweekday: [WEEKDAYS.MO],
              dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
              freq: FREQ.WEEKLY,
              interval: 1,
            },
          },
          "all"
        );
      };

      return (
        <div>
          <button
            data-testid="update-rrule"
            onClick={handleUpdateRrule}
            type="button"
          >
            Update Rrule
          </button>
        </div>
      );
    };

    const { getByTestId } = renderProvider(<TestRruleUpdate />, {
      onEventAdd,
      onEventUpdate,
      dayMaxEvents: 5,
      events: [recurringEvent],
      plugins: [recurrencePlugin()],
    });

    // Scope "all": single onEventUpdate with persisted base id
    act(() => {
      getByTestId("update-rrule").click();
    });
    expect(onEventUpdate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: "daily-standup",
        rrule: expect.objectContaining({
          byweekday: [WEEKDAYS.MO],
          freq: FREQ.WEEKLY,
        }),
      })
    );
    expect(onEventAdd).not.toHaveBeenCalled();
  });

  it("should call onEventUpdate for time/date changes in recurring events", () => {
    const onEventUpdate = vi.fn<(event: CalendarEvent) => void>(() => {});
    const onEventAdd = vi.fn<(event: CalendarEvent) => void>(() => {});

    const recurringEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T15:00:00.000Z"),
      exdates: [],
      id: "team-meeting",
      rrule: {
        byweekday: [WEEKDAYS.MO],
        dtstart: toDate(toZonedDateTime("2025-01-06T14:00:00.000Z")),
        freq: FREQ.WEEKLY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-06T14:00:00.000Z"),
      title: "Team Meeting",
      uid: "team-meeting@calendar.local",
    };

    const TestTimeUpdate = () => {
      const { applyScopedEdit } = useSmartCalendarContext();

      const handleUpdateTime = () => {
        // Change time from 2pm-3pm to 10am-11am
        applyScopedEdit(
          recurringEvent,
          {
            end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
            start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
          },
          "all"
        );
      };

      return (
        <div>
          <button
            data-testid="update-time"
            onClick={handleUpdateTime}
            type="button"
          >
            Update Time
          </button>
        </div>
      );
    };

    const { getByTestId } = renderProvider(<TestTimeUpdate />, {
      onEventAdd,
      onEventUpdate,
      dayMaxEvents: 5,
      events: [recurringEvent],
      plugins: [recurrencePlugin()],
    });

    // Scope "all": onEventUpdate with base id and anchored times
    act(() => {
      getByTestId("update-time").click();
    });
    expect(onEventUpdate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        end: toZonedDateTime("2025-01-06T11:00:00.000Z"),
        id: "team-meeting",
        start: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      })
    );
    expect(onEventAdd).not.toHaveBeenCalled();
  });

  it("should initialize with the specified initial view", () => {
    const { getByTestId } = renderProvider(<TestView />, {
      dayMaxEvents: 5,
      initialView: "week",
    });

    expect(getByTestId("current-view").textContent).toBe("week");
  });

  it("should default to month view when no initialView is provided", () => {
    const { getByTestId } = renderProvider(<TestView />, {
      dayMaxEvents: 5,
    });

    expect(getByTestId("current-view").textContent).toBe("month");
  });

  it("should initialize with the specified initial date", () => {
    const initialDate = toZonedDateTime("2025-06-15T10:00:00.000Z");

    const { getByTestId } = renderProvider(
      <div />,
      {
        dayMaxEvents: 5,
        initialDate,
      },
      "current-date"
    );

    // Verify the calendar initializes with the specified date
    expect(getByTestId("current-date-year").textContent).toBe("2025");
    // June is month 5 (0-indexed)
    expect(getByTestId("current-date-month").textContent).toBe("5");
    expect(getByTestId("current-date-date").textContent).toBe("15");
  });

  it("should default to today when no initialDate is provided", () => {
    const today = now();

    const { getByTestId } = renderProvider(
      <div />,
      {
        dayMaxEvents: 5,
      },
      "current-date"
    );

    // Verify the calendar defaults to today's date
    expect(getByTestId("current-date-year").textContent).toBe(
      today.year.toString()
    );
    expect(getByTestId("current-date-month").textContent).toBe(
      monthIndex(today).toString()
    );
    expect(getByTestId("current-date-date").textContent).toBe(
      today.day.toString()
    );
  });
});

describe("CalendarProvider - render stability", () => {
  it("keeps the context value referentially stable across identical re-renders", () => {
    const seenContexts: unknown[] = [];

    const CaptureContext = () => {
      seenContexts.push(useSmartCalendarContext());

      return null;
    };

    // Same prop VALUES on fresh elements each time — a parent re-render. The
    // fresh child element forces the consumer to re-render and re-read the
    // context, so the assertion compares two actual reads.
    const events: CalendarEvent[] = [];

    const ui = () => (
      <CalendarProvider dayMaxEvents={5} events={events} firstDayOfWeek={0}>
        <CaptureContext />
      </CalendarProvider>
    );

    const { rerender } = render(ui());
    rerender(ui());

    expect(seenContexts).toHaveLength(2);
    expect(seenContexts.at(1)).toBe(seenContexts.at(0));
  });
});

describe("CalendarProvider - Resource Axis", () => {
  // One resource, one direct event, one cross-resource event, one unassigned.

  it("exposes the resources passed as props", () => {
    const { getByTestId } = renderResourceAxis();
    expect(getByTestId("axis-resources").textContent).toBe("r1");
  });

  it("exposes the orientation passed as props", () => {
    const { getByTestId } = renderResourceAxis();
    expect(getByTestId("axis-orientation").textContent).toBe("vertical");
  });

  it("defaults weekViewGranularity to hourly", () => {
    const { getByTestId } = renderResourceAxis();
    expect(getByTestId("axis-granularity").textContent).toBe("hourly");
  });

  it("getEventsForResource returns direct and cross-resource members, not unassigned", () => {
    const { getByTestId } = renderResourceAxis();
    expect(getByTestId("axis-r1-events").textContent).toBe("e1,e2");
  });

  it("getResourceById resolves the full resource", () => {
    const { getByTestId } = renderResourceAxis();
    expect(getByTestId("axis-resource-title").textContent).toBe("Room 1");
  });

  it("isEventCrossResource identifies multi-resource events", () => {
    const { getByTestId } = renderResourceAxis();
    expect(getByTestId("axis-cross").textContent).toBe("cross");
  });
});

describe("CalendarProvider - Business Hours", () => {
  it("should provide businessHours in context", () => {
    const businessHours: BusinessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    const { getByTestId } = renderProvider(<BusinessHoursProbe />, {
      businessHours,
    });

    const content = getByTestId("business-hours").textContent;
    expect(content).toBe(JSON.stringify(businessHours));
  });
});

describe("firstDayOfWeek functionality", () => {
  it("should calculate correct week range when firstDayOfWeek is Monday", () => {
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-10-14T11:00:00.000Z"),
      id: "test-1",
      // Tuesday
      start: toZonedDateTime("2025-10-14T10:00:00.000Z"),
      title: "Test Event",
      uid: "test-1@test.com",
    };

    const { getByTestId } = renderProvider(<WeekRangeProbe />, {
      events: [testEvent],
      // Monday
      firstDayOfWeek: 1,
      // Wednesday
      initialDate: toZonedDateTime("2025-10-15T00:00:00.000Z"),
    });

    // Verify week starts on Monday
    expect(getByTestId("week-start-day").textContent).toBe("Monday");
    expect(getByTestId("week-start-date").textContent).toBe("13");

    // Verify week ends on Sunday
    expect(getByTestId("week-end-day").textContent).toBe("Sunday");
    expect(getByTestId("week-end-date").textContent).toBe("19");

    // Verify event is included in the week range
    expect(getByTestId("events-count").textContent).toBe("1");
  });

  it("should calculate correct week range when current date is Sunday and firstDayOfWeek is Monday", () => {
    const { getByTestId } = renderProvider(<SundayWeekProbe />, {
      // Monday
      firstDayOfWeek: 1,
      // Sunday
      initialDate: toZonedDateTime("2025-10-12T00:00:00.000Z"),
    });

    // Verify week starts on Monday (6 days before Sunday)
    expect(getByTestId("week-start-day").textContent).toBe("Monday");
    expect(getByTestId("week-start-date").textContent).toBe("6");

    // Verify week ends on Sunday (current date)
    expect(getByTestId("week-end-day").textContent).toBe("Sunday");
    expect(getByTestId("week-end-date").textContent).toBe("12");
  });

  it("should calculate correct month range when firstDayOfWeek is Monday", () => {
    const { getByTestId } = renderProvider(<MonthRangeProbe />, {
      // Monday
      firstDayOfWeek: 1,
      initialDate: toZonedDateTime("2025-10-01T00:00:00.000Z"),
    });

    // Verify month grid starts on Monday
    expect(getByTestId("month-start-day").textContent).toBe("Monday");
    expect(getByTestId("month-start-date").textContent).toBe("Sep 29");

    // Verify month grid ends on Sunday
    expect(getByTestId("month-end-day").textContent).toBe("Sunday");
    expect(getByTestId("month-end-date").textContent).toBe("Nov 2");
  });
});
