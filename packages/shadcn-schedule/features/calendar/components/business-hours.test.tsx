import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import {
  assertVerticalBusinessHourRange,
  weekdayBusinessHours,
} from "@/testing/resource-test-fixtures";
import { DayView, WeekView } from "@/testing/view-harnesses";
import type { BusinessHours } from "@/types/index";
import { format, toZonedDateTime } from "@/utils/temporal";

describe("Regular Calendar Business Hours Integration", () => {
  beforeEach(() => {
    cleanup();
  });

  describe(DayView, () => {
    it("falls back to global business hours range on a weekend (Sunday)", () => {
      const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");
      const businessHours = weekdayBusinessHours(10, 16);

      render(
        <CalendarProvider
          businessHours={businessHours}
          dayMaxEvents={3}
          hideNonBusinessHours={true}
          initialDate={sunday}
        >
          <DayView />
        </CalendarProvider>
      );

      // Should show business range from Monday even though it's Sunday
      expect(() => {
        assertVerticalBusinessHourRange(screen, 10, 15, 9, 16);
      }).not.toThrow();
    });
  });

  describe("sub-hour boundaries", () => {
    const wednesday = toZonedDateTime("2025-01-01T00:00:00.000Z");
    const wednesdayKey = format(wednesday, "YYYY-MM-DD");

    const subHourBusinessHours: BusinessHours = {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      endTime: "17:15",
      startTime: "09:15",
    };

    const renderWeek = (props = {}) =>
      render(
        <CalendarProvider
          businessHours={subHourBusinessHours}
          dayMaxEvents={3}
          initialDate={wednesday}
          {...props}
        >
          <WeekView />
        </CalendarProvider>
      );

    const cellDisabled = (hh: string, mm: string) =>
      screen.getByTestId(`vertical-cell-${wednesdayKey}-${hh}-${mm}`).dataset
        .disabled;

    it("disables hour cells that only partially overlap business hours", () => {
      renderWeek();

      const boundaryCells = [
        cellDisabled("09", "00"),
        cellDisabled("10", "00"),
        cellDisabled("16", "00"),
        cellDisabled("17", "00"),
      ];

      expect(boundaryCells).toStrictEqual(["true", "false", "false", "true"]);
    });

    it("enables exactly the slots inside the boundary with 15-minute slots", () => {
      renderWeek({ slotDuration: 15 });

      const boundaryCells = [
        cellDisabled("09", "00"),
        cellDisabled("09", "15"),
        cellDisabled("17", "00"),
        cellDisabled("17", "15"),
      ];

      expect(boundaryCells).toStrictEqual(["true", "false", "false", "true"]);
    });

    it("30-minute slots lose both partial slots at :15 boundaries", () => {
      renderWeek({ slotDuration: 30 });

      const boundaryCells = [
        // crosses the 9:15 start
        cellDisabled("09", "00"),
        cellDisabled("09", "30"),
        // ends 17:00 <= 17:15
        cellDisabled("16", "30"),
        // ends 17:30 > 17:15
        cellDisabled("17", "00"),
      ];

      expect(boundaryCells).toStrictEqual(["true", "false", "false", "true"]);
    });

    it("hideNonBusinessHours keeps the partial boundary hours visible", () => {
      renderWeek({ hideNonBusinessHours: true });

      expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
      expect(screen.getByTestId("vertical-time-17")).toBeInTheDocument();
      expect(screen.queryByTestId("vertical-time-08")).not.toBeInTheDocument();
      expect(screen.queryByTestId("vertical-time-18")).not.toBeInTheDocument();
    });
  });

  describe(WeekView, () => {
    it("hides non-business hours consistently across the week", () => {
      // Wednesday
      const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");
      const businessHours = weekdayBusinessHours(9, 17);

      render(
        <CalendarProvider
          businessHours={businessHours}
          dayMaxEvents={3}
          hideNonBusinessHours={true}
          initialDate={initialDate}
        >
          <WeekView />
        </CalendarProvider>
      );

      // Business hours should be present
      expect(screen.getByTestId("vertical-time-09")).toBeInTheDocument();
      expect(screen.getByTestId("vertical-time-16")).toBeInTheDocument();

      // Non-business hours should NOT be present
      expect(screen.queryByTestId("vertical-time-08")).not.toBeInTheDocument();
      expect(screen.queryByTestId("vertical-time-17")).not.toBeInTheDocument();
    });
  });
});
