import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecurrenceFormSection } from "@/plugins/recurrence/components/recurrence-form-section";
import { FREQ } from "@/plugins/recurrence/utils/recurrence-constants";
import { CalendarTestProvider } from "@/testing/index";
import type { CalendarEvent } from "@/types/index";

describe(RecurrenceFormSection, () => {
  it("enables recurrence without throwing when the event has no start", () => {
    const onChange = vi.fn<(updates: Partial<CalendarEvent>) => void>(() => {});

    // A draft event that has no `start` yet (selectedEvent can be incomplete).
    const event: Partial<CalendarEvent> = {
      id: "draft",
      title: "No start yet",
    };

    render(
      <CalendarTestProvider>
        <RecurrenceFormSection event={event} onChange={onChange} />
      </CalendarTestProvider>
    );

    // Toggling recurrence on emits a default rule with no dtstart, which the
    // form section anchors to event.start. With no start, that must not throw.
    const toggle = screen.getByTestId("toggle-recurrence");
    expect(() => fireEvent.click(toggle)).not.toThrow();
    expect(onChange).toHaveBeenCalledWith({
      rrule: { freq: FREQ.DAILY, interval: 1 },
    });
  });
});
