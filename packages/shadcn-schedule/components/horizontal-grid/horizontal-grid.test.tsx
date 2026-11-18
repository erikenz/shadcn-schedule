import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { HorizontalGrid } from "@/components/horizontal-grid/horizontal-grid";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { Resource } from "@/types/index";
import { format, now, toISOString, toZonedDateTime } from "@/utils/temporal";

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");
const mockDays = [initialDate, initialDate.add({ days: 1 })] as const;

const mockRows = [
  {
    columns: [
      {
        day: now(),
        gridType: "day" as const,
        id: "label-col",
        renderCell: ({ resource }: { resource?: Resource }) => (
          <div data-testid={`horizontal-row-label-${resource?.id}`}>
            {resource?.title}
          </div>
        ),
      },
      ...mockDays.map((day) => ({
        day,
        gridType: "day" as const,
        id: `col-${toISOString(day)}`,
      })),
    ],
    id: "res-1",
    resource: { color: "blue", id: "res-1", title: "Resource 1" },
    title: "Resource 1",
  },
];

const renderHorizontalGrid = (props = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      events={[]}
      initialDate={initialDate}
      resources={[]}
    >
      <HorizontalGrid rows={mockRows} {...props}>
        <div data-testid="grid-children">Header Content</div>
      </HorizontalGrid>
    </CalendarProvider>
  );

describe(HorizontalGrid, () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders base structure correctly", () => {
    renderHorizontalGrid();

    expect(screen.getByTestId("horizontal-grid-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("horizontal-grid-header")).toBeInTheDocument();
    expect(screen.getByTestId("horizontal-grid-body")).toBeInTheDocument();
    expect(screen.getByTestId("grid-children")).toHaveTextContent(
      "Header Content"
    );
  });

  it("renders rows and labels", () => {
    renderHorizontalGrid();
    expect(screen.getByTestId("horizontal-row-res-1")).toBeInTheDocument();
    expect(screen.getByTestId("horizontal-row-label-res-1")).toHaveTextContent(
      "Resource 1"
    );
  });

  it("renders cells in rows", () => {
    renderHorizontalGrid();

    // GridCell by default has data-testid="day-cell-{YYYY-MM-DD}"

    expect(
      screen.getByTestId(`day-cell-${format(mockDays[0], "YYYY-MM-DD")}`)
    ).toBeInTheDocument();

    expect(
      screen.getByTestId(`day-cell-${format(mockDays[1], "YYYY-MM-DD")}`)
    ).toBeInTheDocument();
  });

  it("applies custom classes", () => {
    renderHorizontalGrid({
      classes: {
        body: "custom-body-class",
        header: "custom-header-class",
      },
    });

    expect(screen.getByTestId("horizontal-grid-header")).toHaveClass(
      "custom-header-class"
    );
    expect(screen.getByTestId("horizontal-grid-body")).toHaveClass(
      "custom-body-class"
    );
  });
});
