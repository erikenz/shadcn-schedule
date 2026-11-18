import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { VerticalGrid } from "@/components/vertical-grid/vertical-grid";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { toZonedDateTime } from "@/utils/temporal";

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const mockColumns = [
  {
    day: initialDate,
    days: [initialDate.with({ hour: 9 }), initialDate.with({ hour: 10 })],
    id: "col-1",
  },
];

const renderVerticalGrid = (props = {}) =>
  render(
    <CalendarProvider dayMaxEvents={3} initialDate={initialDate}>
      <VerticalGrid columns={mockColumns} {...props}>
        <div data-testid="grid-children">Header Content</div>
      </VerticalGrid>
    </CalendarProvider>
  );

describe(VerticalGrid, () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders base structure correctly", () => {
    renderVerticalGrid();

    expect(screen.getByTestId("vertical-grid-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-grid-header")).toBeInTheDocument();
    expect(screen.getByTestId("vertical-grid-body")).toBeInTheDocument();
    expect(screen.getByTestId("grid-children")).toHaveTextContent(
      "Header Content"
    );
  });

  it("renders columns", () => {
    renderVerticalGrid();
    expect(screen.getByTestId("vertical-col-col-1")).toBeInTheDocument();
  });

  it("renders all-day row when provided", () => {
    renderVerticalGrid({
      allDayRow: <div data-testid="mock-all-day">All Day Row</div>,
    });

    expect(screen.getByTestId("vertical-grid-all-day")).toBeInTheDocument();
    expect(screen.getByTestId("mock-all-day")).toHaveTextContent("All Day Row");
  });

  it("applies custom classes", () => {
    renderVerticalGrid({
      allDayRow: <div>All Day</div>,
      classes: {
        allDay: "custom-allday-class",
        body: "custom-body-class",
        header: "custom-header-class",
      },
    });

    expect(screen.getByTestId("vertical-grid-header")).toHaveClass(
      "custom-header-class"
    );
    expect(screen.getByTestId("vertical-grid-body")).toHaveClass(
      "custom-body-class"
    );
    expect(screen.getByTestId("vertical-grid-all-day")).toHaveClass(
      "custom-allday-class"
    );
  });

  it("container uses flex column layout for scroll containment", () => {
    renderVerticalGrid();

    const container = screen.getByTestId("vertical-grid-container");
    expect(container.className).toContain("flex");
    expect(container.className).toContain("flex-col");
  });

  it("scroll area is present for regular variant", () => {
    renderVerticalGrid({ variant: "regular" });

    const scrollArea = screen.getByTestId("vertical-grid-scroll");
    expect(scrollArea).toBeInTheDocument();
  });

  it("all-day row container has minimum height", () => {
    renderVerticalGrid({
      allDayRow: <div data-testid="mock-all-day">All Day</div>,
    });

    const allDayContainer = screen.getByTestId("vertical-grid-all-day");
    expect(allDayContainer.className).toContain("min-h-12");
  });
});
