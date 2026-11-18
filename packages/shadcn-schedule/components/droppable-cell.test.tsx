import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DroppableCell } from "@/components/droppable-cell";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { CellInfo } from "@/features/calendar/types/index";
import { clickCellSlot } from "@/test-utils/cell-interactions";
import type { CalendarView, Resource } from "@/types/index";
import { toISOString, toZonedDateTime } from "@/utils/temporal";

const initialDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

interface RenderCellOptions {
  allDay?: boolean;
  getCellClassName?: (info: CellInfo) => string;
  // Cell props
  hour?: number;
  isCellDisabled?: (info: CellInfo) => boolean;
  minute?: number;
  handleCellClick?: (info: CellInfo) => void;
  resourceId?: string | number;
  resources?: Resource[];
  // Calendar (provider) props
  view?: CalendarView;
}

// One CalendarProvider + DroppableCell setup for every test; pass only the
// calendar/cell props the case under test varies. The cell's testid is "cell".
const renderCell = (opts: RenderCellOptions = {}) =>
  render(
    <CalendarProvider
      dayMaxEvents={3}
      getCellClassName={opts.getCellClassName}
      initialDate={initialDate}
      initialView={opts.view ?? "month"}
      isCellDisabled={opts.isCellDisabled}
      onCellClick={opts.handleCellClick}
      resources={opts.resources}
    >
      <DroppableCell
        allDay={opts.allDay}
        data-testid="cell"
        date={initialDate}
        hour={opts.hour}
        id="test-cell"
        minute={opts.minute}
        resourceId={opts.resourceId}
        type="day-cell"
      />
    </CalendarProvider>
  );

describe("DroppableCell data-view attribute", () => {
  beforeEach(() => {
    cleanup();
  });

  const views: CalendarView[] = ["month", "week", "day", "year"];

  it.each(views)(
    'should render data-view="%s" attribute from context',
    (view) => {
      renderCell({ view });

      expect(screen.getByTestId("cell").dataset.view).toBe(view);
    }
  );
});

describe("DroppableCell isCellDisabled (issue #79)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("marks the cell disabled when isCellDisabled returns true", () => {
    renderCell({ isCellDisabled: () => true });

    expect(screen.getByTestId("cell").dataset.disabled).toBe("true");
  });

  it("leaves the cell enabled when isCellDisabled returns false", () => {
    renderCell({ isCellDisabled: () => false });

    expect(screen.getByTestId("cell").dataset.disabled).toBe("false");
  });

  it("does not call onCellClick when the cell is disabled", () => {
    const handleCellClick = vi.fn<(info: CellInfo) => void>();
    renderCell({ handleCellClick, isCellDisabled: () => true });

    clickCellSlot(screen.getByTestId("cell"));

    expect(handleCellClick).toHaveBeenCalledTimes(0);
  });

  it("calls onCellClick when the cell is not disabled", () => {
    const handleCellClick = vi.fn<(info: CellInfo) => void>();
    renderCell({ handleCellClick, isCellDisabled: () => false });

    clickCellSlot(screen.getByTestId("cell"));

    expect(handleCellClick).toHaveBeenCalledOnce();
  });

  it("passes the cell start/end range to isCellDisabled", () => {
    let received: CellInfo | undefined;
    renderCell({
      isCellDisabled: (info) => {
        received = info;

        return false;
      },
    });

    // Month day-cell spans the full day.
    expect(received ? toISOString(received.start) : undefined).toBe(
      "2025-01-01T00:00:00.000Z"
    );
    expect(received?.end.hour).toBe(23);
    expect(received?.end.minute).toBe(59);
  });

  it("regular calendar leaves info.resource undefined", () => {
    let received: CellInfo | undefined;
    renderCell({
      isCellDisabled: (info) => {
        received = info;

        return false;
      },
    });

    expect(received?.resource).toBeUndefined();
  });

  it("resource calendar resolves the full resource into info.resource", () => {
    const room: Resource = { id: "room-a", title: "Conference Room A" };
    let received: CellInfo | undefined;

    renderCell({
      isCellDisabled: (info) => {
        received = info;

        return false;
      },
      resourceId: "room-a",
      resources: [room],
    });

    expect(received?.resource).toStrictEqual(room);
    expect(received?.resource?.id).toBe("room-a");
  });
});

describe("DroppableCell self-describing attributes (drag-create)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("exposes a full-day range on a day cell (no hour)", () => {
    renderCell();

    const cell = screen.getByTestId("cell");
    expect(cell.dataset.start).toBe(
      toISOString(initialDate.with({ hour: 0, minute: 0 }))
    );
    expect(cell.dataset.end).toBe(
      toISOString(initialDate.with({ hour: 23, minute: 59 }))
    );
  });

  it("exposes a one-hour range on an hour cell", () => {
    renderCell({ hour: 9 });

    const cell = screen.getByTestId("cell");
    expect(cell.dataset.start).toBe(
      toISOString(initialDate.with({ hour: 9, minute: 0 }))
    );
    expect(cell.dataset.end).toBe(
      toISOString(initialDate.with({ hour: 10, minute: 0 }))
    );
  });

  it("exposes a 15-minute range on a minute cell", () => {
    renderCell({ hour: 9, minute: 15 });

    const cell = screen.getByTestId("cell");
    expect(cell.dataset.start).toBe(
      toISOString(initialDate.with({ hour: 9, minute: 15 }))
    );
    expect(cell.dataset.end).toBe(
      toISOString(initialDate.with({ hour: 9, minute: 30 }))
    );
  });

  it("exposes data-resource-id when the cell has a resourceId", () => {
    renderCell({ resourceId: "room-a" });

    expect(screen.getByTestId("cell").dataset.resourceId).toBe("room-a");
  });

  it("omits data-resource-id when the cell has no resource", () => {
    renderCell();

    expect(
      Object.hasOwn(screen.getByTestId("cell").dataset, "resourceId")
    ).toBeFalsy();
  });

  it('exposes data-all-day="true" only on an all-day cell', () => {
    renderCell({ allDay: true });

    expect(screen.getByTestId("cell").dataset.allDay).toBe("true");
  });

  it("omits data-all-day on a timed cell", () => {
    renderCell({ hour: 9 });

    expect(
      Object.hasOwn(screen.getByTestId("cell").dataset, "allDay")
    ).toBeFalsy();
  });
});

describe("DroppableCell getCellClassName", () => {
  beforeEach(() => {
    cleanup();
  });

  it("applies the class returned by getCellClassName", () => {
    renderCell({ getCellClassName: () => "bg-amber-100" });

    expect(screen.getByTestId("cell")).toHaveClass("bg-amber-100");
  });

  it("does not block onCellClick when only getCellClassName marks a cell", () => {
    const handleCellClick = vi.fn<(info: CellInfo) => void>();
    renderCell({ getCellClassName: () => "bg-amber-100", handleCellClick });

    clickCellSlot(screen.getByTestId("cell"));

    expect(handleCellClick).toHaveBeenCalledOnce();
    expect(screen.getByTestId("cell").dataset.disabled).toBe("false");
  });

  it("passes the cell start/end range to getCellClassName", () => {
    let received: CellInfo | undefined;
    renderCell({
      getCellClassName: (info) => {
        received = info;

        return "";
      },
    });

    expect(received ? toISOString(received.start) : undefined).toBe(
      "2025-01-01T00:00:00.000Z"
    );
    expect(received?.end.hour).toBe(23);
    expect(received?.end.minute).toBe(59);
  });
});
