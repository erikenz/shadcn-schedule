import type { CalendarEvent } from "@/types/index";

/** Placement fields shared by both layout strategies. */
interface PositionedEventBase {
  event: CalendarEvent;
  /** Horizontal placement, percent of the grid axis. */
  left: number;
  width: number;
}

/** `layoutVertical` (day/week time grid): pixel-percentage placement. */
export interface VerticalPositionedEvent extends PositionedEventBase {
  height: number;
  kind: "vertical";
  /** Vertical placement, percent of the visible range. */
  top: number;
  zIndex?: number;
}

/**
 * `layoutHorizontal` (month / all-day row): abstract row placement — the
 * renderer derives pixels from `row`.
 */
export interface HorizontalPositionedEvent extends PositionedEventBase {
  isTruncatedEnd: boolean;
  isTruncatedStart: boolean;
  kind: "horizontal";
  /** Stacking row index. */
  row: number;
}
