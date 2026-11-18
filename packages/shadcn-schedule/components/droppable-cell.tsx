import { useDroppable } from "@dnd-kit/core";
import type React from "react";
import { useCallback, useMemo } from "react";
import type { Temporal } from "temporal-polyfill";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { CellInfo } from "@/features/calendar/types/index";
import { cn } from "@/lib/cn";
import { DISABLED_CELL_CLASSNAME } from "@/lib/constants";
import { textOr } from "@/lib/guards";
import { toISOString } from "@/utils/temporal";

interface DroppableCellProps {
  allDay?: boolean;
  children?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  date: Temporal.ZonedDateTime;
  disabled?: boolean;
  hour?: number;
  id: string;
  minute?: number;
  resourceId?: string | number;
  style?: React.CSSProperties;
  type: "day-cell" | "time-cell";
}

/**
 * The time span a cell represents. Granularity follows the view: a 15-minute
 * slot (day), a one-hour slot (week), or the whole day (month).
 */
const getCellRange = (
  date: Temporal.ZonedDateTime,
  hour?: number,
  minute?: number
) => {
  const start = date.with({ hour: hour ?? 0, minute: minute ?? 0 });

  if (hour !== undefined && minute !== undefined) {
    return { end: start.with({ minute: minute + 15 }), start };
  }

  if (hour !== undefined) {
    return { end: start.with({ hour: hour + 1, minute: 0 }), start };
  }

  return { end: start.with({ hour: 23, minute: 59 }), start };
};

/**
 * A droppable cell. The container is a plain div so children are free to be
 * interactive controls (a `<button>` cell would forbid them, nested buttons
 * are invalid HTML). The cell's "select this slot" action is a full-size
 * overlay `<button>` behind an inert (`pointer-events-none`) content layer:
 * pointer users hit the button on empty areas and their interactive children
 * on the layer, keyboard users get a single tab stop per cell, and screen
 * readers announce one labelled control.
 */
export const DroppableCell = ({
  id,
  type,
  date,
  hour,
  minute,
  resourceId,
  allDay,
  children,
  className,
  style,
  "data-testid": dataTestId,
  disabled = false,
}: DroppableCellProps) => {
  const {
    onCellClick,
    t,
    isCellDisabled,
    getCellClassName,
    getResourceById,
    disableDragAndDrop,
    disableCellClick,
    classesOverride,
    view,
  } = useSmartCalendarContext();

  const { start, end } = getCellRange(date, hour, minute);
  // `getResourceById` is always present; it returns undefined for unknown ids.
  const resource = getResourceById(resourceId);

  const cellInfo: CellInfo = useMemo(
    () => ({ allDay, end, resource, start }),
    [allDay, end, resource, start]
  );

  // Disabled by business hours (`disabled` prop) or the consumer's predicate.
  const cellDisabled = disabled || Boolean(isCellDisabled?.(cellInfo));
  const clickBlocked = disableCellClick || cellDisabled;

  const { isOver, setNodeRef } = useDroppable({
    data: { allDay, date, hour, minute, resourceId, type },
    disabled: disableDragAndDrop || cellDisabled,
    id,
  });

  const handleCellClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (clickBlocked) {
        return;
      }

      onCellClick(cellInfo);
    },
    [cellInfo, clickBlocked, onCellClick]
  );

  const showDropHighlight = isOver && !disableDragAndDrop && !cellDisabled;

  const disabledClass = textOr(
    classesOverride?.disabledCell,
    DISABLED_CELL_CLASSNAME
  );

  const customClassName = getCellClassName?.(cellInfo);

  return (
    <div
      className={cn(
        "relative",
        className,
        customClassName,
        showDropHighlight && "bg-accent",
        clickBlocked ? "cursor-default" : "cursor-pointer",
        cellDisabled && disabledClass
      )}
      data-all-day={allDay === true ? "true" : undefined}
      data-disabled={cellDisabled.toString()}
      data-droppable-cell
      data-end={toISOString(end)}
      data-resource-id={resourceId}
      data-start={toISOString(start)}
      data-testid={dataTestId}
      data-timezone={start.timeZoneId}
      data-view={view}
      ref={setNodeRef}
      style={style}
    >
      {/* The cell's actionable control: the "select this slot" action. It
          sits under the inert content layer and catches pointer hits on empty
          cell areas; keyboard Enter/Space activates it directly. */}
      <button
        aria-label={t("selectSlot")}
        className="focus-visible:ring-ring/50 absolute inset-0 focus-visible:ring-[3px] focus-visible:outline-none"
        disabled={clickBlocked}
        onClick={handleCellClick}
        type="button"
      />
      {/* Inert layer: interactive children (e.g. "+N more") opt back in with
          pointer-events-auto while empty areas pass hits to the button. */}
      <div className="pointer-events-none relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};
