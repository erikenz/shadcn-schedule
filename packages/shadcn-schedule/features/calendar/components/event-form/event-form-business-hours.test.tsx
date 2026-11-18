/// <reference types="@testing-library/jest-dom" />

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { EventForm } from "@/features/calendar/components/event-form/event-form";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { textOr } from "@/lib/guards";
import type { CalendarEvent, Resource } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

const handleClose = () => {};

const DAY_5 = /^5$/u;
const DAY_6 = /^6$/u;

const mockResources: Resource[] = [
  {
    businessHours: { daysOfWeek: ["monday"], endTime: 16, startTime: 10 },
    id: "R1",
    title: "Resource 1",
  },
];

const renderMondayEventForm = () => {
  const monday = toZonedDateTime("2025-01-06T12:00:00.000Z");

  const selectedEvent: CalendarEvent = {
    end: monday.add({ hours: 1 }),
    id: "1",
    resourceId: "R1",
    start: monday,
    title: "Test Event",
  };

  render(
    <CalendarProvider
      dayMaxEvents={3}
      initialDate={monday}
      resources={mockResources}
    >
      <EventForm onClose={handleClose} selectedEvent={selectedEvent} />
    </CalendarProvider>
  );
};

describe("EventForm Resource Business Hours", () => {
  beforeEach(() => {
    cleanup();
  });

  // Render the form for an R1 event on Monday noon — shared construction.

  it("respects resource-specific business hours for time constraints", () => {
    renderMondayEventForm();

    const startTimeButton = screen.getByTestId("time-picker-start-time");
    expect(startTimeButton).toBeInTheDocument();
    expect(startTimeButton).toHaveTextContent("12:00 PM");
  });

  it("DatePicker disables non-business days for the assigned resource", async () => {
    renderMondayEventForm();

    // Find the button showing the date
    const startDateSection = screen.getByText("Start Date").parentElement;
    const startDateButton = startDateSection?.querySelector("button");

    if (!startDateButton) {
      throw new Error("Could not find start date button");
    }

    fireEvent.click(startDateButton);

    // Wait for the calendar to appear
    const grid = await screen.findByRole("table");
    expect(grid).toBeInTheDocument();

    // Sunday (Jan 5) should be disabled for R1
    // Use exact match for the day number to avoid matching 15, 25
    const day5 = screen.getByRole("button", { name: DAY_5 });
    expect(day5.dataset.disabled).toBe("true");

    // Monday (Jan 6) should be enabled
    const day6 = screen.getByRole("button", { name: DAY_6 });
    expect(textOr(day6.getAttribute("aria-disabled"), "false")).toBe("false");
  });
});
