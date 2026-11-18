import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DatePicker } from "@/plugins/recurrence/ui/date-picker";
import {
  endOf,
  format,
  isBefore,
  setDefaultTimeZone,
  toZonedDateTime,
} from "@/utils/temporal";

const renderPicker = (date?: Date) => {
  const received: (Date | undefined)[] = [];

  const handleChange = (value: Date | undefined) => {
    received.push(value);
  };

  render(<DatePicker date={date} onChange={handleChange} />);

  const input = screen.getByDisplayValue(
    date ? format(toZonedDateTime(date), "YYYY-MM-DD") : ""
  );

  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError("DatePicker input is not an <input> element");
  }

  return {
    input,
    received,
  };
};

/**
 * `DatePicker` backs the "until" date of a recurring event
 * (`recurrence-end-fields.tsx`), so every one of these paths is user-reachable.
 */
describe(DatePicker, () => {
  it("renders the supplied date in YYYY-MM-DD form", () => {
    const { input } = renderPicker(new Date("2026-03-02T00:00:00"));
    expect(input).toBeInTheDocument();
  });

  /**
   * Regression test. The component called `toZonedDateTime(raw, 'YYYY-MM-DD')`, but the
   * configured dayjs wrapper forwards every argument to `dayjs.timeZoneId`, whose
   * second parameter is a TIMEZONE rather than a parse format. That made the
   * format string be read as a zone name and threw
   * `RangeError: invalid time zone: YYYY-MM-DD` on every keystroke.
   */
  it("parses typed input without throwing", () => {
    const { input, received } = renderPicker();
    expect(() => {
      fireEvent.change(input, { target: { value: "2026-03-02" } });
    }).not.toThrow();
    expect(received).toHaveLength(1);
    const parsed = received.at(0);
    expect(parsed).toBeInstanceOf(Date);
    expect(format(toZonedDateTime(parsed), "YYYY-MM-DD")).toBe("2026-03-02");
  });

  it("reports undefined when the field is cleared", () => {
    const { input, received } = renderPicker(new Date("2026-03-02T00:00:00"));
    fireEvent.change(input, { target: { value: "" } });
    expect(received).toStrictEqual([undefined]);
  });

  it("ignores unparseable input (native date inputs reject invalid values)", () => {
    const { input, received } = renderPicker(new Date("2026-03-02T00:00:00"));
    // jsdom normalizes an invalid assignment to a native date input to an
    // empty value, so the change fires with an empty raw value (a real
    // browser refuses the input entirely). The controlled input keeps
    // rendering the last valid date.
    fireEvent.change(input, { target: { value: "not-a-date" } });
    expect(received).toStrictEqual([undefined]);
    expect(input.value).toBe("2026-03-02");
  });

  it("handles a leap day", () => {
    const { input, received } = renderPicker();
    fireEvent.change(input, { target: { value: "2028-02-29" } });
    expect(format(toZonedDateTime(received.at(0)), "YYYY-MM-DD")).toBe(
      "2028-02-29"
    );
  });

  /**
   * The reported instant is start of day in the CONFIGURED timezone, which the
   * calendar sets through `dayjs.tz.setDefault` (`use-calendar-engine.ts`).
   * East of UTC that instant lands on the previous UTC day, so these pin the
   * contract the sole consumer relies on: `recurrence-editor`'s `setUntil`
   * normalizes with `endOf('day')` in the same zone, which must land the
   * series end back on the day the user picked.
   */
  describe("configured timezone", () => {
    afterEach(() => {
      setDefaultTimeZone("UTC");
    });

    it("reports start of day in the configured timezone", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const { input, received } = renderPicker();

      fireEvent.change(input, { target: { value: "2026-03-02" } });

      expect(received.at(0)?.toISOString()).toBe("2026-03-01T15:00:00.000Z");
    });

    it("survives the endOf-day round trip its consumer applies", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const { input, received } = renderPicker();

      fireEvent.change(input, { target: { value: "2026-03-02" } });
      const until = endOf(toZonedDateTime(received.at(0)), "day");
      const lastOccurrence = toZonedDateTime("2026-03-02").with({ hour: 23 });

      expect(format(until, "YYYY-MM-DD")).toBe("2026-03-02");
      expect(isBefore(lastOccurrence, until)).toBeTruthy();
    });
  });
});
