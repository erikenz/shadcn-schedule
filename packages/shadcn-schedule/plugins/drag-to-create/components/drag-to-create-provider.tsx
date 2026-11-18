import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { CellInfo } from "@/features/calendar/types/index";
import { useDragGesture } from "@/plugins/drag-to-create/hooks/use-drag-gesture";
import type { DragToCreateOptions } from "@/plugins/drag-to-create/types";
import { readCell } from "@/plugins/drag-to-create/utils/read-cell";
import type { RawCell } from "@/plugins/drag-to-create/utils/read-cell";
import { intersectRect, unionRect } from "@/plugins/drag-to-create/utils/rect";
import type { Rect } from "@/plugins/drag-to-create/utils/rect";
import {
  computeRange,
  isSameRegion,
} from "@/plugins/drag-to-create/utils/selection";
import type { Resource } from "@/types/index";

/** Where the selection highlight mounts and the rect (in that box's space). */
interface Mirror {
  /**
   * The grid's scroll content (`data-calendar-scroll-content`) to mount inside,
   * or null to fall back to a fixed overlay on the body.
   */
  content: HTMLElement | null;
  rect: Rect;
}

/**
 * Positions the mirror inside the grid's scroll content so the overlay scrolls
 * with the cells, is clipped by the scroll viewport, and is painted *beneath*
 * the sticky header / resource column (which sit at higher z within the same
 * box). The rect is relative to that content box, which already moves with the
 * scroll, so no scroll offset is needed. Falls back to a fixed overlay clipped
 * to the calendar viewport when no scroll content is found; returns null when
 * the fallback selection is scrolled entirely out of view.
 */
const computeMirror = (
  startCell: RawCell,
  lastCell: RawCell
): Mirror | null => {
  const union = unionRect(
    startCell.element.getBoundingClientRect(),
    lastCell.element.getBoundingClientRect()
  );

  const content = startCell.element.closest("[data-calendar-scroll-content]");

  if (content instanceof HTMLElement) {
    const box = content.getBoundingClientRect();

    const rect = {
      height: union.height,
      left: union.left - box.left,
      top: union.top - box.top,
      width: union.width,
    };

    return { content, rect };
  }

  const viewport = startCell.element.closest("[data-calendar-viewport]");

  if (!viewport) {
    return { content: null, rect: union };
  }

  const clipped = intersectRect(union, viewport.getBoundingClientRect());

  if (!clipped) {
    return null;
  }

  return { content: null, rect: clipped };
};

/**
 * The selection highlight. Mounted inside the grid's scroll content (positioned
 * `absolute`, below the sticky chrome) when available, else a fixed overlay on
 * the body. `z-15` sits above the cells (`z-10`) and below the sticky header
 * (`z-21`) / resource column (`z-20`).
 */
const SelectionMirror = ({ rect, content }: Mirror): ReactNode => {
  if (typeof document === "undefined") {
    return null;
  }

  const placement = content ? "absolute z-15" : "fixed z-50";

  return createPortal(
    <div
      aria-hidden="true"
      className={`pointer-events-none ${placement} border-primary bg-primary/25 rounded-md border-2 shadow-sm`}
      style={{
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      }}
    />,
    content ?? document.body
  );
};

/**
 * Wires the calendar's selection logic into the generic `useDragGesture`
 * recognizer: a press resolves to a grid cell, dragging extends the selection to
 * the cell under the pointer (clamped to the same region), and releasing opens
 * the event form with the range. The gesture mechanics (mouse threshold vs touch
 * long-press, scroll/text-selection suppression, cleanup) live in the hook.
 */
export const DragToCreateProvider = ({
  children,
  options,
}: {
  children: ReactNode;
  options: DragToCreateOptions;
}): ReactNode => {
  const { openEventForm, resources, timezone, orientation } =
    useCalendarContext();

  const [mirror, setMirror] = useState<Mirror | null>(null);
  const lastCellRef = useRef<RawCell | null>(null);

  // Resource calendars scroll along the axis their resources are laid out on
  // (vertical resource grid -> rows -> y; horizontal -> columns -> x). Locking
  // the auto-scroll to that axis stops a drag from scrolling across resources.
  // Regular calendars have a single axis, so both are allowed.
  const isResourceCalendar = resources.length > 0;
  const resourceScrollAxis = orientation === "vertical" ? "y" : "x";
  const scrollAxis = isResourceCalendar ? resourceScrollAxis : "both";

  const clearSelection = () => {
    lastCellRef.current = null;
    setMirror(null);
  };

  const commit = (startCell: RawCell, lastCell: RawCell) => {
    const range = computeRange(startCell, lastCell);

    const resource = resources.find(
      (item: Resource) => String(item.id) === range.resourceId
    );

    const selection: CellInfo = {
      resource,
      allDay: range.allDay,
      end: range.end,
      start: range.start,
    };

    if (options.onSelect) {
      options.onSelect(selection, openEventForm);
    } else {
      openEventForm({
        allDay: range.allDay,
        end: range.end,
        resourceId: range.resourceId,
        start: range.start,
      });
    }
  };

  useDragGesture<RawCell>({
    onCancel: clearSelection,
    onEnd: (startCell) => {
      const lastCell = lastCellRef.current ?? startCell;
      commit(startCell, lastCell);
      clearSelection();
    },
    onMove: ({ clientX, clientY }, startCell) => {
      const candidate = readCell(
        document.elementFromPoint(clientX, clientY),
        timezone
      );

      if (candidate && isSameRegion(startCell, candidate)) {
        lastCellRef.current = candidate;
      }

      const lastCell = lastCellRef.current ?? startCell;
      setMirror(computeMirror(startCell, lastCell));
    },
    onStart: (startCell) => {
      lastCellRef.current = startCell;
      setMirror(computeMirror(startCell, startCell));
    },
    resolvePress: (event) =>
      readCell(event.target instanceof Element ? event.target : null, timezone),
    scrollAxis,
  });

  return (
    <>
      {children}
      {mirror ? <SelectionMirror {...mirror} /> : null}
    </>
  );
};
