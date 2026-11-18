import { cleanup, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import {
  assertResourceWeekBusinessHourRange,
  assertVerticalBusinessHourRange,
  singleResource,
  weekdayBusinessHours,
} from "@/testing/resource-test-fixtures";
import { DayView, WeekView } from "@/testing/view-harnesses";
import type { Resource } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

describe("Resource Calendar Business Hours Integration", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("ResourceWeekHorizontal", () => {
    it("calculates correct dynamic width when hideNonBusinessHours is true", () => {
      // Wednesday
      const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");
      const businessHours = weekdayBusinessHours(9, 17);

      render(
        <CalendarProvider
          businessHours={businessHours}
          dayMaxEvents={3}
          hideNonBusinessHours={true}
          initialDate={initialDate}
          orientation="horizontal"
          resources={singleResource}
        >
          <WeekView />
        </CalendarProvider>
      );

      expect(() => {
        assertResourceWeekBusinessHourRange(screen, 9, 16, 8, 17);
      }).not.toThrow();
    });
  });

  describe("ResourceDayVertical Weekend Fallback", () => {
    it("falls back to global business hours range on a weekend (Sunday)", () => {
      const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");
      const businessHours = weekdayBusinessHours(10, 16);

      render(
        <CalendarProvider
          businessHours={businessHours}
          dayMaxEvents={3}
          hideNonBusinessHours={true}
          initialDate={sunday}
          orientation="vertical"
          resources={singleResource}
        >
          <DayView />
        </CalendarProvider>
      );

      // Even though it's Sunday (not in daysOfWeek), it should show 10-16 range
      // because of the new fallback logic in getViewHours
      expect(() => {
        assertVerticalBusinessHourRange(screen, 10, 15, 9, 16);
      }).not.toThrow();
    });
  });

  describe("ResourceDayHorizontal", () => {
    it("hides non-business hours correctly", () => {
      const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");

      const businessHours = {
        endTime: 18,
        startTime: 8,
      };

      render(
        <CalendarProvider
          businessHours={businessHours}
          dayMaxEvents={3}
          hideNonBusinessHours={true}
          initialDate={monday}
          orientation="horizontal"
          resources={singleResource}
        >
          <DayView />
        </CalendarProvider>
      );

      expect(
        screen.getByTestId("resource-day-time-label-08")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resource-day-time-label-17")
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("resource-day-time-label-07")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("resource-day-time-label-18")
      ).not.toBeInTheDocument();
    });
  });
  describe("Resource Business Hours Union and Precedence", () => {
    it("renders union of business hours and respects resource-specific availability", () => {
      // Wednesday
      const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

      const resources: Resource[] = [
        {
          businessHours: { endTime: 17, startTime: 9 },
          id: "A",
          title: "Resource A",
        },
        {
          businessHours: { endTime: 18, startTime: 9 },
          id: "B",
          title: "Resource B",
        },
      ];

      render(
        <CalendarProvider
          dayMaxEvents={3}
          hideNonBusinessHours={true}
          initialDate={initialDate}
          orientation="horizontal"
          resources={resources}
        >
          <DayView />
        </CalendarProvider>
      );

      // 1. Verify Union: Should show up to 18:00 (last label 17:00 because it covers 17-18)
      expect(
        screen.getByTestId("resource-day-time-label-17")
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("resource-day-time-label-18")
      ).not.toBeInTheDocument();

      // 2. Verify Precedence/Availability:
      // Resource A at 17:00 should be disabled
      const rowA = screen.getByTestId("horizontal-row-A");
      const cellA17 = within(rowA).getByTestId("day-cell-2025-01-01-17-00");
      expect(cellA17.dataset.disabled).toBe("true");

      // Resource B at 17:00 should be enabled
      const rowB = screen.getByTestId("horizontal-row-B");
      const cellB17 = within(rowB).getByTestId("day-cell-2025-01-01-17-00");
      expect(cellB17.dataset.disabled).toBe("false");
    });
  });
});
