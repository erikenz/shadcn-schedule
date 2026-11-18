import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { HourLabel } from "@/components/hour-label/hour-label";
import type { VerticalGridColProps } from "@/components/vertical-grid/vertical-grid-col";
import { cn } from "@/lib/cn";
import { keys } from "@/lib/utils/keys";

/** Responsive gutter width (day view, week view, resource vertical views). */
export const GUTTER_WIDTH =
  "w-8 sm:w-20 min-w-8 sm:min-w-20 max-w-8 sm:max-w-20";

/**
 * The lone event column beside the gutter: 100% minus the gutter width.
 * The widths here and GUTTER_WIDTH above encode the same widths.
 */
export const FULL_WIDTH_MINUS_GUTTER =
  "w-[calc(100%-2rem)] sm:w-[calc(100%-5rem)]";

/** Responsive gutter width (kept for compatibility). */
export const RESPONSIVE_GUTTER_WIDTH = GUTTER_WIDTH;

/**
 * Right separator for a sticky-left gutter/spacer, drawn as a box-shadow (zero
 * layout width, so column alignment is untouched). A flex gap would slide under
 * the sticky column on horizontal scroll and vanish; this shadow rides with the
 * sticky element and stays put. The color is an OPAQUE mix approximating the
 * gap-line color (border over background) for any theme — opaque so it covers
 * (instead of stacking with) the translucent border behind it, which would
 * otherwise read as a doubled/heavier line in dark mode.
 */
export const STICKY_GUTTER_SHADOW =
  "shadow-[1px_0_0_0_color-mix(in_oklch,var(--background),var(--foreground)_10%)]";

interface GutterColumnOptions {
  /** Cells of the gutter: hour slots for time gutters, dates for date gutters. */
  days: Temporal.ZonedDateTime[];
  gridType: "day" | "hour";
  /** Per-cell label. Defaults to `<HourLabel />` for 'hour' gutters. */
  renderLabel?: (date: Temporal.ZonedDateTime) => React.ReactNode;
  /** Width utilities; defaults to the fixed `GUTTER_WIDTH`. */
  widthClassName?: string;
}

/**
 * The sticky left gutter column (time or date labels), defined once.
 * Replaces the column literal previously pasted into every vertical view.
 */
export const gutterColumn = ({
  days,
  gridType,
  renderLabel,
  widthClassName = GUTTER_WIDTH,
}: GutterColumnOptions): VerticalGridColProps => ({
  days,
  gridType,
  className: cn(
    "shrink-0",
    widthClassName,
    "bg-background sticky left-0 z-20",
    STICKY_GUTTER_SHADOW
  ),
  id: gridType === "hour" ? keys.col.time : keys.col.date,
  noEvents: true,
  renderCell: (date: Temporal.ZonedDateTime) => (
    <div className="text-muted-foreground flex flex-col items-center p-2 text-right text-xs">
      {renderLabel ? renderLabel(date) : <HourLabel date={date} />}
    </div>
  ),
});
