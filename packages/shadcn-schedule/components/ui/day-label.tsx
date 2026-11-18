import { cn } from "@/lib/cn";
import type React from "react";

interface DayLabelProps {
  /**
   * Extra classes for the outer flex-col wrapper. Pass `flex-col-reverse` to
   * stack the number above the weekday (e.g. month / agenda headers).
   */
  className?: string;
  /** Test id forwarded to the number badge. */
  "data-testid"?: string;
  /** Day-of-month, e.g. "13". */
  dayNumber: React.ReactNode;
  /**
   * True when this day is today: fills the number circle, tints the weekday,
   * and exposes `data-today="true"` as a styling/selection hook.
   */
  today: boolean;
  /** Weekday label, e.g. "Mon". Omit to render the number alone (grid cells). */
  weekday?: React.ReactNode;
}

/**
 * Context-free, today-aware day label: a fixed-size round number badge (filled
 * with the primary color when `today`), optionally stacked with a muted weekday
 * label (primary-colored when `today`). The single source of truth for today
 * highlighting across calendar views and plugins. Order is weekday-above-number
 * by default; pass `className="flex-col-reverse"` to put the number on top (no
 * markup change), so the styling stays identical at every call site.
 */
export const DayLabel = ({
  today,
  dayNumber,
  weekday,
  className,
  "data-testid": dataTestId,
}: DayLabelProps) => (
  <div
    className={cn("flex flex-col items-center", className)}
    data-testid={dataTestId}
    data-today={today ? "true" : undefined}
  >
    {weekday !== null && weekday !== undefined && (
      <div
        className={cn(
          "text-muted-foreground w-full truncate text-center text-xs",
          today && "text-primary"
        )}
      >
        {weekday}
      </div>
    )}
    <div
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
        today && "bg-primary text-primary-foreground"
      )}
    >
      {dayNumber}
    </div>
  </div>
);
