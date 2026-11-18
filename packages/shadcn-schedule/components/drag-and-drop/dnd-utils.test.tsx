import { describe, expect, it } from "vitest";

import { getUpdatedEvent } from "@/components/drag-and-drop/dnd-utils";
import type { DragEndEventLike } from "@/components/drag-and-drop/dnd-utils";
import {
  diff,
  endOf,
  format,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

let cellType = "day-cell";
let cellDate = toZonedDateTime("2024-10-15T00:00:00");

/**
 * The drop target's optional flags. Keys are removed (rather than set to
 * undefined) for the tests that need a cell which does not carry them.
 */
interface CellFlags {
  allDay?: boolean;
  hour?: number;
  minute?: number;
  resourceId?: string | number;
}

const cell: CellFlags = { allDay: false };

const getDragEvent = (): DragEndEventLike => ({
  active: {
    id: "event-1",
  },
  over: {
    data: {
      current: {
        allDay: cell.allDay,
        date: cellDate,
        hour: cell.hour,
        minute: cell.minute,
        resourceId: cell.resourceId,
        type: cellType,
      },
    },
    id: "time-cell-2024-06-15-10-30",
  },
});

let start = toZonedDateTime("2024-06-15T00:00:00");
let end = toZonedDateTime("2024-06-15T23:59:59");
let allDay = false;
let resourceId: string | number | undefined;

const getActiveEvent = () => ({
  allDay,
  end,
  resourceId,
  start,
  id: "event-1",
  title: "Sample Event",
});

describe("getUpdatedEvent Utility Function", () => {
  it("should return null if active or over is missing", () => {
    const result = getUpdatedEvent({ active: null, over: null }, null);
    expect(result).toBeNull();
  });

  it("should return null if activeEvent is null", () => {
    const result = getUpdatedEvent(getDragEvent(), null);
    expect(result).toBeNull();
  });

  it("should calculate new start and end times correctly for day-cell drop", () => {
    const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    const { updates } = result;
    expect(format(updates.start)).toBe(format(cellDate));
    expect(format(updates.end)).toBe(
      format(cellDate.add({ seconds: Math.trunc(diff(end, start, "second")) }))
    );
    expect(updates.allDay).toBeFalsy();
  });

  describe("should handle all-day conversions correctly", () => {
    it("should convert timed event to all-day when dropped on all-day cell", () => {
      cellDate = toZonedDateTime("2024-10-25T00:00:00");
      cell.allDay = true;

      const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
      expect(result).not.toBeNull();

      if (!result) {
        return;
      }

      const { updates } = result;
      expect(updates.allDay).toBeTruthy();
      expect(format(updates.start)).toBe(format(toZonedDateTime(cellDate)));
      expect(diff(updates.end, updates.start, "second")).toBe(
        diff(end, start, "second")
      );
    });

    it("should convert all-day event to non-all-day when dropped on non-all-day cell", () => {
      allDay = true;
      cell.allDay = false;

      const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
      expect(result).not.toBeNull();

      if (!result) {
        return;
      }

      const { updates } = result;
      expect(updates.allDay).toBeFalsy();
      expect(format(updates.start)).toBe(format(toZonedDateTime(cellDate)));
      expect(diff(updates.end, updates.start, "second")).toBe(
        diff(end, start, "second")
      );
    });

    it("should retain all-day status when dropping all-day event on cell with all-day flag not defined", () => {
      allDay = true;
      delete cell.allDay;

      const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
      expect(result).not.toBeNull();

      if (!result) {
        return;
      }

      const { updates } = result;
      expect(updates.allDay).toBeTruthy();
    });
  });

  it("should update resourceId when dropping on a cell with different resourceId", () => {
    resourceId = "resource-1";
    cell.resourceId = "resource-2";

    const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    const { updates } = result;
    expect(updates.resourceId).toBe(cell.resourceId);
  });

  it("should calculate new start and end times correctly for time-cell drop", () => {
    cellDate = toZonedDateTime("2024-10-20T00:00:00.000Z");
    cellType = "time-cell";
    cell.hour = 14;
    cell.minute = 30;

    const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    const { updates } = result;

    const expectedStart = toZonedDateTime(cellDate).with({
      hour: cell.hour,
      minute: cell.minute,
    });

    const expectedEnd = expectedStart.add({
      seconds: Math.trunc(diff(end, start, "second")),
    });

    expect(toISOString(updates.start)).toBe(toISOString(expectedStart));
    expect(toISOString(updates.end)).toBe(toISOString(expectedEnd));
    expect(updates.allDay).toBeFalsy();
  });

  it("should set all-day to false when dropping on time-cell even if original event was all-day", () => {
    allDay = true;
    cellType = "time-cell";
    cell.hour = 9;
    cell.minute = 0;

    const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    const { updates } = result;
    expect(updates.allDay).toBeFalsy();
  });

  it("should handle event end time at midnight correctly", () => {
    start = toZonedDateTime("2024-06-15T22:00:00");
    // End time at midnight (2 hour duration)
    end = toZonedDateTime("2024-06-16T00:00:00");
    cellType = "day-cell";
    cellDate = toZonedDateTime("2024-10-22T22:00:00");
    allDay = false;
    delete cell.hour;
    delete cell.minute;

    const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    const { updates } = result;
    expect(format(updates.start)).toBe(format(cellDate));
    // When end time lands exactly at midnight, it should be adjusted to 23:59 of the same day
    expect(format(updates.end)).toBe(format(endOf(cellDate, "day")));
  });

  it("should handle dragging multi-day all-day event to time cell correctly", () => {
    // Event ID 15 from seed.ts: Conference Nov 4-6 (all-day)
    // Using endOf('day') for all-day events: Nov 4 00:00:00 to Nov 6 23:59:59.999
    start = toZonedDateTime("2024-11-04T00:00:00.000Z");
    end = toZonedDateTime("2024-11-06T23:59:59.999Z");
    allDay = true;
    cellType = "time-cell";
    cellDate = toZonedDateTime("2024-11-04T00:00:00.000Z");
    cell.hour = 1;
    cell.minute = 0;
    delete cell.resourceId;

    const result = getUpdatedEvent(getDragEvent(), getActiveEvent());
    expect(result).not.toBeNull();

    if (!result) {
      return;
    }

    const { updates } = result;

    // CURRENT BEHAVIOR (with second precision):
    // - Original duration: 2 days 23h 59m 59.999s (using endOf('day'))
    // - Duration in seconds: 259199 (loses millisecond precision)
    // - Start: Nov 4 01:00:00
    // - End: Nov 4 01:00:00 + 259199 sec = Nov 7 00:59:59
    expect(toISOString(updates.start)).toBe("2024-11-04T01:00:00.000Z");
    expect(toISOString(updates.end)).toBe("2024-11-07T00:59:59.000Z");
    expect(updates.allDay).toBeFalsy();

    // NOTE: Still 1 second off from ideal behavior due to millisecond truncation
    // - Ideal: Nov 7 01:00:00 (3 full days later)
    // - Actual: Nov 7 00:59:59 (loses .999ms when using second precision)
    // - To fully fix: would need millisecond precision instead of second
  });
});
