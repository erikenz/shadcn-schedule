import { cleanup, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GUTTER_WIDTH,
  STICKY_GUTTER_SHADOW,
} from "@/components/vertical-grid/gutter";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { DISABLED_CELL_CLASSNAME } from "@/lib/constants";
import { textOr } from "@/lib/guards";
import { generateMockEvents } from "@/testing/generator";
import { WeekView } from "@/testing/view-harnesses";
import type { CalendarEvent } from "@/types/index";
import {
  format,
  monthIndex,
  now,
  startOf,
  toZonedDateTime,
  weekday,
} from "@/utils/temporal";

const renderHour = (date: Temporal.ZonedDateTime) => (
  <span data-testid={`custom-hour-${format(date, "HH")}`}>
    {format(date, "HH:mm")}
  </span>
);

const weekDays: string[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const AMPM = /AM|PM/iu;

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents();

// Default to Sunday
const firstDayOfWeek = 0;

// Default max events per day
const dayMaxEvents = 3;

// Default locale
let locale = "en";

// Default to current date
const defaultInitialDate = now();

// Test component to capture context values
const TestWrapper = ({
  children,
  testId,
}: {
  children: React.ReactNode;
  testId: string;
}) => {
  const { currentDate } = useSmartCalendarContext();

  return (
    <>
      <div data-testid={`${testId}-year`}>{currentDate.year}</div>
      <div data-testid={`${testId}-month`}>{monthIndex(currentDate)}</div>
      <div data-testid={`${testId}-date`}>{currentDate.day}</div>
      {children}
    </>
  );
};

const renderWeekView = (props = {}) => {
  const testId = "current-date";

  return render(
    <CalendarProvider
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      firstDayOfWeek={firstDayOfWeek}
      initialDate={defaultInitialDate}
      locale={locale}
      {...props}
    >
      <TestWrapper testId={testId}>
        <WeekView />
      </TestWrapper>
    </CalendarProvider>
  );
};

describe(WeekView, () => {
  beforeEach(() => {
    // Reset the dayjs locale to default before each test
    locale = "en";

    // render the WeekView with default props
    renderWeekView();
  });

  it("renders week view structure with proper layout", () => {
    // Should have the main container structure
    const container = screen.getByTestId("vertical-grid-scroll");
    expect(container).toBeInTheDocument();

    // Should have week header structure
    const headerContainer = screen.getByTestId("vertical-grid-header");
    expect(headerContainer).toBeInTheDocument();

    // Should have all-day row structure
    const allDayContainers = screen.getAllByTestId("vertical-grid-all-day");
    expect(allDayContainers.length).toBeGreaterThan(0);

    // Should have time grid structure
    const timeGridContainer = screen.getByTestId("vertical-grid-body");
    expect(timeGridContainer).toBeInTheDocument();
  });

  it("renders WeekView with correct weekday headers starting from Sunday", () => {
    // Check that all weekday headers are present using test IDs
    for (const day of weekDays) {
      expect(
        screen.getByTestId(`week-header-weekday-${day.toLowerCase()}`)
      ).toBeInTheDocument();
    }
  });

  it("animates the day label only, leaving the header cell static", () => {
    cleanup();
    renderWeekView();

    const cell = screen.getByTestId("week-header-weekday-sunday");
    const animated = cell.querySelector<HTMLElement>(".animate-enter-y");

    // The clickable cell keeps its background and hover styling; only the
    // label inside enters, matching the year view. No stagger.
    expect(cell.className).not.toContain("animate-enter-y");
    expect(animated).not.toBeNull();
    expect(animated?.style.animationDelay).toBe("0s");
  });

  it("renders WeekView with correct weekday headers starting from Monday", () => {
    // Clean up previous renders
    cleanup();
    // Set Monday as first day of week
    renderWeekView({ firstDayOfWeek: 1 });

    // When starting from Monday, all weekdays should still be present
    for (const day of weekDays) {
      expect(
        screen.getByTestId(`week-header-weekday-${day.toLowerCase()}`)
      ).toBeInTheDocument();
    }
  });

  it("displays current week dates correctly", () => {
    // Get the current week's start and end dates
    const currentWeek = startOf(defaultInitialDate, "week");
    const weekStart = currentWeek.day;
    const weekEnd = currentWeek.add({ days: 6 }).day;

    // Should find the start and end dates of the current week
    const startDateElements = screen.getAllByText(weekStart.toString());
    const endDateElements = screen.getAllByText(weekEnd.toString());

    expect(startDateElements.length).toBeGreaterThan(0);
    expect(endDateElements.length).toBeGreaterThan(0);
  });

  it("handles events display in week structure", () => {
    // Should render the week structure
    expect(screen.getByTestId("vertical-grid-scroll")).toBeInTheDocument();

    // Should have the time grid for events
    expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();

    // Should have all-day row for all-day events
    expect(
      screen.getAllByTestId("vertical-grid-all-day").length
    ).toBeGreaterThan(0);
  });

  it("renders with proper scrollable time grid", () => {
    // Check for scrollable container
    const scrollArea = screen.getByTestId("vertical-grid-scroll");
    expect(scrollArea).toBeInTheDocument();

    // Check for time grid within scroll area
    const timeGrid = screen.getByTestId("vertical-grid-body");
    expect(timeGrid).toBeInTheDocument();
  });

  it("respects firstDayOfWeek prop", () => {
    // Clean up previous renders
    cleanup();
    // Set Monday as first day
    renderWeekView({ firstDayOfWeek: 1 });

    // Check that Monday header is present (order will be handled by component logic)
    expect(
      screen.getByTestId("week-header-weekday-monday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-sunday")
    ).toBeInTheDocument();
  });

  it("handles different locale settings", () => {
    // Clean up previous renders
    cleanup();
    renderWeekView({ locale: "en" });

    // Should render with English locale by default using test IDs
    expect(
      screen.getByTestId("week-header-weekday-sunday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-monday")
    ).toBeInTheDocument();
  });

  it("renders time slots structure", () => {
    // Should have time grid for the day
    const timeGrid = screen.getByTestId("vertical-grid-body");
    expect(timeGrid).toBeInTheDocument();

    // Should have time labels column
    const timeLabels = screen.getByTestId("vertical-col-time-col");
    expect(timeLabels).toBeInTheDocument();

    // Should have specific hour slots
    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-12")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  it("renders day columns for the week", () => {
    cleanup();
    renderWeekView();
    // Get current week's dates
    const startOfWeek = startOf(defaultInitialDate, "week");

    // Should have 7 day columns for the week
    for (let i = 0; i < 7; i += 1) {
      const dayDate = startOfWeek.add({ days: i });
      const dayColTestId = `vertical-col-day-col-${format(dayDate, "YYYY-MM-DD")}`;
      expect(screen.getByTestId(dayColTestId)).toBeInTheDocument();
    }
  });

  it("renders time cells for each day", () => {
    const startOfWeek = startOf(defaultInitialDate, "week");
    const firstDay = format(startOfWeek, "YYYY-MM-DD");
    const testIdPrefix = `vertical-cell-${firstDay}`;

    // Check for some time cells on the first day
    expect(screen.getByTestId(`${testIdPrefix}-00-00`)).toBeInTheDocument();
    expect(screen.getByTestId(`${testIdPrefix}-12-00`)).toBeInTheDocument();
    expect(screen.getByTestId(`${testIdPrefix}-23-00`)).toBeInTheDocument();
  });

  it("renders only hour slots by default (no sub-hour subdivisions)", () => {
    const startOfWeek = startOf(defaultInitialDate, "week");
    const firstDay = format(startOfWeek, "YYYY-MM-DD");

    expect(
      screen.getByTestId(`vertical-cell-${firstDay}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${firstDay}-09-15`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${firstDay}-09-30`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${firstDay}-09-45`)
    ).not.toBeInTheDocument();
  });

  it("renders quarter-hour slots when slotDuration is 15", () => {
    cleanup();
    renderWeekView({ slotDuration: 15 });

    const startOfWeek = startOf(defaultInitialDate, "week");
    const firstDay = format(startOfWeek, "YYYY-MM-DD");

    expect(
      screen.getByTestId(`vertical-cell-${firstDay}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${firstDay}-09-15`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${firstDay}-09-30`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${firstDay}-09-45`)
    ).toBeInTheDocument();
  });

  it("renders event layers for each day", () => {
    const startOfWeek = startOf(defaultInitialDate, "week");

    for (let i = 0; i < 7; i += 1) {
      const dayDate = startOfWeek.add({ days: i });
      const eventsTestId = `vertical-events-day-col-${format(dayDate, "YYYY-MM-DD")}`;
      expect(screen.getByTestId(eventsTestId)).toBeInTheDocument();
    }
  });

  it("initializes with specified initial date - different week", () => {
    cleanup();
    const specificDate = toZonedDateTime("2025-06-15T10:00:00.000Z");
    renderWeekView({ initialDate: specificDate });

    // Should have currentDate set to June 2025 (month 5, 0-indexed)
    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2025");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("5");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("15");

    // Should have the specific date for June 15, 2025
    const june15Events = screen.getByTestId(
      "vertical-events-day-col-2025-06-15"
    );

    expect(june15Events).toBeInTheDocument();
  });

  it("initializes with specified initial date - past date", () => {
    cleanup();
    const specificDate = toZonedDateTime("2020-01-15T10:00:00.000Z");
    renderWeekView({ initialDate: specificDate });

    // Should have currentDate set to January 2020 (month 0)
    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2020");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("0");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("15");

    // Should have the specific date for January 15, 2020
    const jan15Events = screen.getByTestId(
      "vertical-events-day-col-2020-01-15"
    );

    expect(jan15Events).toBeInTheDocument();
  });

  it("initializes with specified initial date - future date", () => {
    cleanup();
    const specificDate = toZonedDateTime("2030-12-25T10:00:00.000Z");
    renderWeekView({ initialDate: specificDate });

    // Should have currentDate set to December 2030 (month 11)
    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2030");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("11");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("25");

    // Should have the specific date for December 25, 2030
    const dec25Events = screen.getByTestId(
      "vertical-events-day-col-2030-12-25"
    );

    expect(dec25Events).toBeInTheDocument();
  });

  it("defaults to current week when no initial date provided", () => {
    cleanup();
    const today = defaultInitialDate;
    renderWeekView();

    // Should have currentDate set to today
    expect(screen.getByTestId("current-date-year")).toHaveTextContent(
      today.year.toString()
    );
    expect(screen.getByTestId("current-date-month")).toHaveTextContent(
      monthIndex(today).toString()
    );
    expect(screen.getByTestId("current-date-date")).toHaveTextContent(
      today.day.toString()
    );

    // Should have events container for today
    const todayEvents = screen.getByTestId(
      `vertical-events-day-col-${format(today, "YYYY-MM-DD")}`
    );

    expect(todayEvents).toBeInTheDocument();
  });

  it("all-day event ending on Sunday should not appear on Monday when firstDayOfWeek is Monday", () => {
    cleanup();

    // Create all-day event from Nov 17 to Nov 23 (Sunday)
    const allDayEvent: CalendarEvent = {
      allDay: true,
      color: "blue",
      // Sunday Nov 23
      end: toZonedDateTime("2025-11-23T23:59:59.999Z"),
      id: "all-day-event-nov-17-23",
      // Monday Nov 17
      start: toZonedDateTime("2025-11-17T00:00:00.000Z"),
      title: "Week-long Event",
    };

    // Set current date to Nov 24 (Monday) to view the week containing Nov 23
    const currentDate = toZonedDateTime("2025-11-24T00:00:00.000Z");

    renderWeekView({
      events: [allDayEvent],
      // Monday as first day
      firstDayOfWeek: 1,
      initialDate: currentDate,
    });

    // The week starting Nov 24 (Monday) should be: Nov 24-30
    // The event ends on Nov 23 (Sunday), which is in the PREVIOUS week (Nov 17-23)
    // Therefore, the event should NOT appear in this week view

    // Check that the all-day row exists
    const allDayRows = screen.getAllByTestId("vertical-grid-all-day");
    expect(allDayRows.length).toBeGreaterThan(0);

    // The event should not be rendered because it ends before this week starts
    const eventElement = screen.queryByText("Week-long Event");
    expect(eventElement).not.toBeInTheDocument();
  });

  it("all-day event spanning the exact week should render correctly when firstDayOfWeek is Monday", () => {
    cleanup();

    // Create all-day event from Monday to Sunday of the same week
    const allDayEvent: CalendarEvent = {
      allDay: true,
      color: "green",
      // Sunday Nov 23
      end: toZonedDateTime("2025-11-23T23:59:59.999Z"),
      id: "all-day-event-full-week",
      // Monday Nov 17
      start: toZonedDateTime("2025-11-17T00:00:00.000Z"),
      title: "Full Week Event",
    };

    // Set current date to Nov 20 (Thursday) to view the week containing this event
    const currentDate = toZonedDateTime("2025-11-20T00:00:00.000Z");

    renderWeekView({
      events: [allDayEvent],
      // Monday as first day
      firstDayOfWeek: 1,
      initialDate: currentDate,
    });

    // The week should be Nov 17-23 (Monday to Sunday)
    // The event should span the entire week
    const eventElement = screen.getByText("Full Week Event");
    expect(eventElement).toBeInTheDocument();
  });

  it("styles a slot inside business hours as bookable", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // Monday 10am should be business hour (hover:bg-accent)
    const businessCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-10-00`
    );

    expect(businessCell.className).toContain("hover:bg-accent");
    expect(businessCell.className).not.toContain("bg-muted/30");
    expect(businessCell.className).toContain("cursor-pointer");
  });

  it("styles a slot before startTime as non-business", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // Monday 8am should be non-business hour (disabled color-mix fill)
    const nonBusinessCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-08-00`
    );

    expect(nonBusinessCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(nonBusinessCell.className).toContain("text-muted-foreground");
    expect(nonBusinessCell.className).not.toContain("hover:bg-muted/50");
    expect(nonBusinessCell.className).toContain("cursor-default");
  });

  it("styles a non-business weekday as non-business", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // Sunday should be non-business day
    const sunday = monday.subtract({ days: 1 });

    const sundayCell = screen.getByTestId(
      `vertical-cell-${format(sunday, "YYYY-MM-DD")}-10-00`
    );

    expect(sundayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(sundayCell.className).toContain("text-muted-foreground");
    expect(sundayCell.className).toContain("cursor-default");
  });

  it("styles the startTime boundary slot as bookable", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const testIdPrefix = `vertical-cell-${format(monday, "YYYY-MM-DD")}`;

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // Exactly at 9am (startTime) - Should be business hour
    const startBoundaryCell = screen.getByTestId(`${testIdPrefix}-09-00`);
    expect(startBoundaryCell.className).toContain("hover:bg-accent");
    expect(startBoundaryCell.className).not.toContain("color-mix");
    expect(startBoundaryCell.className).toContain("cursor-pointer");
  });

  it("styles the endTime boundary slot as non-business", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const testIdPrefix = `vertical-cell-${format(monday, "YYYY-MM-DD")}`;

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // Exactly at 5pm (endTime) - Should be non-business hour (endTime is exclusive)
    const endBoundaryCell = screen.getByTestId(`${testIdPrefix}-17-00`);
    expect(endBoundaryCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(endBoundaryCell.className).toContain("text-muted-foreground");
    expect(endBoundaryCell.className).toContain("cursor-default");
  });

  it("styles the slot one hour before endTime as bookable", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const testIdPrefix = `vertical-cell-${format(monday, "YYYY-MM-DD")}`;

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // 4pm (one hour before endTime) - Should be business hour
    const beforeEndCell = screen.getByTestId(`${testIdPrefix}-16-00`);
    expect(beforeEndCell.className).toContain("hover:bg-accent");
    expect(beforeEndCell.className).not.toContain("color-mix");
    expect(beforeEndCell.className).toContain("cursor-pointer");
  });

  it("styles the slot one hour before startTime as non-business", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const testIdPrefix = `vertical-cell-${format(monday, "YYYY-MM-DD")}`;

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
    });

    // 8am (one hour before startTime) - Should be non-business hour
    const beforeStartCell = screen.getByTestId(`${testIdPrefix}-08-00`);
    expect(beforeStartCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(beforeStartCell.className).toContain("text-muted-foreground");
    expect(beforeStartCell.className).toContain("cursor-default");
  });

  it("marks weekdays as business hours with firstDayOfWeek=Monday", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      // Monday
      firstDayOfWeek: 1,
      initialDate: monday,
    });

    // Monday 10am - Business hour
    const mondayCell = screen.getByTestId(
      `${testIdPrefix}-${format(monday, "YYYY-MM-DD")}-10-00`
    );

    expect(mondayCell.className).toContain("hover:bg-accent");
    expect(mondayCell.className).not.toContain("color-mix");

    // Friday 10am - Business hour
    const friday = monday.add({ days: 4 });

    const fridayCell = screen.getByTestId(
      `${testIdPrefix}-${format(friday, "YYYY-MM-DD")}-10-00`
    );

    expect(fridayCell.className).toContain("hover:bg-accent");
    expect(fridayCell.className).not.toContain("color-mix");
  });

  it("marks weekend days as non-business with firstDayOfWeek=Monday", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      // Monday
      firstDayOfWeek: 1,
      initialDate: monday,
    });

    // Saturday 10am - Non-business day
    const saturday = monday.add({ days: 5 });

    const saturdayCell = screen.getByTestId(
      `${testIdPrefix}-${format(saturday, "YYYY-MM-DD")}-10-00`
    );

    expect(saturdayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(saturdayCell.className).toContain("text-muted-foreground");

    // Sunday 10am - Non-business day
    const sunday = monday.add({ days: 6 });

    const sundayCell = screen.getByTestId(
      `${testIdPrefix}-${format(sunday, "YYYY-MM-DD")}-10-00`
    );

    expect(sundayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(sundayCell.className).toContain("text-muted-foreground");
  });

  it("marks Monday as a business day with firstDayOfWeek=Sunday", () => {
    cleanup();
    // Sunday
    const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      // Sunday
      firstDayOfWeek: 0,
      initialDate: sunday,
    });

    // Monday 10am - Business hour
    const monday = sunday.add({ days: 1 });

    const mondayCell = screen.getByTestId(
      `${testIdPrefix}-${format(monday, "YYYY-MM-DD")}-10-00`
    );

    expect(mondayCell.className).toContain("hover:bg-accent");
    expect(mondayCell.className).not.toContain("color-mix");
  });

  it("marks the weekend as non-business with firstDayOfWeek=Sunday", () => {
    cleanup();
    // Sunday
    const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      // Sunday
      firstDayOfWeek: 0,
      initialDate: sunday,
    });

    // Sunday 10am - Non-business day (even though it's first day of week)
    const sundayCell = screen.getByTestId(
      `${testIdPrefix}-${format(sunday, "YYYY-MM-DD")}-10-00`
    );

    expect(sundayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(sundayCell.className).toContain("text-muted-foreground");

    // Saturday 10am - Non-business day
    const saturday = sunday.add({ days: 6 });

    const saturdayCell = screen.getByTestId(
      `${testIdPrefix}-${format(saturday, "YYYY-MM-DD")}-10-00`
    );

    expect(saturdayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(saturdayCell.className).toContain("text-muted-foreground");
  });

  it("styles a slot inside custom business hours as bookable", () => {
    cleanup();
    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    renderWeekView({
      businessHours,
      initialDate: tuesday,
    });

    // Tuesday 11am - Business hour
    const tuesdayTestId = `${testIdPrefix}-${format(tuesday, "YYYY-MM-DD")}`;
    const tuesdayBusinessCell = screen.getByTestId(`${tuesdayTestId}-11-00`);
    expect(tuesdayBusinessCell.className).toContain("hover:bg-accent");
    expect(tuesdayBusinessCell.className).not.toContain("color-mix");
  });

  it("styles a slot before the custom startTime as non-business", () => {
    cleanup();
    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    renderWeekView({
      businessHours,
      initialDate: tuesday,
    });

    // Tuesday 9am - Non-business hour (before start)
    const tuesdayTestId = `${testIdPrefix}-${format(tuesday, "YYYY-MM-DD")}`;
    const tuesdayEarlyCell = screen.getByTestId(`${tuesdayTestId}-09-00`);
    expect(tuesdayEarlyCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(tuesdayEarlyCell.className).toContain("text-muted-foreground");
  });

  it("styles a slot after the custom endTime as non-business", () => {
    cleanup();
    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    renderWeekView({
      businessHours,
      initialDate: tuesday,
    });

    // Tuesday 4pm - Non-business hour (after end)
    const tuesdayTestId = `${testIdPrefix}-${format(tuesday, "YYYY-MM-DD")}`;
    const tuesdayLateCell = screen.getByTestId(`${tuesdayTestId}-16-00`);
    expect(tuesdayLateCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(tuesdayLateCell.className).toContain("text-muted-foreground");
  });

  it("styles weekdays outside the custom daysOfWeek as non-business", () => {
    cleanup();
    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    renderWeekView({
      businessHours,
      initialDate: tuesday,
    });

    // Monday 11am - Non-business day
    const monday = tuesday.subtract({ days: 1 });

    const mondayCell = screen.getByTestId(
      `${testIdPrefix}-${format(monday, "YYYY-MM-DD")}-11-00`
    );

    expect(mondayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(mondayCell.className).toContain("text-muted-foreground");

    // Friday 11am - Non-business day
    const friday = tuesday.add({ days: 3 });

    const fridayCell = screen.getByTestId(
      `${testIdPrefix}-${format(friday, "YYYY-MM-DD")}-11-00`
    );

    expect(fridayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(fridayCell.className).toContain("text-muted-foreground");
  });

  it("marks the single configured day as business", () => {
    cleanup();
    // Wednesday
    const wednesday = toZonedDateTime("2025-01-08T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: wednesday,
    });

    // Wednesday 10am - Business hour
    const wednesdayTestId = `${testIdPrefix}-${format(wednesday, "YYYY-MM-DD")}`;
    const wednesdayCell = screen.getByTestId(`${wednesdayTestId}-10-00`);
    expect(wednesdayCell.className).toContain("hover:bg-accent");
    expect(wednesdayCell.className).not.toContain("color-mix");
  });

  it("marks the days around the single configured day as non-business", () => {
    cleanup();
    // Wednesday
    const wednesday = toZonedDateTime("2025-01-08T00:00:00.000Z");
    const testIdPrefix = "vertical-cell";

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: wednesday,
    });

    // Tuesday 10am - Non-business day
    const tuesday = wednesday.subtract({ days: 1 });
    const tuesdayTestId = `${testIdPrefix}-${format(tuesday, "YYYY-MM-DD")}`;
    const tuesdayCell = screen.getByTestId(`${tuesdayTestId}-10-00`);
    expect(tuesdayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(tuesdayCell.className).toContain("text-muted-foreground");

    // Thursday 10am - Non-business day
    const thursday = wednesday.add({ days: 1 });
    const thursdayTestId = `${testIdPrefix}-${format(thursday, "YYYY-MM-DD")}`;
    const thursdayCell = screen.getByTestId(`${thursdayTestId}-10-00`);
    expect(thursdayCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(thursdayCell.className).toContain("text-muted-foreground");
  });

  it("styles a weekday slot as bookable when no businessHours prop is given", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    renderWeekView({
      initialDate: monday,
      // No businessHours prop
    });

    // Monday 10am - Should be clickable (no business hours restriction)
    const mondayCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-10-00`
    );

    expect(mondayCell.className).toContain("hover:bg-accent");
    expect(mondayCell.className).not.toContain("color-mix");
    expect(mondayCell.className).toContain("cursor-pointer");
  });

  it("styles a weekend slot as bookable when no businessHours prop is given", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    renderWeekView({
      initialDate: monday,
      // No businessHours prop
    });

    // Sunday 10am - Should be clickable (no business hours restriction)
    const sunday = monday.subtract({ days: 1 });

    const sundayCell = screen.getByTestId(
      `vertical-cell-${format(sunday, "YYYY-MM-DD")}-10-00`
    );

    expect(sundayCell.className).toContain("hover:bg-accent");
    expect(sundayCell.className).not.toContain("color-mix");
    expect(sundayCell.className).toContain("cursor-pointer");
  });

  it("displays time labels in 24-hour format when timeFormat is 24-hour", () => {
    cleanup();
    renderWeekView({ timeFormat: "24-hour" });

    // Check that times are displayed in 24-hour format
    const midnightHour = screen.getByTestId("vertical-time-00");
    const midnightText = midnightHour.textContent || "";
    // In 24-hour format, should not contain AM/PM
    expect(midnightText).not.toMatch(AMPM);

    // 12:00 should show as "12" in 24-hour format (noon)
    const noonHour = screen.getByTestId("vertical-time-12");
    const noonText = noonHour.textContent || "";
    expect(noonText).not.toMatch(AMPM);

    // 13:00 should show as "13" in 24-hour format
    const afternoonHour = screen.getByTestId("vertical-time-13");
    const afternoonText = afternoonHour.textContent || "";
    expect(afternoonText).not.toMatch(AMPM);

    // 23:00 should show as "23" in 24-hour format
    const lateHour = screen.getByTestId("vertical-time-23");
    const lateText = lateHour.textContent || "";
    expect(lateText).not.toMatch(AMPM);
  });

  it("displays time labels in 12-hour format when timeFormat is 12-hour", () => {
    cleanup();
    renderWeekView({ timeFormat: "12-hour" });

    // Check that times are displayed in 12-hour format
    const midnightHour = screen.getByTestId("vertical-time-00");
    const midnightText = midnightHour.textContent || "";
    // In 12-hour format, should contain AM or PM
    expect(midnightText).toMatch(AMPM);

    // 12:00 should show as "12 PM" in 12-hour format (noon)
    const noonHour = screen.getByTestId("vertical-time-12");
    const noonText = noonHour.textContent || "";
    expect(noonText).toMatch(AMPM);

    // 13:00 should show as "1 PM" in 12-hour format
    const afternoonHour = screen.getByTestId("vertical-time-13");
    const afternoonText = afternoonHour.textContent || "";
    expect(afternoonText).toMatch(AMPM);

    // 23:00 should show as "11 PM" in 12-hour format
    const lateHour = screen.getByTestId("vertical-time-23");
    const lateText = lateHour.textContent || "";
    expect(lateText).toMatch(AMPM);
  });

  it("defaults to 12-hour format when timeFormat is not provided", () => {
    cleanup();
    renderWeekView();

    // Should default to 12-hour format (timeFormat defaults to '12-hour')
    const midnightHour = screen.getByTestId("vertical-time-00");
    const midnightText = midnightHour.textContent || "";
    expect(midnightText).toMatch(AMPM);

    const noonHour = screen.getByTestId("vertical-time-12");
    const noonText = noonHour.textContent || "";
    expect(noonText).toMatch(AMPM);
  });

  it("keeps the business hours union range visible in WeekView", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = [
      { daysOfWeek: ["monday"], endTime: 12, startTime: 8 },
      { daysOfWeek: ["tuesday"], endTime: 18, startTime: 14 },
    ];

    renderWeekView({
      businessHours,
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // The visible range should be [8, 18)
    // 8:00 should be the first hour
    expect(screen.getByTestId("vertical-time-08")).toBeInTheDocument();
    // 17:00 should be the last hour
    expect(screen.getByTestId("vertical-time-17")).toBeInTheDocument();

    // Hours between 12 and 14 should still be present because they are within the [min, max] range
    expect(screen.getByTestId("vertical-time-12")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-13")).toBeInTheDocument();
  });

  it("hides hours outside the business hours union range in WeekView", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = [
      { daysOfWeek: ["monday"], endTime: 12, startTime: 8 },
      { daysOfWeek: ["tuesday"], endTime: 18, startTime: 14 },
    ];

    renderWeekView({
      businessHours,
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Hours outside the union should not be present
    expect(screen.queryByTestId("vertical-time-07")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-18")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-23")).not.toBeInTheDocument();
  });

  it("does not crash when hideNonBusinessHours produces an empty hour range", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    renderWeekView({
      businessHours: {
        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        endTime: 0,
        startTime: 0,
      },
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    expect(screen.getByTestId("vertical-grid-all-day")).toBeInTheDocument();
    expect(screen.queryByTestId("vertical-grid-body")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-00")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-12")).not.toBeInTheDocument();
  });

  // Backwards compatibility tests
  it("keeps non-business hours in the grid when hideNonBusinessHours is false", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      // Explicitly false
      hideNonBusinessHours: false,
      initialDate: monday,
    });

    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-08")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-17")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  it("keeps business hours in the grid when hideNonBusinessHours is false", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      // Explicitly false
      hideNonBusinessHours: false,
      initialDate: monday,
    });

    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-16")).toBeInTheDocument();
  });

  it("keeps non-business hours in the grid when hideNonBusinessHours is not provided", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
      // hideNonBusinessHours is NOT provided - should default to false
    });

    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-08")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-17")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  it("keeps business hours in the grid when hideNonBusinessHours is not provided", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      initialDate: monday,
      // hideNonBusinessHours is NOT provided - should default to false
    });

    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-16")).toBeInTheDocument();
  });

  it("scroll area uses flex column container for scroll containment", () => {
    cleanup();
    renderWeekView();

    const container = screen.getByTestId("vertical-grid-container");
    expect(container.className).toContain("flex");
    expect(container.className).toContain("flex-col");

    const scrollArea = screen.getByTestId("vertical-grid-scroll");
    expect(scrollArea).toBeInTheDocument();
  });

  it("Ensure first column has the same width as the time gutter", () => {
    cleanup();
    renderWeekView();
    const WeekViewHeader = screen.getByTestId("week-view-header");
    const timeGutter = screen.getByTestId("vertical-col-time-col");
    const allDayRow = screen.getByTestId("all-day-row");
    const firstCellOfAllDayRow = allDayRow.querySelector("div");
    const firstCellOfWeekViewHeader = WeekViewHeader.querySelector("div");
    // the time gutter should have the same width as the day columns and the first cell of the all-day row
    const classNamesToCheck = GUTTER_WIDTH.split(" ");

    for (const className of classNamesToCheck) {
      expect(timeGutter.className).toContain(className);
    }

    for (const className of classNamesToCheck) {
      expect(firstCellOfAllDayRow?.className).toContain(className);
    }

    for (const className of classNamesToCheck) {
      expect(firstCellOfWeekViewHeader?.className).toContain(className);
    }
  });

  it("draws the time gutter separator with box-shadow, not border-r", () => {
    const timeGutter = screen.getByTestId("vertical-col-time-col");
    // The sticky gutter draws its right separator with the box-shadow, not border-r.
    expect(timeGutter.className).toContain(STICKY_GUTTER_SHADOW);
    expect(timeGutter.className).not.toContain("border-r");

    // Its inner cells no longer carry a per-cell border under the gap model.
    const firstCellOfGutter = screen.getByTestId("vertical-time-00");
    expect(firstCellOfGutter.className).not.toContain("border-r");
  });

  it("mirrors the gutter separator on the all-day spacer", () => {
    const allDayRow = screen.getByTestId("all-day-row");
    const firstCellOfAllDayRow = allDayRow.querySelector("div");

    // The all-day spacer mirrors the gutter with the same box-shadow separator.
    expect(firstCellOfAllDayRow?.className).toContain(STICKY_GUTTER_SHADOW);
    expect(firstCellOfAllDayRow?.className).not.toContain("border-r");
  });

  it("mirrors the gutter separator on the week header corner cell", () => {
    const WeekViewHeader = screen.getByTestId("week-view-header");
    const firstCellOfWeekViewHeader = WeekViewHeader.querySelector("div");

    // The week view header corner cell uses the same box-shadow separator.
    expect(firstCellOfWeekViewHeader?.className).toContain(
      STICKY_GUTTER_SHADOW
    );
    expect(firstCellOfWeekViewHeader?.className).not.toContain("border-r");
  });

  // Under the gap-px model columns draw no per-cell right border at all; the
  // inter-column separators come from the gap between columns, so the last
  // column needs no special-casing.
  it("Ensure day columns carry no per-cell right border", () => {
    const startOfWeek = startOf(defaultInitialDate, "week");
    const lastDay = format(startOfWeek.add({ days: 6 }), "YYYY-MM-DD");

    // on the header
    const CellOfWeekViewHeader = screen
      .getByTestId("week-view-header")
      .querySelector("div + div");

    expect(CellOfWeekViewHeader?.className).not.toContain("border-r");

    // on the all-day row
    const lastCellOfAllDayRow = screen.getByTestId(`day-cell-${lastDay}`);
    expect(lastCellOfAllDayRow?.className).not.toContain("border-r");

    // on the body
    const lastDayColumn = screen.getByTestId(`vertical-col-day-col-${lastDay}`);
    expect(lastDayColumn?.className).not.toContain("border-r");
  });

  it("Ensure column have the same width", () => {
    const startOfWeek = startOf(defaultInitialDate, "week");
    const firstDay = format(startOfWeek, "YYYY-MM-DD");
    const lastCellOfAllDayRow = screen.getByTestId(`day-cell-${firstDay}`);
    const classNamesToControlWidth = ["flex-1", "min-w-0"];

    const firstDayColumn = screen.getByTestId(
      `vertical-col-day-col-${firstDay}`
    );

    // on the header
    const firstDayHeader = screen.getByTestId("week-header-weekday-sunday");

    for (const className of classNamesToControlWidth) {
      expect(firstDayHeader.className).toContain(className);
    }

    // on the all-day row
    for (const className of classNamesToControlWidth) {
      expect(lastCellOfAllDayRow.className).toContain(className);
    }

    // on the body
    for (const className of classNamesToControlWidth) {
      expect(firstDayColumn.className).toContain(className);
    }
  });

  it("still applies business hours styling when hideNonBusinessHours is false", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderWeekView({
      businessHours,
      hideNonBusinessHours: false,
      initialDate: monday,
    });

    // Business hour cell should have business styling
    const businessCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-10-00`
    );

    expect(businessCell.className).toContain("hover:bg-accent");
    expect(businessCell.className).toContain("cursor-pointer");

    // Non-business hour cell should have non-business styling
    const nonBusinessCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-08-00`
    );

    expect(nonBusinessCell.className).toContain(DISABLED_CELL_CLASSNAME);
    expect(nonBusinessCell.className).toContain("cursor-default");
  });

  // Event positioning tests - CRITICAL for hideNonBusinessHours
  it("positions event at 0% top when event starts at business hour start with hideNonBusinessHours true", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am (business start)
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      id: "test-event-9am-week",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Week Morning Meeting",
    };

    renderWeekView({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Week Morning Meeting");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am should be at top: 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 0%");
  });

  it("positions event correctly when hideNonBusinessHours is false in WeekView", () => {
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
      id: "test-event-9am-week-full",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Week Morning Full",
    };

    renderWeekView({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: false,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Week Morning Full");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am in a 24-hour grid should NOT be at top 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).not.toContain("top: 0%");
  });

  it("hiddenDays hides specified day columns (hide saturday/sunday shows 5 columns)", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    // Sunday=0, Saturday=6
    const hiddenDays = new Set([0, 6]);

    renderWeekView({
      hiddenDays,
      firstDayOfWeek: 0,
      initialDate: monday,
    });

    // Should have 5 day columns (Mon-Fri), not 7
    const startOfWeek = startOf(monday, "week");

    const weekDates = Array.from({ length: 7 }, (_, index) =>
      startOfWeek.add({ days: index })
    );

    // Sunday and Saturday should NOT be rendered
    for (const hiddenDate of weekDates.filter((date) =>
      hiddenDays.has(weekday(date))
    )) {
      expect(
        screen.queryByTestId(
          `vertical-col-day-col-${format(hiddenDate, "YYYY-MM-DD")}`
        )
      ).not.toBeInTheDocument();
    }

    // Monday-Friday should be rendered
    for (const visibleDate of weekDates.filter(
      (date) => !hiddenDays.has(weekday(date))
    )) {
      expect(
        screen.getByTestId(
          `vertical-col-day-col-${format(visibleDate, "YYYY-MM-DD")}`
        )
      ).toBeInTheDocument();
    }
  });

  it("hiddenDays filters day header cells", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    // Hide Sunday and Saturday
    const hiddenDays = new Set([0, 6]);

    renderWeekView({
      hiddenDays,
      firstDayOfWeek: 0,
      initialDate: monday,
    });

    // Saturday and Sunday headers should not be present
    expect(
      screen.queryByTestId("week-header-weekday-saturday")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("week-header-weekday-sunday")
    ).not.toBeInTheDocument();

    // Monday-Friday headers should be present
    expect(
      screen.getByTestId("week-header-weekday-monday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-friday")
    ).toBeInTheDocument();
  });

  it("empty hiddenDays shows all 7 days (default behavior)", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    renderWeekView({
      initialDate: monday,
      // No hiddenDays prop
    });

    // All 7 weekday headers should be present
    for (const day of weekDays) {
      expect(
        screen.getByTestId(`week-header-weekday-${day.toLowerCase()}`)
      ).toBeInTheDocument();
    }

    // All 7 day columns should be present
    const startOfWeek = startOf(monday, "week");

    for (let i = 0; i < 7; i += 1) {
      const dayDate = startOfWeek.add({ days: i });
      const dayColTestId = `vertical-col-day-col-${format(dayDate, "YYYY-MM-DD")}`;
      expect(screen.getByTestId(dayColTestId)).toBeInTheDocument();
    }
  });

  it("updates day columns when hiddenDays changes after initial render", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const ui = (hiddenDays?: Set<number>) => (
      <CalendarProvider
        dayMaxEvents={dayMaxEvents}
        events={[]}
        firstDayOfWeek={0}
        hiddenDays={hiddenDays}
        initialDate={monday}
        locale="en"
      >
        <WeekView />
      </CalendarProvider>
    );

    const { rerender } = render(ui());

    const sunday = format(startOf(monday, "week"), "YYYY-MM-DD");

    const saturday = format(
      startOf(monday, "week").add({ days: 6 }),
      "YYYY-MM-DD"
    );

    expect(
      screen.getByTestId(`vertical-col-day-col-${sunday}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-col-day-col-${saturday}`)
    ).toBeInTheDocument();

    rerender(ui(new Set([0, 6])));

    expect(
      screen.queryByTestId(`vertical-col-day-col-${sunday}`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-col-day-col-${saturday}`)
    ).not.toBeInTheDocument();
  });

  it("keeps responsive all-day spacer/cell classes when hiddenDays leaves one visible day", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    // only Monday visible
    const hiddenDays = new Set([0, 2, 3, 4, 5, 6]);

    renderWeekView({
      hiddenDays,
      firstDayOfWeek: 0,
      initialDate: monday,
    });

    // The all-day spacer must mirror the responsive time gutter even with a
    // single visible day, or the all-day row drifts out of column alignment.
    const allDayRow = screen.getByTestId("all-day-row");
    const spacer = allDayRow.querySelector("div");
    const spacerClasses = GUTTER_WIDTH.split(" ");

    for (const className of spacerClasses) {
      expect(spacer?.className).toContain(className);
    }

    // The lone all-day cell keeps the week view's width-control classes.
    const mondayCell = screen.getByTestId(
      `day-cell-${format(monday, "YYYY-MM-DD")}`
    );

    const cellClasses = ["flex-1", "min-w-0"];

    for (const className of cellClasses) {
      expect(mondayCell.className).toContain(className);
    }
  });

  it("hides a single hidden day from the week header", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    // Hide Wednesday
    const hiddenDays = new Set([3]);

    renderWeekView({
      hiddenDays,
      firstDayOfWeek: 0,
      initialDate: monday,
    });

    // Wednesday header should not be present
    expect(
      screen.queryByTestId("week-header-weekday-wednesday")
    ).not.toBeInTheDocument();
  });

  it("keeps the other weekdays in the header when a single day is hidden", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    // Hide Wednesday
    const hiddenDays = new Set([3]);

    renderWeekView({
      hiddenDays,
      firstDayOfWeek: 0,
      initialDate: monday,
    });

    expect(
      screen.getByTestId("week-header-weekday-monday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-tuesday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-thursday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-friday")
    ).toBeInTheDocument();
  });

  it("keeps the weekend days in the header when a single day is hidden", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    // Hide Wednesday
    const hiddenDays = new Set([3]);

    renderWeekView({
      hiddenDays,
      firstDayOfWeek: 0,
      initialDate: monday,
    });

    expect(
      screen.getByTestId("week-header-weekday-saturday")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("week-header-weekday-sunday")
    ).toBeInTheDocument();
  });

  it("positions event at correct percentage when event is in middle of business hours in WeekView", () => {
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
      id: "test-event-1pm-week",
      start: toZonedDateTime("2025-01-06T13:00:00.000Z"),
      title: "Week Afternoon Meeting",
    };

    renderWeekView({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Week Afternoon Meeting");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 50%");
  });

  it("renders the midnight row through renderHour", () => {
    cleanup();

    renderWeekView({ renderHour });

    const customMidnights = screen.getAllByTestId("custom-hour-00");
    // In WeekView, it's only in the time column
    expect(customMidnights).toHaveLength(1);
    expect(customMidnights[0]).toHaveTextContent("00:00");
  });

  it("renders the noon row through renderHour", () => {
    cleanup();

    renderWeekView({ renderHour });

    const customNoons = screen.getAllByTestId("custom-hour-12");
    expect(customNoons).toHaveLength(1);
    expect(customNoons[0]).toHaveTextContent("12:00");
  });

  it("renders the last row through renderHour", () => {
    cleanup();

    renderWeekView({ renderHour });

    const customLastHours = screen.getAllByTestId("custom-hour-23");
    expect(customLastHours).toHaveLength(1);
    expect(customLastHours[0]).toHaveTextContent("23:00");
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
      cleanup();
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderWeekView({ scrollTime: "09:00:00" });

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
    });

    it("does not scroll when scrollTime is not provided", () => {
      cleanup();
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderWeekView();

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
