import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { useDateTimeFormatters } from "@/hooks/use-date-time-formatters";
import { toZonedDateTime } from "@/utils/temporal";

const renderFormattersHook = (
  props: { locale?: string; timezone?: string } = {}
) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CalendarProvider
      dayMaxEvents={3}
      events={[]}
      firstDayOfWeek={0}
      {...props}
    >
      {children}
    </CalendarProvider>
  );

  const { result } = renderHook(() => useDateTimeFormatters(), { wrapper });

  return result.current.formatDateRange;
};

const d = (iso: string) => toZonedDateTime(iso);

// ICU (CLDR) versions disagree on whether the en-dash in date ranges is
// surrounded by narrow no-break (U+202F) or thin (U+2009) spaces; normalize
// before comparing so the assertions are runtime-independent.
const normalize = (value: string) => value.replaceAll(/[\u2009\u202F]/gu, " ");

describe(useDateTimeFormatters, () => {
  describe("formatDateRange", () => {
    it("returns a compact English range with en-dash separator and no year", () => {
      const fmt = renderFormattersHook();
      expect(normalize(fmt(d("2026-04-26"), d("2026-05-02")))).toBe(
        "Apr 26 – May 2"
      );
    });

    it("collapses same-month ranges to a single month label", () => {
      const fmt = renderFormattersHook();
      expect(normalize(fmt(d("2026-04-26"), d("2026-04-28")))).toBe(
        "Apr 26 – 28"
      );
    });

    it("drops the year for a week spanning two years", () => {
      const fmt = renderFormattersHook();
      expect(fmt(d("2026-12-30"), d("2027-01-05"))).toBe("Dec 30 – Jan 5");
    });

    it("respects the calendar locale (French puts the day before the month)", () => {
      const fmt = renderFormattersHook({ locale: "fr" });
      expect(normalize(fmt(d("2026-04-26"), d("2026-05-02")))).toBe(
        "26 avr. – 2 mai"
      );
    });

    it("uses the calendar timezone so dates near midnight do not shift days", () => {
      const fmt = renderFormattersHook({ timezone: "America/Los_Angeles" });

      const start = toZonedDateTime(
        "2026-04-26T00:30:00",
        "America/Los_Angeles"
      );

      const end = toZonedDateTime("2026-05-02T23:30:00", "America/Los_Angeles");
      expect(normalize(fmt(start, end))).toBe("Apr 26 – May 2");
    });
  });
});
