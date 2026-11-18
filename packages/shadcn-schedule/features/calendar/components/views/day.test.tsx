import { cleanup, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { textOr } from "@/lib/guards";
import { generateMockEvents } from "@/testing/generator";
import { DayView } from "@/testing/view-harnesses";
import type { CalendarEvent } from "@/types/index";
import {
  format,
  monthIndex,
  now,
  resetNow,
  setNow,
  toZonedDateTime,
} from "@/utils/temporal";

const renderHour = (date: Temporal.ZonedDateTime) => (
  <span data-testid={`custom-hour-${format(date, "HH")}`}>
    {format(date, "HH:mm")}
  </span>
);

const AMPM = /AM|PM/iu;

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents();

// Default to Sunday
const firstDayOfWeek = 0;

// Default max events per day
const dayMaxEvents = 3;

// Default locale
let locale = "en";

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

const renderDayView = (props = {}) => {
  const testId = "current-date";

  return render(
    <CalendarProvider
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      firstDayOfWeek={firstDayOfWeek}
      locale={locale}
      {...props}
    >
      <TestWrapper testId={testId}>
        <DayView />
      </TestWrapper>
    </CalendarProvider>
  );
};

describe(DayView, () => {
  beforeEach(() => {
    // Reset the dayjs locale to default before each test
    locale = "en";
    // Pin the clock so today/current-time assertions are deterministic.
    setNow(toZonedDateTime("2025-01-01T10:30:00.000Z"));
    cleanup();
  });

  afterEach(() => {
    resetNow();
  });

  it("renders day view structure with proper layout", () => {
    renderDayView();

    // Should have the main container structure
    const container = screen.getByTestId("vertical-grid-scroll");
    expect(container).toBeInTheDocument();

    // Should have day header structure
    const headerContainer = screen.getByTestId("vertical-grid-header");
    expect(headerContainer).toBeInTheDocument();

    // Should have all-day row structure
    const allDayContainers = screen.getAllByTestId("vertical-grid-all-day");
    expect(allDayContainers.length).toBeGreaterThan(0);

    // Should have scroll area structure
    const scrollArea = screen.getByTestId("vertical-grid-scroll");
    expect(scrollArea).toBeInTheDocument();

    // Should have time grid structure
    const timeGrid = screen.getByTestId("vertical-grid-body");
    expect(timeGrid).toBeInTheDocument();
  });

  it("renders time column with 24 hour slots", () => {
    renderDayView();

    const timeCol = screen.getByTestId("vertical-col-time-col");
    expect(timeCol).toBeInTheDocument();

    // Check for some specific hour slots
    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-12")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  it("renders events column structure", () => {
    renderDayView();
    const today = format(now(), "YYYY-MM-DD");

    const eventsColumn = screen.getByTestId(`vertical-col-day-col-${today}`);
    expect(eventsColumn).toBeInTheDocument();

    // Background grid and interactive layer are now merged into the main flow
    // so we check for the time cells directly
    expect(
      screen.getByTestId(`vertical-cell-${today}-00-00`)
    ).toBeInTheDocument();
  });

  it("displays current date correctly in header", () => {
    const today = toZonedDateTime("2025-06-15T12:00:00.000Z");
    renderDayView({ initialDate: today });

    const header = screen.getByTestId("day-view-header");
    expect(header).toHaveTextContent(format(today, "LL"));

    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2025");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("5");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("15");
  });

  it("shows today indicator for current day", () => {
    // Set the current date to today to ensure today indicator appears
    const today = now();
    renderDayView({ initialDate: today });

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

    // Today indicator should be present if viewing today
    const timeIndicators = screen.queryAllByTestId("current-time-indicator");

    // Should show today indicator when viewing current day
    expect(timeIndicators.length).toBeGreaterThan(0);
  });

  it("renders all-day events section", () => {
    renderDayView();

    const allDayRows = screen.getAllByTestId("vertical-grid-all-day");
    expect(allDayRows.length).toBeGreaterThan(0);

    // Should have "All-day" label
    expect(screen.getByText("All day")).toBeInTheDocument();
  });

  it("handles different locale settings", () => {
    renderDayView({ locale: "en" });

    // Should render with English locale
    const header = screen.getByTestId("vertical-grid-header");
    expect(header).toBeInTheDocument();
  });

  it("renders time grid with proper height calculation", () => {
    renderDayView();

    const timeGrids = screen.getAllByTestId("vertical-grid-body");
    expect(timeGrids.length).toBeGreaterThan(0);
  });

  it("shows today badge in header when viewing current day", () => {
    const today = now();
    renderDayView({ initialDate: today });

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

    // Note: The "Today" badge is in the header component which isn't rendered in this isolated test
    // This test verifies the context has the correct date which would show the badge in the full calendar
  });

  it("initializes with specified initial date - different day", () => {
    cleanup();
    const initialDate = toZonedDateTime("2025-06-15T10:00:00.000Z");
    renderDayView({ initialDate });

    // Should have currentDate set to June 2025 (month 5, 0-indexed)
    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2025");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("5");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("15");
  });

  it("initializes with specified initial date - past date", () => {
    cleanup();
    const initialDate = toZonedDateTime("2020-01-15T10:00:00.000Z");
    renderDayView({ initialDate });

    // Should have currentDate set to January 2020 (month 0)
    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2020");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("0");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("15");
  });

  it("initializes with specified initial date - future date", () => {
    cleanup();
    const initialDate = toZonedDateTime("2030-12-25T10:00:00.000Z");
    renderDayView({ initialDate });

    // Should have currentDate set to December 2030 (month 11)
    expect(screen.getByTestId("current-date-year")).toHaveTextContent("2030");
    expect(screen.getByTestId("current-date-month")).toHaveTextContent("11");
    expect(screen.getByTestId("current-date-date")).toHaveTextContent("25");
  });

  it("defaults to current day when no initial date provided", () => {
    cleanup();
    const today = now();
    renderDayView();

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
  });

  it("renders with proper scrollable structure", () => {
    renderDayView();

    // Check for scrollable container
    const scrollArea = screen.getByTestId("vertical-grid-scroll");
    expect(scrollArea).toBeInTheDocument();

    // Check for time grid within scroll area
    const timeGrid = screen.getByTestId("vertical-grid-body");
    expect(timeGrid).toBeInTheDocument();
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

    renderDayView({
      businessHours,
      initialDate: monday,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // 10:00 should be business hour
    const businessCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`);
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

    renderDayView({
      businessHours,
      initialDate: monday,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // 08:00 should be non-business hour
    const nonBusinessCell = screen.getByTestId(
      `vertical-cell-${dateStr}-08-00`
    );

    expect(nonBusinessCell.className).toContain("color-mix");
    expect(nonBusinessCell.className).toContain("text-muted-foreground");
    expect(nonBusinessCell.className).not.toContain("hover:bg-muted/50");
    expect(nonBusinessCell.className).toContain("cursor-default");
  });

  it("treats the endTime slot as non-business because endTime is exclusive", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // 17:00 should be non-business hour (end time is exclusive)
    const endBusinessCell = screen.getByTestId(
      `vertical-cell-${dateStr}-17-00`
    );

    expect(endBusinessCell.className).toContain("color-mix");
    expect(endBusinessCell.className).toContain("text-muted-foreground");
    expect(endBusinessCell.className).toContain("cursor-default");
  });

  it("styles the startTime boundary slot as bookable", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
      slotDuration: 15,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // Exactly at 9:00am (startTime) - Should be business hour
    const startBoundaryCell = screen.getByTestId(
      `vertical-cell-${dateStr}-09-00`
    );

    expect(startBoundaryCell.className).toContain("hover:bg-accent");
    expect(startBoundaryCell.className).not.toContain("color-mix");
    expect(startBoundaryCell.className).toContain("cursor-pointer");
  });

  it("styles the endTime boundary slot as non-business", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
      slotDuration: 15,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // Exactly at 5:00pm (endTime) - Should be non-business hour (endTime is exclusive)
    const endBoundaryCell = screen.getByTestId(
      `vertical-cell-${dateStr}-17-00`
    );

    expect(endBoundaryCell.className).toContain("color-mix");
    expect(endBoundaryCell.className).toContain("text-muted-foreground");
    expect(endBoundaryCell.className).toContain("cursor-default");
  });

  it("styles the slot just before endTime as bookable", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
      slotDuration: 15,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // 4:45pm (15 minutes before endTime) - Should be business hour
    const beforeEndCell = screen.getByTestId(`vertical-cell-${dateStr}-16-45`);
    expect(beforeEndCell.className).toContain("hover:bg-accent");
    expect(beforeEndCell.className).not.toContain("color-mix");
    expect(beforeEndCell.className).toContain("cursor-pointer");
  });

  it("styles the slot just before startTime as non-business", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
      slotDuration: 15,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // 8:45am (15 minutes before startTime) - Should be non-business hour
    const beforeStartCell = screen.getByTestId(
      `vertical-cell-${dateStr}-08-45`
    );

    expect(beforeStartCell.className).toContain("color-mix");
    expect(beforeStartCell.className).toContain("text-muted-foreground");
    expect(beforeStartCell.className).toContain("cursor-default");
  });

  it("respects businessHours with different weekdays", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: 17,
      startTime: 9,
    };

    // Test Monday (business day)
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: monday,
    });

    const mondayCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-10-00`
    );

    expect(mondayCell.className).toContain("hover:bg-accent");
    expect(mondayCell.className).not.toContain("color-mix");

    cleanup();

    // Test Sunday (non-business day)
    // Sunday
    const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: sunday,
    });

    const sundayCell = screen.getByTestId(
      `vertical-cell-${format(sunday, "YYYY-MM-DD")}-10-00`
    );

    expect(sundayCell.className).toContain("color-mix");
    expect(sundayCell.className).toContain("text-muted-foreground");
    expect(sundayCell.className).toContain("cursor-default");
  });

  it("styles a slot inside custom business hours as bookable", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: tuesday,
    });

    const dateStr = format(tuesday, "YYYY-MM-DD");

    // 11:00 should be business hour
    const businessCell = screen.getByTestId(`vertical-cell-${dateStr}-11-00`);
    expect(businessCell.className).toContain("hover:bg-accent");
    expect(businessCell.className).not.toContain("color-mix");
  });

  it("styles a slot before the custom startTime as non-business", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: tuesday,
    });

    const dateStr = format(tuesday, "YYYY-MM-DD");

    // 9:00 should be non-business hour (before start)
    const earlyCell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`);
    expect(earlyCell.className).toContain("color-mix");
    expect(earlyCell.className).toContain("text-muted-foreground");
  });

  it("styles a slot after the custom endTime as non-business", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: tuesday,
    });

    const dateStr = format(tuesday, "YYYY-MM-DD");

    // 4:00pm should be non-business hour (after end)
    const lateCell = screen.getByTestId(`vertical-cell-${dateStr}-16-00`);
    expect(lateCell.className).toContain("color-mix");
    expect(lateCell.className).toContain("text-muted-foreground");
  });

  it("styles a custom-hours slot on an unconfigured weekday as non-business", () => {
    cleanup();

    const businessHours = {
      daysOfWeek: ["tuesday", "wednesday", "thursday"],
      // 3pm
      endTime: 15,
      startTime: 10,
    };

    // Monday is not in daysOfWeek
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: monday,
    });

    const mondayCell = screen.getByTestId(
      `vertical-cell-${format(monday, "YYYY-MM-DD")}-11-00`
    );

    expect(mondayCell.className).toContain("color-mix");
    expect(mondayCell.className).toContain("text-muted-foreground");
  });

  it("handles edge case: businessHours with single day", () => {
    cleanup();
    // Wednesday
    const wednesday = toZonedDateTime("2025-01-08T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: wednesday,
    });

    const dateStr = format(wednesday, "YYYY-MM-DD");

    // Wednesday 10am - Business hour
    const wednesdayCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`);
    expect(wednesdayCell.className).toContain("hover:bg-accent");
    expect(wednesdayCell.className).not.toContain("color-mix");

    cleanup();

    // Test Tuesday (non-business day)
    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    renderDayView({
      businessHours,
      initialDate: tuesday,
    });

    const tuesdayCell = screen.getByTestId(
      `vertical-cell-${format(tuesday, "YYYY-MM-DD")}-10-00`
    );

    expect(tuesdayCell.className).toContain("color-mix");
    expect(tuesdayCell.className).toContain("text-muted-foreground");
  });

  it("styles a weekday slot as bookable when no businessHours prop is given", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    renderDayView({
      initialDate: monday,
      // No businessHours prop
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // Monday 10am - Should be clickable (no business hours restriction)
    const mondayCell = screen.getByTestId(`vertical-cell-${dateStr}-10-00`);
    expect(mondayCell.className).toContain("hover:bg-accent");
    expect(mondayCell.className).not.toContain("color-mix");
    expect(mondayCell.className).toContain("cursor-pointer");
  });

  it("styles a weekend slot as bookable when no businessHours prop is given", () => {
    cleanup();
    // Sunday
    const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");
    renderDayView({
      initialDate: sunday,
    });

    // Sunday 8pm - Should be clickable (no business hours restriction)
    const sundayCell = screen.getByTestId(
      `vertical-cell-${format(sunday, "YYYY-MM-DD")}-20-00`
    );

    expect(sundayCell.className).toContain("hover:bg-accent");
    expect(sundayCell.className).not.toContain("color-mix");
    expect(sundayCell.className).toContain("cursor-pointer");
  });

  it("verifies 15-minute time slot granularity with business hours", () => {
    cleanup();
    // Monday
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
      slotDuration: 15,
    });

    const dateStr = format(monday, "YYYY-MM-DD");

    // Test all 15-minute slots in the 9am hour (all should be business hours)
    const slots = ["09-00", "09-15", "09-30", "09-45"];

    for (const slot of slots) {
      const cell = screen.getByTestId(`vertical-cell-${dateStr}-${slot}`);
      expect(cell.className).toContain("hover:bg-accent");
      expect(cell.className).not.toContain("color-mix");
    }

    // Sub-slots within an hour keep a dashed divider; the last sub-slot has
    // none (the solid hour line comes from the column's gap-px grid).
    const subSlotCell = screen.getByTestId(`vertical-cell-${dateStr}-09-00`);
    expect(subSlotCell.className).toContain("border-dashed");

    const lastSubSlotCell = screen.getByTestId(
      `vertical-cell-${dateStr}-09-45`
    );

    expect(lastSubSlotCell.className).not.toContain("border-dashed");

    // Test all 15-minute slots in the 8am hour (all should be non-business hours)
    const nonBusinessSlots = ["08-00", "08-15", "08-30", "08-45"];

    for (const slot of nonBusinessSlots) {
      const cell = screen.getByTestId(`vertical-cell-${dateStr}-${slot}`);
      expect(cell.className).toContain("color-mix");
      expect(cell.className).toContain("text-muted-foreground");
    }
  });

  it("displays time in 24-hour format when timeFormat is 24-hour", () => {
    cleanup();
    renderDayView({ timeFormat: "24-hour" });

    // Check that times are displayed in 24-hour format
    // 00:00 should show as "0" or "00" in 24-hour format (no minutes for on-the-hour)
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

  it("displays time in 12-hour format when timeFormat is 12-hour", () => {
    cleanup();
    renderDayView({ timeFormat: "12-hour" });

    // Check that times are displayed in 12-hour format
    // 00:00 should show as "12 AM" in 12-hour format (no minutes for on-the-hour)
    const midnightHour = screen.getByTestId("vertical-time-00");
    const midnightText = midnightHour.textContent || "";
    // In 12-hour format, should contain AM or PM
    // Note: The exact format depends on locale, but should have AM/PM indicator
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
    renderDayView();

    // Should default to 12-hour format (timeFormat defaults to '12-hour')
    const midnightHour = screen.getByTestId("vertical-time-00");
    const midnightText = midnightHour.textContent || "";
    expect(midnightText).toMatch(AMPM);

    const noonHour = screen.getByTestId("vertical-time-12");
    const noonText = noonHour.textContent || "";
    expect(noonText).toMatch(AMPM);
  });

  it("correctly formats all 24 hours in 24-hour format", () => {
    cleanup();
    renderDayView({ timeFormat: "24-hour" });

    // Verify all hours from 0-23 are displayed without AM/PM
    for (let hour = 0; hour < 24; hour += 1) {
      const hourStr = hour.toString().padStart(2, "0");
      const hourElement = screen.getByTestId(`vertical-time-${hourStr}`);
      const hourText = hourElement.textContent || "";
      expect(hourText).not.toMatch(AMPM);
    }
  });

  it("hides non-business hours when hideNonBusinessHours is true", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Business hours should be present
    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-16")).toBeInTheDocument();

    // Non-business hours should NOT be present
    expect(screen.queryByTestId("vertical-time-08")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-17")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vertical-time-23")).not.toBeInTheDocument();
  });

  it("shows all hours if hideNonBusinessHours is true but businessHours is missing", () => {
    cleanup();
    renderDayView({
      hideNonBusinessHours: true,
      // No businessHours provided
    });

    // Should fallback to 24 hours
    expect(screen.getByTestId("vertical-time-00")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-23")).toBeInTheDocument();
  });

  // Backwards compatibility tests
  it("keeps non-business hours in the grid when hideNonBusinessHours is false", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
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
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
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
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
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
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
      businessHours,
      initialDate: monday,
      // hideNonBusinessHours is NOT provided - should default to false
    });

    expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-time-16")).toBeInTheDocument();
  });

  it("scroll area uses flex column container for scroll containment", () => {
    cleanup();
    renderDayView();

    const container = screen.getByTestId("vertical-grid-container");
    expect(container.className).toContain("flex");
    expect(container.className).toContain("flex-col");

    const scrollArea = screen.getByTestId("vertical-grid-scroll");
    expect(scrollArea).toBeInTheDocument();
  });

  it("still applies business hours styling when hideNonBusinessHours is false", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    renderDayView({
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

    expect(nonBusinessCell.className).toContain("color-mix");
    expect(nonBusinessCell.className).toContain("cursor-default");
  });

  // Event positioning tests - CRITICAL for hideNonBusinessHours
  it("positions event at 0% top when event starts at business hour start with hideNonBusinessHours true", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am (business start)
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      id: "test-event-9am",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Morning Meeting",
    };

    renderDayView({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Morning Meeting");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am should be at top: 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 0%");
  });

  it("positions event correctly when hideNonBusinessHours is false (24-hour grid)", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 9am
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      id: "test-event-9am-full",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Morning Meeting Full Day",
    };

    renderDayView({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: false,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Morning Meeting Full Day");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 9am in a 24-hour grid should be at ~37.5% (9/24 * 100)
    // This is the key difference - with 24 hours, 9am is NOT at top 0%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).not.toContain("top: 0%");
  });

  it("positions event at correct percentage when event is in middle of business hours", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const businessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    // Create an event that starts at 1pm (13:00), which is 4 hours after 9am
    // With 8 business hours (9-17), 1pm should be at 50% (4/8 * 100)
    const testEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T14:00:00.000Z"),
      id: "test-event-1pm",
      start: toZonedDateTime("2025-01-06T13:00:00.000Z"),
      title: "Afternoon Meeting",
    };

    renderDayView({
      businessHours,
      events: [testEvent],
      hideNonBusinessHours: true,
      initialDate: monday,
    });

    // Event should be rendered
    const eventElement = screen.getByText("Afternoon Meeting");
    expect(eventElement).toBeInTheDocument();

    // Find the event wrapper with positioning
    const eventWrapper = eventElement.closest('[style*="top"]');
    expect(eventWrapper).not.toBeNull();

    // Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
    const style = textOr(eventWrapper?.getAttribute("style"), "");
    expect(style).toContain("top: 50%");
  });

  it("renders only hour slots by default (no sub-hour subdivisions)", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    renderDayView({ initialDate: monday });

    const dateStr = format(monday, "YYYY-MM-DD");

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-15`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-30`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-45`)
    ).not.toBeInTheDocument();
  });

  it("renders half-hour slots when slotDuration is 30", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    renderDayView({ initialDate: monday, slotDuration: 30 });

    const dateStr = format(monday, "YYYY-MM-DD");

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-30`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-15`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`vertical-cell-${dateStr}-09-45`)
    ).not.toBeInTheDocument();
  });

  it("renders quarter-hour slots when slotDuration is 15", () => {
    cleanup();
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    renderDayView({ initialDate: monday, slotDuration: 15 });

    const dateStr = format(monday, "YYYY-MM-DD");

    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-00`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-15`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-30`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`vertical-cell-${dateStr}-09-45`)
    ).toBeInTheDocument();
  });

  it("renders the midnight row through renderHour", () => {
    cleanup();

    renderDayView({ renderHour });

    const customMidnight = screen.getByTestId("custom-hour-00");
    expect(customMidnight).toBeInTheDocument();
    expect(customMidnight).toHaveTextContent("00:00");
  });

  it("renders the noon row through renderHour", () => {
    cleanup();

    renderDayView({ renderHour });

    const customNoon = screen.getByTestId("custom-hour-12");
    expect(customNoon).toBeInTheDocument();
    expect(customNoon).toHaveTextContent("12:00");
  });

  it("renders the last row through renderHour", () => {
    cleanup();

    renderDayView({ renderHour });

    const customLastHour = screen.getByTestId("custom-hour-23");
    expect(customLastHour).toBeInTheDocument();
    expect(customLastHour).toHaveTextContent("23:00");
  });

  describe("scrollTime", () => {
    const scrollToDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollTo"
    );

    beforeEach(() => {
      cleanup();
    });

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

      renderDayView({ scrollTime: "08:00:00" });

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
    });

    it("does not scroll when scrollTime is not provided", () => {
      const scrollSpy = vi.fn<(options?: ScrollToOptions) => void>();
      Object.defineProperty(Element.prototype, "scrollTo", {
        configurable: true,
        value: scrollSpy,
        writable: true,
      });

      renderDayView();

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
