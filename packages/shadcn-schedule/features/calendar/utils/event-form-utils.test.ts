import { describe, expect, it } from "vitest";

import {
  buildDateTime,
  buildEndDateTime,
  getTimeConstraints,
} from "@/features/calendar/utils/event-form-utils";
import type { BusinessHours } from "@/types/index";
import { format } from "@/utils/temporal";

describe("event-form-utils", () => {
  // Wednesday
  const testDate = new Date("2025-01-15T00:00:00.000Z");

  describe(buildDateTime, () => {
    it("combines date and time correctly", () => {
      const result = buildDateTime(testDate, "14:30", false);
      expect(format(result, "YYYY-MM-DD HH:mm")).toBe("2025-01-15 14:30");
    });

    it("sets time to 00:00 if isAllDay is true", () => {
      const result = buildDateTime(testDate, "14:30", true);
      expect(format(result, "YYYY-MM-DD HH:mm")).toBe("2025-01-15 00:00");
    });
  });

  describe(buildEndDateTime, () => {
    it("combines date and time correctly", () => {
      const result = buildEndDateTime(testDate, "15:45", false);
      expect(format(result, "YYYY-MM-DD HH:mm")).toBe("2025-01-15 15:45");
    });

    it("sets time to 23:59 if isAllDay is true", () => {
      const result = buildEndDateTime(testDate, "15:45", true);
      expect(format(result, "YYYY-MM-DD HH:mm")).toBe("2025-01-15 23:59");
    });
  });

  describe(getTimeConstraints, () => {
    it("returns full day range when no businessHours provided", () => {
      const result = getTimeConstraints(testDate);
      expect(result).toStrictEqual({ max: "23:59", min: "00:00" });
    });

    it("returns configured business hours for matching day", () => {
      const businessHours: BusinessHours = {
        daysOfWeek: ["wednesday"],
        endTime: 17,
        startTime: 9,
      };

      const result = getTimeConstraints(testDate, businessHours);
      // endTime 17 -> maxTime 16:45
      expect(result).toStrictEqual({ max: "16:45", min: "09:00" });
    });

    it("returns full day range when day does not match business hours", () => {
      const businessHours: BusinessHours = {
        // Not Wednesday
        daysOfWeek: ["monday"],
        endTime: 17,
        startTime: 9,
      };

      const result = getTimeConstraints(testDate, businessHours);
      expect(result).toStrictEqual({ max: "23:59", min: "00:00" });
    });

    it("handles array of business hours", () => {
      const businessHours: BusinessHours[] = [
        {
          daysOfWeek: ["monday"],
          endTime: 12,
          startTime: 8,
        },
        {
          daysOfWeek: ["wednesday"],
          endTime: 18,
          startTime: 10,
        },
      ];

      const result = getTimeConstraints(testDate, businessHours);
      // Should match Wednesday config: 10:00 to 18:00 (max 17:45)
      expect(result).toStrictEqual({ max: "17:45", min: "10:00" });
    });

    it("uses default start/end times if not provided in config", () => {
      const businessHours: BusinessHours = {
        daysOfWeek: ["wednesday"],
        // defaults: start 9, end 17
      };

      const result = getTimeConstraints(testDate, businessHours);
      expect(result).toStrictEqual({ max: "16:45", min: "09:00" });
    });

    it("handles multiple rules for the same day (split shifts)", () => {
      const businessHours: BusinessHours[] = [
        {
          daysOfWeek: ["wednesday"],
          endTime: 12,
          startTime: 10,
        },
        {
          daysOfWeek: ["wednesday"],
          endTime: 16,
          startTime: 14,
        },
      ];

      const result = getTimeConstraints(testDate, businessHours);
      // Should take earliest start (10) and latest end (16 -> max 15:45)
      expect(result).toStrictEqual({ max: "15:45", min: "10:00" });
    });
  });
});
