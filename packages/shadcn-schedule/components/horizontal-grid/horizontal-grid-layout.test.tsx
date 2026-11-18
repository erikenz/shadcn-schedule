import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { HorizontalGrid } from "@/components/horizontal-grid/horizontal-grid";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { format, toZonedDateTime } from "@/utils/temporal";

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

const mockRows = [
  {
    columns: [
      {
        day: initialDate,
        gridType: "day" as const,
        id: "col-1",
      },
    ],
    id: "row-1",
    resource: { color: "blue", id: "row-1", title: "Row 1" },
    title: "Row 1",
  },
];

const renderGrid = () =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={[]}
      initialDate={initialDate}
      resources={[]}
    >
      <HorizontalGrid rows={mockRows}>
        <div>Header</div>
      </HorizontalGrid>
    </CalendarProvider>
  );

describe("HorizontalGrid Layout Regression", () => {
  beforeEach(() => {
    cleanup();
  });

  it("HorizontalGridRow should NOT have min-h-[60px] constraint to allow expansion", () => {
    renderGrid();
    const row = screen.getByTestId("horizontal-row-row-1");

    // The row should be fluid. If we have min-h-[60px] here, it fighting the cell's expansion.
    expect(row.className).not.toContain("min-h-[60px]");
    expect(row.className).toContain("flex-1");
  });

  it("GridCell (DroppableCell) SHOULD have min-h-[60px] to maintain default cell structure", () => {
    renderGrid();

    const cell = screen.getByTestId(
      `day-cell-${format(initialDate, "YYYY-MM-DD")}`
    );

    // The cell itself should have the min-height to ensure the grid doesn't collapse to 0 when empty.
    expect(cell.className).toContain("min-h-[60px]");
  });

  it("GridCell content container should match parent dimensions (h-full w-full)", () => {
    renderGrid();
    const content = screen.getByTestId("grid-cell-content");

    // This ensures the content fills the potentially expanded row height and matches parent width.
    expect(content.className).toContain("h-full");
    expect(content.className).toContain("w-full");
  });

  it("ResourceCell should have h-full to stretch with row expansion", () => {
    renderGrid();
    const resourceCell = screen.getByTestId("horizontal-row-label-row-1");

    expect(resourceCell.className).toContain("h-full");
  });
});
