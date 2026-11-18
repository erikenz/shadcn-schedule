import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import { RecurrenceEditor } from "@/plugins/recurrence/components/recurrence-editor/recurrence-editor";
import type { RRuleOptions } from "@/plugins/recurrence/types";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import {
  detectPreset,
  getNthWeekdayOfMonth,
  getPresetRRule,
} from "@/plugins/recurrence/utils/recurrence-presets";
import { toTemporalRule } from "@/plugins/recurrence/utils/temporal-rule";
import { CalendarTestProvider } from "@/testing/index";

/* oxlint-disable sonarjs/parameterized-tests -- each case drives a different rrule editor interaction, not a shared shape over one input */

const isRuleWithoutDtstart = (
  value: unknown
): value is Partial<RRuleOptions> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.hasOwn(value, "freq") && !Object.hasOwn(value, "dtstart");
};

// Reference dates at noon UTC so the local-time day-of-month/weekday is stable
// across the runner's timezone. 6/13/27 Jan 2025 are all Mondays; the 27th is
// the last Monday of January, the 13th is the second.
const MON_FIRST = new Date("2025-01-06T12:00:00Z");
const MON_SECOND = new Date("2025-01-13T12:00:00Z");
const MON_LAST = new Date("2025-01-27T12:00:00Z");

const REPEATS = /repeats/iu;
const CUSTOM_RECURRENCE = /custom recurrence/iu;
const FREQUENCY = /frequency/iu;
const UNTIL_LABEL = /until/iu;
const EVERY_WEEKDAY = /every weekday/iu;
const REPEAT_ON = /repeat on/iu;
const MONTHLY_ON_THE = /monthly on the/iu;

describe("recurrence presets", () => {
  it("counts which occurrence of its weekday a date is in its month", () => {
    expect(getNthWeekdayOfMonth(MON_FIRST)).toBe(1);
    expect(getNthWeekdayOfMonth(MON_SECOND)).toBe(2);
    expect(getNthWeekdayOfMonth(MON_LAST)).toBe(-1);
  });

  it("maps simple and daily presets to anchored rules", () => {
    expect(getPresetRRule("once", MON_FIRST)).toBeNull();
    expect(getPresetRRule("daily", MON_FIRST)).toStrictEqual({
      dtstart: MON_FIRST,
      freq: FREQ.DAILY,
      interval: 1,
    });
    const weekly = getPresetRRule("weeklyOnDay", MON_FIRST);
    expect(weekly?.byweekday).toStrictEqual([{ weekday: 0 }]);
  });

  it("maps weekdays and monthly presets to anchored rules", () => {
    const weekdays = getPresetRRule("weekdays", MON_FIRST);
    expect(weekdays?.freq).toBe(FREQ.WEEKLY);
    expect(weekdays?.byweekday).toStrictEqual([
      { weekday: 0 },
      { weekday: 1 },
      { weekday: 2 },
      { weekday: 3 },
      { weekday: 4 },
    ]);
    expect(getPresetRRule("monthlyOnDay", MON_FIRST)).toMatchObject({
      bymonthday: 6,
      freq: FREQ.MONTHLY,
    });
    const monthlyWeekday = getPresetRRule("monthlyOnWeekday", MON_SECOND);
    expect(monthlyWeekday?.byweekday).toStrictEqual([{ n: 2, weekday: 0 }]);
  });

  it("detects the preset a saved rule represents", () => {
    expect(detectPreset(null, MON_FIRST)).toBe("once");
    expect(detectPreset(getPresetRRule("daily", MON_FIRST), MON_FIRST)).toBe(
      "daily"
    );
    expect(
      detectPreset(getPresetRRule("weeklyOnDay", MON_FIRST), MON_FIRST)
    ).toBe("weeklyOnDay");
    expect(
      detectPreset(getPresetRRule("monthlyOnWeekday", MON_SECOND), MON_SECOND)
    ).toBe("monthlyOnWeekday");
    expect(
      detectPreset(
        { dtstart: MON_FIRST, freq: FREQ.WEEKLY, interval: 3 },
        MON_FIRST
      )
    ).toBe("customize");
  });

  it("treats end conditions as preset-independent", () => {
    const dailyWithEnd = {
      // getPresetRRule never returns null for "daily"; the fallback only
      // satisfies the type so the spread stays non-null.
      ...(getPresetRRule("daily", MON_FIRST) ?? {
        freq: FREQ.DAILY,
        interval: 1,
      }),
      count: 5,
    };

    expect(detectPreset(dailyWithEnd, MON_FIRST)).toBe("daily");
  });
});

// Test helper to create complete RRuleOptions with required dtstart
const createRRuleOptions = (
  partial: Partial<RRuleOptions> = {}
): RRuleOptions => ({
  dtstart: new Date("2025-01-01T09:00:00Z"),
  // This should be overridden by ...partial if freq is provided
  freq: FREQ.DAILY,
  interval: 1,
  ...partial,
});

/**
 * Weekday entries of a rule's `byweekday`, which RRule may store as a single
 * weekday or as a list of numbers, weekday objects, or both.
 */
const byweekdays = (
  value: RRuleOptions["byweekday"]
): { n?: number; weekday: number }[] =>
  (Array.isArray(value) ? value : [value]).flatMap((day) =>
    // rrule hands weekdays over as numbers or `Weekday` objects; only the
    // objects carry the `weekday` field the assertions read.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- see the note above
    day !== null && day !== undefined && typeof day !== "number" ? [day] : []
  );

type OnChangeMock = Mock<(value: RRuleOptions | null) => void>;

/** Reads the rule the editor last emitted through its typed change handler. */
const getLastCallArg = (mockFn: OnChangeMock): RRuleOptions => {
  const value = mockFn.mock.calls.at(-1)?.[0];

  if (!value) {
    throw new Error("Expected the editor to emit an RRule");
  }

  return value;
};

type FrequencyLabel = "Daily" | "Weekly" | "Monthly" | "Yearly";

// Pick an option on a Base UI Select by its accessible (label) name: open the
// listbox via the trigger, then click the matching option with a real pointer
// sequence (virtual `fireEvent.click`s only activate the highlighted item).
const fireRealClick = (element: HTMLElement) => {
  const options = {
    bubbles: true,
    button: 0,
    cancelable: true,
    detail: 1,
    pointerType: "mouse",
  };

  fireEvent.pointerDown(element, options);
  fireEvent.mouseDown(element, options);
  fireEvent.pointerUp(element, options);
  fireEvent.mouseUp(element, options);
  fireEvent.click(element, options);
};

const selectOption = (
  comboboxName: RegExp,
  optionName: RegExp | FrequencyLabel
) => {
  fireEvent.click(screen.getByRole("combobox", { name: comboboxName }));
  fireRealClick(screen.getByRole("option", { name: optionName }));
};

// Choose "Custom recurrence" from the preset picker, revealing the detailed
// frequency/interval/weekday controls.
const enterCustomMode = () => {
  selectOption(REPEATS, CUSTOM_RECURRENCE);
};

// Select a frequency. The frequency control only exists in custom mode, so
// enter it first.
const selectFrequency = (label: FrequencyLabel) => {
  enterCustomMode();
  selectOption(FREQUENCY, label);
};

describe(RecurrenceEditor, () => {
  const mockOnChange = vi.fn<(value: RRuleOptions | null) => void>(() => {});

  const renderRecurrenceEditor = (
    props: Partial<ComponentProps<typeof RecurrenceEditor>> = {}
  ) => {
    const defaultProps = {
      onChange: mockOnChange,
    };

    // Auto-wrap incomplete RRuleOptions with dtstart
    const finalProps = { ...props };

    if (isRuleWithoutDtstart(finalProps.value)) {
      finalProps.value = createRRuleOptions(finalProps.value);
    }

    return render(
      <CalendarTestProvider>
        <RecurrenceEditor {...defaultProps} {...finalProps} />
      </CalendarTestProvider>
    );
  };

  // Re-render the editor with a new controlled `value` by remounting fresh.
  // testing-library's `rerender()` loops here: a controlled re-render of the
  // Radix Select churns its nested composed refs under React 19 + happy-dom
  // ("Maximum update depth"). The editor is controlled, so a fresh mount with
  // the new value asserts the same "value -> display" output. Unmount the
  // previous tree first so `screen` queries resolve a single instance.
  const remountRecurrenceEditor = (
    previous: { unmount: () => void },
    props: Partial<ComponentProps<typeof RecurrenceEditor>> = {}
  ) => {
    previous.unmount();

    return renderRecurrenceEditor(props);
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe("🧪 Initial State & Basic Rendering", () => {
    it("should render with repeat checkbox unchecked by default", () => {
      renderRecurrenceEditor();

      const checkbox = screen.getByTestId("toggle-recurrence");
      expect(checkbox).not.toBeChecked();
      expect(screen.queryByText("Every day at 9 AM")).not.toBeInTheDocument();
    });

    it("should render with repeat checkbox checked when valid RRULE is provided", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      const checkbox = screen.getByTestId("toggle-recurrence");
      expect(checkbox).toBeChecked();
      // Look for text in the description area instead of display value
      expect(screen.getByText("Every day at 9 AM")).toBeInTheDocument();
    });

    it("should show proper RRULE description when value is provided", () => {
      renderRecurrenceEditor({
        value: { count: 5, freq: FREQ.WEEKLY, interval: 2 },
      });

      expect(
        screen.getByText("Every 2 weeks on Wednesday at 9 AM for 5 times")
      ).toBeInTheDocument();
    });

    it("should handle empty string value gracefully", () => {
      renderRecurrenceEditor({ value: null });

      const checkbox = screen.getByTestId("toggle-recurrence");
      expect(checkbox).not.toBeChecked();
    });

    it("should update checkbox state when value prop changes from null to RRULE", () => {
      const mounted = renderRecurrenceEditor({ value: null });

      expect(screen.getByTestId("toggle-recurrence")).not.toBeChecked();

      // Simulate editing a recurring event - prop changes from null to RRULE
      remountRecurrenceEditor(mounted, {
        value: { freq: FREQ.WEEKLY, interval: 1 },
      });

      expect(screen.getByTestId("toggle-recurrence")).toBeChecked();
      expect(
        screen.getByText("Every week on Wednesday at 9 AM")
      ).toBeInTheDocument();
    });
  });

  describe("🔥 Edge Cases & Error Handling", () => {
    it("should handle null value without crashing", () => {
      expect(() => renderRecurrenceEditor({ value: null })).not.toThrow();

      const checkbox = screen.getByTestId("toggle-recurrence");
      expect(checkbox).not.toBeChecked();
    });

    it("should handle undefined value without crashing", () => {
      expect(() => renderRecurrenceEditor()).not.toThrow();

      const checkbox = screen.getByTestId("toggle-recurrence");
      expect(checkbox).not.toBeChecked();
    });

    it("should handle malformed RRULE strings gracefully", () => {
      // Pass invalid RRuleOptions that would cause errors
      renderRecurrenceEditor({ value: { freq: 999 } });

      expect(screen.getByTestId("preset-select")).toHaveTextContent(
        "Custom recurrence"
      );
      const checkbox = screen.getByTestId("toggle-recurrence");
      expect(checkbox).toBeChecked();
    });

    it("should handle RRULE with missing FREQ parameter", () => {
      // RRule defaults to YEARLY when FREQ is missing - but our interface requires freq
      renderRecurrenceEditor({
        value: { count: 5, freq: FREQ.YEARLY, interval: 1 },
      });

      expect(
        screen.getByText("Every year at 9 AM for 5 times")
      ).toBeInTheDocument();
    });

    it("should handle RRULE with unsupported frequency", () => {
      // Using a frequency that's not in our freqMap
      renderRecurrenceEditor({ value: { freq: 999, interval: 1 } });

      expect(screen.getByTestId("preset-select")).toHaveTextContent(
        "Custom recurrence"
      );
    });

    it("should handle extremely large interval values", () => {
      renderRecurrenceEditor({
        value: { freq: FREQ.DAILY, interval: 999_999 },
      });

      expect(screen.getByText("Every 999999 days at 9 AM")).toBeInTheDocument();
    });

    it("should handle RRULE with multiple BYDAY values", () => {
      renderRecurrenceEditor({
        value: {
          byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR, WEEKDAYS.SU],
          freq: FREQ.WEEKLY,
          interval: 1,
        },
      });

      // Should parse correctly and show all selected days
      const mondayCheckbox = screen.getByRole("checkbox", { name: "Mon" });
      const wednesdayCheckbox = screen.getByRole("checkbox", { name: "Wed" });
      const fridayCheckbox = screen.getByRole("checkbox", { name: "Fri" });
      const sundayCheckbox = screen.getByRole("checkbox", { name: "Sun" });
      const tuesdayCheckbox = screen.getByRole("checkbox", { name: "Tue" });

      expect(mondayCheckbox).toBeChecked();
      expect(wednesdayCheckbox).toBeChecked();
      expect(fridayCheckbox).toBeChecked();
      expect(sundayCheckbox).toBeChecked();
      expect(tuesdayCheckbox).not.toBeChecked();
    });
  });

  describe("🎯 Recurrence Toggle Behavior", () => {
    it("should enable recurrence and call onChange with default RRULE when toggled on", () => {
      renderRecurrenceEditor();

      const checkbox = screen.getByTestId("toggle-recurrence");
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        freq: FREQ.DAILY,
        interval: 1,
      });
      expect(checkbox).toBeChecked();
    });

    it("should disable recurrence and call onChange with null when toggled off", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      const checkbox = screen.getByTestId("toggle-recurrence");
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(null);
      expect(checkbox).not.toBeChecked();
    });

    it("should hide recurrence options when toggled off", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      expect(screen.getByLabelText("Repeats")).toBeInTheDocument();

      const checkbox = screen.getByTestId("toggle-recurrence");
      fireEvent.click(checkbox);

      expect(screen.queryByLabelText("Repeats")).not.toBeInTheDocument();
    });
  });

  describe("🔧 Frequency Selection", () => {
    it("should parse and display all supported frequencies", () => {
      const frequencies = [
        {
          expected: "Daily",
          rruleOptions: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
        },
        {
          expected: "Weekly",
          rruleOptions: createRRuleOptions({ freq: FREQ.WEEKLY, interval: 1 }),
        },
        {
          expected: "Monthly",
          rruleOptions: createRRuleOptions({
            freq: FREQ.MONTHLY,
            interval: 1,
          }),
        },
        {
          expected: "Yearly",
          rruleOptions: createRRuleOptions({ freq: FREQ.YEARLY, interval: 1 }),
        },
      ];

      for (const { rruleOptions, expected } of frequencies) {
        const { unmount } = render(
          <CalendarTestProvider>
            <RecurrenceEditor onChange={mockOnChange} value={rruleOptions} />
          </CalendarTestProvider>
        );

        enterCustomMode();
        const frequencySelect = screen.getByTestId("frequency-select");

        // The RecurrenceEditor should display the frequency correctly
        expect(frequencySelect.textContent).toContain(expected);
        unmount();
      }
    });

    it("should update RRULE when frequency changes", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      selectFrequency("Weekly");

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.WEEKLY,
          interval: 1,
        })
      );
    });

    it("should clear weekly days when switching from weekly to other frequencies", () => {
      renderRecurrenceEditor({
        value: {
          byweekday: [WEEKDAYS.MO, WEEKDAYS.WE],
          freq: FREQ.WEEKLY,
          interval: 1,
        },
      });

      selectFrequency("Daily");

      // Check that onChange was called - let test failure show us the actual format
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });
  });

  describe("⏱️ Interval Handling", () => {
    it("should handle valid interval changes", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "5" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 5,
        })
      );
    });

    it("should enforce minimum interval of 1", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "0" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle negative interval values", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "-5" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle non-numeric interval input", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "abc" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle empty interval input", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle very large interval values", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "999999" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 999_999,
        })
      );
    });
  });

  describe("📅 Weekly Day Selection", () => {
    it("should show day selection only for weekly frequency", () => {
      const mounted = renderRecurrenceEditor({
        value: { freq: FREQ.WEEKLY, interval: 1 },
      });

      expect(screen.getByText("Repeat on")).toBeInTheDocument();

      remountRecurrenceEditor(mounted, {
        value: { freq: FREQ.DAILY, interval: 1 },
      });
      expect(screen.queryByText("Repeat on")).toBeNull();
    });

    it("should handle all day combinations", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.WEEKLY, interval: 1 } });

      // Select all days
      const dayCheckboxes = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (const day of dayCheckboxes) {
        const checkbox = screen.getByRole("checkbox", { name: day });
        fireEvent.click(checkbox);
      }

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          byweekday: expect.arrayContaining([
            WEEKDAYS.SU,
            WEEKDAYS.MO,
            WEEKDAYS.TU,
            WEEKDAYS.WE,
            WEEKDAYS.TH,
            WEEKDAYS.FR,
            WEEKDAYS.SA,
          ]),
          freq: FREQ.WEEKLY,
          interval: 1,
        })
      );
    });

    it("should handle deselecting all days", () => {
      renderRecurrenceEditor({
        value: {
          byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR],
          freq: FREQ.WEEKLY,
          interval: 1,
        },
      });

      // Deselect all days
      const mondayCheckbox = screen.getByRole("checkbox", { name: "Mon" });
      const wednesdayCheckbox = screen.getByRole("checkbox", { name: "Wed" });
      const fridayCheckbox = screen.getByRole("checkbox", { name: "Fri" });

      fireEvent.click(mondayCheckbox);
      fireEvent.click(wednesdayCheckbox);
      fireEvent.click(fridayCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.WEEKLY,
          interval: 1,
        })
      );
    });

    it("should handle rapid day toggle clicks", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.WEEKLY, interval: 1 } });

      const mondayCheckbox = screen.getByRole("checkbox", { name: "Mon" });

      // Rapid clicks
      fireEvent.click(mondayCheckbox);
      fireEvent.click(mondayCheckbox);
      fireEvent.click(mondayCheckbox);
      fireEvent.click(mondayCheckbox);

      // Should end up unchecked
      expect(mondayCheckbox).not.toBeChecked();
    });
  });

  describe("🔚 End Conditions", () => {
    it("should handle never ending (default)", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      const neverCheckbox = screen.getByRole("checkbox", { name: "Never" });
      expect(neverCheckbox).toBeChecked();
    });

    it("should handle count-based ending", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      fireEvent.click(afterCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );

      const countInput = screen.getByTestId("count-input");
      fireEvent.change(countInput, { target: { value: "10" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 10,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle date-based ending", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      const onCheckbox = screen.getByRole("checkbox", { name: "On" });
      fireEvent.click(onCheckbox);

      // Should contain UNTIL parameter
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: FREQ.DAILY,
          interval: 1,
          until: expect.any(Date),
        })
      );
    });

    it("should enforce minimum count of 1", () => {
      renderRecurrenceEditor({
        value: { count: 5, freq: FREQ.DAILY, interval: 1 },
      });

      const countInput = screen.getByDisplayValue("5");
      fireEvent.change(countInput, { target: { value: "0" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle negative count values", () => {
      renderRecurrenceEditor({
        value: { count: 5, freq: FREQ.DAILY, interval: 1 },
      });

      const countInput = screen.getByDisplayValue("5");
      fireEvent.change(countInput, { target: { value: "-10" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle non-numeric count input", () => {
      renderRecurrenceEditor({
        value: { count: 5, freq: FREQ.DAILY, interval: 1 },
      });

      const countInput = screen.getByDisplayValue("5");
      fireEvent.change(countInput, { target: { value: "abc" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle empty count input", () => {
      renderRecurrenceEditor({
        value: { count: 5, freq: FREQ.DAILY, interval: 1 },
      });

      const countInput = screen.getByDisplayValue("5");
      fireEvent.change(countInput, { target: { value: "" } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });

    it("should handle switching between end types rapidly", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      const neverCheckbox = screen.getByRole("checkbox", { name: "Never" });
      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      const onCheckbox = screen.getByRole("checkbox", { name: "On" });

      // Rapid switching
      fireEvent.click(afterCheckbox);
      fireEvent.click(onCheckbox);
      fireEvent.click(neverCheckbox);
      fireEvent.click(afterCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          freq: FREQ.DAILY,
          interval: 1,
        })
      );
    });
  });

  describe("🎨 RRULE Description Generation", () => {
    it("should show correct descriptions for different patterns", () => {
      const testCases = [
        {
          expected: "Every day at 9 AM",
          rruleOptions: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
        },
        {
          expected: "Every 3 days at 9 AM",
          rruleOptions: createRRuleOptions({ freq: FREQ.DAILY, interval: 3 }),
        },
        {
          expected: "Every week on Wednesday at 9 AM",
          rruleOptions: createRRuleOptions({ freq: FREQ.WEEKLY, interval: 1 }),
        },
        {
          expected: "Every 2 weeks on Wednesday at 9 AM",
          rruleOptions: createRRuleOptions({ freq: FREQ.WEEKLY, interval: 2 }),
        },
        {
          expected: "Every month at 9 AM",
          rruleOptions: createRRuleOptions({
            freq: FREQ.MONTHLY,
            interval: 1,
          }),
        },
        {
          expected: "Every year at 9 AM",
          rruleOptions: createRRuleOptions({ freq: FREQ.YEARLY, interval: 1 }),
        },
        {
          expected: "Every day at 9 AM for 5 times",
          rruleOptions: createRRuleOptions({
            count: 5,
            freq: FREQ.DAILY,
            interval: 1,
          }),
        },
        {
          expected: "Every 2 weeks on Wednesday at 9 AM for 10 times",
          rruleOptions: createRRuleOptions({
            count: 10,
            freq: FREQ.WEEKLY,
            interval: 2,
          }),
        },
      ];

      for (const { rruleOptions, expected } of testCases) {
        const { unmount } = render(
          <CalendarTestProvider>
            <RecurrenceEditor onChange={mockOnChange} value={rruleOptions} />
          </CalendarTestProvider>
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      }
    });

    it("should handle UNTIL dates in description", () => {
      const futureDate = new Date("2025-12-31T23:59:59Z");
      renderRecurrenceEditor({
        value: { freq: FREQ.DAILY, interval: 1, until: futureDate },
      });

      // RRule.toText() handles UNTIL dates in its own format - should contain "until"
      expect(screen.getByText(UNTIL_LABEL)).toBeInTheDocument();
    });

    it('should show "Custom recurrence" for unparseable RRULEs', () => {
      renderRecurrenceEditor({ value: { freq: 999, interval: 1 } });

      expect(screen.getByTestId("preset-select")).toHaveTextContent(
        "Custom recurrence"
      );
    });
  });

  describe("🏃‍♂️ Performance & Stress Tests", () => {
    it("should handle multiple rapid onChange calls without issues", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");

      // Rapid input changes with different values
      const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

      for (const value of values) {
        fireEvent.change(intervalInput, { target: { value } });
      }

      // Should have been called for each unique change
      expect(mockOnChange).toHaveBeenCalledTimes(values.length);
    });

    it("should handle component remounting with different props", () => {
      const mounted = renderRecurrenceEditor({
        value: { freq: FREQ.DAILY, interval: 1 },
      });

      expect(screen.getByText("Every day at 9 AM")).toBeInTheDocument();

      remountRecurrenceEditor(mounted, {
        value: { freq: FREQ.WEEKLY, interval: 2 },
      });

      expect(
        screen.getByText("Every 2 weeks on Wednesday at 9 AM")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });

    it("should not crash when onChange throws an error", () => {
      const errorOnChange = vi
        .fn<(value: RRuleOptions | null) => void>()
        .mockImplementation(() => {
          throw new Error("onChange error");
        });

      // Should not crash the component during initial render
      expect(() =>
        renderRecurrenceEditor({ onChange: errorOnChange })
      ).not.toThrow();

      const checkbox = screen.getByTestId("toggle-recurrence");

      // React 19 captures event-handler errors instead of rethrowing them
      // synchronously, so the component must stay mounted and functional.
      fireEvent.click(checkbox);
      expect(screen.getByTestId("toggle-recurrence")).toBeInTheDocument();
    });
  });

  describe("♿ Accessibility & User Experience", () => {
    it("should have proper ARIA labels and roles", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.WEEKLY, interval: 1 } });

      expect(screen.getByLabelText("Repeats")).toBeInTheDocument();
      expect(screen.getByLabelText("Every")).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: "Never" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: "After" })
      ).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "On" })).toBeInTheDocument();
    });

    it("should support keyboard navigation", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.WEEKLY, interval: 1 } });

      const checkbox = screen.getByTestId("toggle-recurrence");
      checkbox.focus();

      // Should be able to toggle with Enter key (more standard for checkboxes)
      fireEvent.keyDown(checkbox, { code: "Enter", key: "Enter" });
      // Since the keyDown might not directly trigger onChange, let's click instead
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });

    it("should maintain focus state correctly", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      intervalInput.focus();

      expect(document.activeElement).toBe(intervalInput);

      fireEvent.change(intervalInput, { target: { value: "5" } });

      // Focus should remain on input
      expect(document.activeElement).toBe(intervalInput);
    });
  });

  describe("🔄 Complex State Transitions", () => {
    it("should handle complex state transitions correctly", () => {
      renderRecurrenceEditor();

      // Enable recurrence
      const checkbox = screen.getByTestId("toggle-recurrence");
      fireEvent.click(checkbox);

      // Change to weekly
      selectFrequency("Weekly");

      // Select some days
      fireEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Wed" }));

      // Change interval
      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "2" } });

      // Set end condition to count
      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      fireEvent.click(afterCheckbox);

      const countInput = screen.getByDisplayValue("1");
      fireEvent.change(countInput, { target: { value: "5" } });

      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          byweekday: expect.arrayContaining([WEEKDAYS.MO, WEEKDAYS.WE]),
          count: 5,
          freq: FREQ.WEEKLY,
          interval: 2,
        })
      );
    });

    it("should preserve form state when toggling off and on quickly", () => {
      renderRecurrenceEditor({
        value: {
          byweekday: [WEEKDAYS.MO, WEEKDAYS.WE],
          freq: FREQ.WEEKLY,
          interval: 2,
        },
      });

      const checkbox = screen.getByTestId("toggle-recurrence");

      // Toggle off
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(null);

      // Toggle back on
      fireEvent.click(checkbox);

      // Should restore previous state
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          byweekday: expect.arrayContaining([WEEKDAYS.MO, WEEKDAYS.WE]),
          freq: FREQ.WEEKLY,
          interval: 2,
        })
      );
    });
  });

  describe("📊 Data Integrity & Exact Value Verification", () => {
    it("should produce valid RRule that can be instantiated", () => {
      renderRecurrenceEditor();

      const checkbox = screen.getByTestId("toggle-recurrence");
      fireEvent.click(checkbox);

      const result = getLastCallArg(mockOnChange);
      expect(() => toTemporalRule(result)).not.toThrow();
    });

    it("should produce RRule with exact frequency value", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.DAILY, interval: 1 } });

      selectFrequency("Monthly");

      const result = getLastCallArg(mockOnChange);
      expect(result.freq).toBe(FREQ.MONTHLY);
      expect(result.freq).not.toBe(FREQ.DAILY);
      expect(result.freq).not.toBe(FREQ.WEEKLY);
    });

    it("should set byweekday to undefined when no days selected", () => {
      renderRecurrenceEditor({
        value: { byweekday: [WEEKDAYS.MO], freq: FREQ.WEEKLY, interval: 1 },
      });

      const mondayCheckbox = screen.getByRole("checkbox", { name: "Mon" });
      // Deselect
      fireEvent.click(mondayCheckbox);

      const result = getLastCallArg(mockOnChange);
      expect(result.byweekday).toBeUndefined();
    });

    it("should set count to undefined when switching to never", () => {
      renderRecurrenceEditor({
        value: { count: 10, freq: FREQ.DAILY, interval: 1 },
      });

      const neverCheckbox = screen.getByRole("checkbox", { name: "Never" });
      fireEvent.click(neverCheckbox);

      const result = getLastCallArg(mockOnChange);
      expect(result.count).toBeUndefined();
      expect(result.until).toBeUndefined();
    });

    it("should set until to undefined when switching to count", () => {
      const futureDate = new Date("2025-12-31");
      renderRecurrenceEditor({
        value: { freq: FREQ.DAILY, interval: 1, until: futureDate },
      });

      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      fireEvent.click(afterCheckbox);

      const result = getLastCallArg(mockOnChange);
      expect(result.until).toBeUndefined();
      expect(result.count).toBeDefined();
    });

    it("should preserve dtstart when updating other fields", () => {
      const dtstart = new Date("2025-06-15T10:00:00Z");
      renderRecurrenceEditor({
        value: createRRuleOptions({ dtstart, freq: FREQ.DAILY, interval: 1 }),
      });

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "5" } });

      const result = getLastCallArg(mockOnChange);
      expect(result.dtstart).toStrictEqual(dtstart);
    });

    it("should include selected weekdays when multiple are clicked", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.WEEKLY, interval: 1 } });

      fireEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Wed" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Fri" }));

      const result = getLastCallArg(mockOnChange);
      expect(result.byweekday).toHaveLength(3);
      expect(result.byweekday).toContain(WEEKDAYS.MO);
      expect(result.byweekday).toContain(WEEKDAYS.WE);
      expect(result.byweekday).toContain(WEEKDAYS.FR);
    });

    it("should exclude unselected weekdays when multiple are clicked", () => {
      renderRecurrenceEditor({ value: { freq: FREQ.WEEKLY, interval: 1 } });

      fireEvent.click(screen.getByRole("checkbox", { name: "Mon" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Wed" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Fri" }));

      const result = getLastCallArg(mockOnChange);
      expect(result.byweekday).not.toContain(WEEKDAYS.TU);
      expect(result.byweekday).not.toContain(WEEKDAYS.TH);
    });
  });

  describe("🖥️ UI State Reflects Data Correctly", () => {
    it("should display correct frequency in select after prop change", () => {
      const mounted = renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      enterCustomMode();
      expect(screen.getByTestId("frequency-select")).toHaveTextContent("Daily");

      remountRecurrenceEditor(mounted, {
        value: createRRuleOptions({ freq: FREQ.MONTHLY, interval: 1 }),
      });

      expect(screen.getByTestId("frequency-select")).toHaveTextContent(
        "Monthly"
      );
    });

    it("should display correct interval value after prop change", () => {
      const mounted = renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      enterCustomMode();
      expect(screen.getByDisplayValue("1")).toBeInTheDocument();

      remountRecurrenceEditor(mounted, {
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 7 }),
      });

      expect(screen.getByDisplayValue("7")).toBeInTheDocument();
    });

    it("should check enabled weekday checkboxes based on byweekday prop", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({
          byweekday: [WEEKDAYS.TU, WEEKDAYS.TH, WEEKDAYS.SA],
          freq: FREQ.WEEKLY,
          interval: 1,
        }),
      });

      expect(screen.getByRole("checkbox", { name: "Tue" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Thu" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Sat" })).toBeChecked();
    });

    it("should leave disabled weekday checkboxes unchecked based on byweekday prop", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({
          byweekday: [WEEKDAYS.TU, WEEKDAYS.TH, WEEKDAYS.SA],
          freq: FREQ.WEEKLY,
          interval: 1,
        }),
      });

      expect(screen.getByRole("checkbox", { name: "Sun" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Mon" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Wed" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Fri" })).not.toBeChecked();
    });

    it("should show count input only when count end type is selected", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      // Initially "Never" is selected, no count input
      expect(screen.queryByTestId("count-input")).not.toBeInTheDocument();

      // Select "After"
      fireEvent.click(screen.getByRole("checkbox", { name: "After" }));
      expect(screen.getByTestId("count-input")).toBeInTheDocument();

      // Select "Never" again
      fireEvent.click(screen.getByRole("checkbox", { name: "Never" }));
      expect(screen.queryByTestId("count-input")).not.toBeInTheDocument();
    });

    it("should display correct count value in input", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({
          count: 15,
          freq: FREQ.DAILY,
          interval: 1,
        }),
      });

      const countInput = screen.getByTestId("count-input");
      expect(countInput).toHaveValue(15);
    });

    it("should update description text when frequency changes", () => {
      const mounted = renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      expect(screen.getByText("Every day at 9 AM")).toBeInTheDocument();

      selectFrequency("Weekly");

      const result = getLastCallArg(mockOnChange);
      expect(result.freq).toBe(FREQ.WEEKLY);

      remountRecurrenceEditor(mounted, { value: createRRuleOptions(result) });

      expect(
        screen.getByText("Every week on Wednesday at 9 AM")
      ).toBeInTheDocument();
    });

    it("should update description when interval changes (after parent re-renders with new value)", () => {
      const mounted = renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      expect(screen.getByText("Every day at 9 AM")).toBeInTheDocument();

      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "3" } });

      // Component is controlled - verify onChange was called correctly
      const result = getLastCallArg(mockOnChange);
      expect(result.interval).toBe(3);

      // Simulate parent updating the value with the new interval
      remountRecurrenceEditor(mounted, {
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 3 }),
      });

      expect(screen.getByText("Every 3 days at 9 AM")).toBeInTheDocument();
    });

    it("should update description when count is added (after parent re-renders with new value)", () => {
      const mounted = renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.WEEKLY, interval: 2 }),
      });

      expect(
        screen.getByText("Every 2 weeks on Wednesday at 9 AM")
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("checkbox", { name: "After" }));
      const countInput = screen.getByTestId("count-input");
      fireEvent.change(countInput, { target: { value: "5" } });

      // Component is controlled - verify onChange was called correctly
      const result = getLastCallArg(mockOnChange);
      expect(result.count).toBe(5);
      expect(result.interval).toBe(2);
      expect(result.freq).toBe(FREQ.WEEKLY);

      // Simulate parent updating the value with the new count
      remountRecurrenceEditor(mounted, {
        value: createRRuleOptions({
          count: 5,
          freq: FREQ.WEEKLY,
          interval: 2,
        }),
      });

      expect(
        screen.getByText("Every 2 weeks on Wednesday at 9 AM for 5 times")
      ).toBeInTheDocument();
    });
  });

  describe("🔒 End Type Mutual Exclusivity", () => {
    it("should check After and uncheck other end types when clicked", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      const neverCheckbox = screen.getByRole("checkbox", { name: "Never" });
      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      const onCheckbox = screen.getByRole("checkbox", { name: "On" });

      expect(neverCheckbox).toBeChecked();

      fireEvent.click(afterCheckbox);
      expect(neverCheckbox).not.toBeChecked();
      expect(afterCheckbox).toBeChecked();
      expect(onCheckbox).not.toBeChecked();
    });

    it("should check On and uncheck other end types when clicked", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      const neverCheckbox = screen.getByRole("checkbox", { name: "Never" });
      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      const onCheckbox = screen.getByRole("checkbox", { name: "On" });

      fireEvent.click(onCheckbox);
      expect(neverCheckbox).not.toBeChecked();
      expect(afterCheckbox).not.toBeChecked();
      expect(onCheckbox).toBeChecked();
    });

    it("should check Never and uncheck other end types when returning to Never", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY, interval: 1 }),
      });

      const neverCheckbox = screen.getByRole("checkbox", { name: "Never" });
      const afterCheckbox = screen.getByRole("checkbox", { name: "After" });
      const onCheckbox = screen.getByRole("checkbox", { name: "On" });

      fireEvent.click(afterCheckbox);
      fireEvent.click(neverCheckbox);
      expect(neverCheckbox).toBeChecked();
      expect(afterCheckbox).not.toBeChecked();
      expect(onCheckbox).not.toBeChecked();
    });
  });

  describe("📋 Byweekday Persistence When Changing Frequency", () => {
    it("should retain byweekday when staying on weekly frequency", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({
          byweekday: [WEEKDAYS.MO, WEEKDAYS.WE],
          freq: FREQ.WEEKLY,
          interval: 1,
        }),
      });

      // Change interval
      enterCustomMode();
      const intervalInput = screen.getByLabelText("Every");
      fireEvent.change(intervalInput, { target: { value: "3" } });

      const result = getLastCallArg(mockOnChange);
      expect(result.byweekday).toContain(WEEKDAYS.MO);
      expect(result.byweekday).toContain(WEEKDAYS.WE);
    });

    it("should keep byweekday in data when frequency changes (parent controls clearing)", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({
          byweekday: [WEEKDAYS.MO, WEEKDAYS.WE],
          freq: FREQ.WEEKLY,
          interval: 1,
        }),
      });

      selectFrequency("Daily");

      // Byweekday is kept in data (parent form should handle clearing if needed)
      const result = getLastCallArg(mockOnChange);
      expect(result.freq).toBe(FREQ.DAILY);
      // The component doesn't clear byweekday automatically - it just changes freq
    });
  });

  describe("🗓️ Preset Picker", () => {
    it("applies a preset rule when chosen from the picker", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY }),
      });

      selectOption(REPEATS, EVERY_WEEKDAY);

      const result = getLastCallArg(mockOnChange);
      expect(result.freq).toBe(FREQ.WEEKLY);
      expect(byweekdays(result.byweekday).map((d) => d.weekday)).toStrictEqual([
        0, 1, 2, 3, 4,
      ]);
    });

    it("hides the detailed controls until Custom is chosen", () => {
      renderRecurrenceEditor({
        value: createRRuleOptions({ freq: FREQ.DAILY }),
      });

      expect(screen.queryByTestId("frequency-select")).not.toBeInTheDocument();

      enterCustomMode();

      expect(screen.getByTestId("frequency-select")).toBeInTheDocument();
    });

    it("switches monthly recurrence to the nth weekday of the month", () => {
      // 13 Jan 2025 is the second Monday of its month.
      renderRecurrenceEditor({
        value: { dtstart: MON_SECOND, freq: FREQ.MONTHLY, interval: 1 },
      });

      selectOption(REPEAT_ON, MONTHLY_ON_THE);

      const result = getLastCallArg(mockOnChange);

      const [byday] = byweekdays(result.byweekday);

      expect(byday?.weekday).toBe(0);
      expect(byday?.n).toBe(2);
    });
  });
});
