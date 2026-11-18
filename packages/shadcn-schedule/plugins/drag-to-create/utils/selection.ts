import type { Temporal } from "temporal-polyfill";

import type { RawCell } from "@/plugins/drag-to-create/utils/read-cell";
import { isAfter } from "@/utils/temporal";

/** Match @dnd-kit's MouseSensor `distance: 2` so click-vs-drag feels identical. */
const DRAG_THRESHOLD_PX = 2;

/** True once the pointer has moved far enough to count as a drag, not a click. */
export const exceedsThreshold = (
  dx: number,
  dy: number,
  min: number = DRAG_THRESHOLD_PX
): boolean => Math.hypot(dx, dy) >= min;

/**
 * The single-region invariant: a selection never mixes all-day and timed cells,
 * and never spans resources (the resource clamp holds in both orientations). Both
 * timed and full-day selections may span days (a cross-day timed range becomes a
 * multi-day timed event; month / all-day selections span days too). A candidate
 * cell in a different region is ignored, so the drag clamps to where it started.
 */
export const isSameRegion = (start: RawCell, candidate: RawCell): boolean => {
  const sameAllDay = start.allDay === candidate.allDay;
  const sameResource = start.resourceId === candidate.resourceId;

  return sameAllDay && sameResource;
};

export interface DragSelection {
  allDay: boolean;
  end: Temporal.ZonedDateTime;
  resourceId?: string;
  start: Temporal.ZonedDateTime;
}

/**
 * The committed range from two cells, normalized so `start <= end` regardless of
 * drag direction: from the earlier cell's start to the later cell's end.
 */
export const computeRange = (a: RawCell, b: RawCell): DragSelection => {
  const reversed = isAfter(a.start, b.start);
  const first = reversed ? b : a;
  const second = reversed ? a : b;

  return {
    allDay: first.allDay,
    end: second.end,
    resourceId: first.resourceId,
    start: first.start,
  };
};
