import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Temporal } from "temporal-polyfill";

import { diff, now } from "@/utils/temporal";

export interface CurrentTimeIndicatorRenderProps {
  /** 'vertical' → `top` offset; 'horizontal' → `left` offset. */
  axis: "vertical" | "horizontal";
  /** "Now" (or the injected reference time). */
  currentTime: Temporal.ZonedDateTime;
  /** Position of `currentTime` within the range, 0-100. */
  progress: number;
  /** End of the container's timeline. */
  rangeEnd: Temporal.ZonedDateTime;
  /** Start of the container's timeline. */
  rangeStart: Temporal.ZonedDateTime;
}

interface CurrentTimeIndicatorProps {
  axis?: "vertical" | "horizontal";
  /** Reference time for "now" (defaults to the current time; useful for tests). */
  now?: Temporal.ZonedDateTime;
  rangeEnd: Temporal.ZonedDateTime;
  rangeStart: Temporal.ZonedDateTime;
  /** Custom renderer; receives the computed position. Falls back to a red line. */
  render?: (props: CurrentTimeIndicatorRenderProps) => ReactNode;
  /**
   * Show the dot at the line's start. Default true. Set false to dedupe the dot
   * across stacked segments that share one line (e.g. per-resource rows).
   */
  withDot?: boolean;
}

/**
 * Shared, context-free current-time marker. Computes the current time's position
 * within `[rangeStart, rangeEnd]` and renders a red line there (or `render`),
 * hiding itself when now is outside the range. Consumers that need calendar
 * context (custom renderer, view, resource) wrap this and pass `render`.
 */
const NoMemoCurrentTimeIndicator = ({
  rangeStart,
  rangeEnd,
  now: propNow,
  axis = "vertical",
  render,
  withDot = true,
}: CurrentTimeIndicatorProps) => {
  // The clock is an external system: the interval is its only writer, and the
  // reference time (when injected) is read straight from the prop.
  const [clock, setClock] = useState(() => now());
  const current = propNow ?? clock;

  /* oxlint-disable typescript/consistent-return, sonarjs/no-inconsistent-returns -- returns nothing on some paths on purpose; `return undefined` is banned by unicorn/no-useless-undefined */
  useEffect(() => {
    if (propNow) {
      return;
    }

    const interval = setInterval(() => {
      setClock(now());
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [propNow]);
  /* oxlint-enable typescript/consistent-return, sonarjs/no-inconsistent-returns */
  // Instant comparison only, so this stays a leaf: within range is
  // [rangeStart, rangeEnd).
  const nowMs = current.epochMilliseconds;

  const isWithinRange =
    nowMs >= rangeStart.epochMilliseconds && nowMs < rangeEnd.epochMilliseconds;

  if (!isWithinRange) {
    return null;
  }

  const totalDuration = diff(rangeEnd, rangeStart, "minute");
  const minutesFromStart = diff(current, rangeStart, "minute");
  const progress = (minutesFromStart / totalDuration) * 100;

  if (render) {
    return (
      <>
        {render({ currentTime: current, axis, progress, rangeEnd, rangeStart })}
      </>
    );
  }

  if (axis === "horizontal") {
    return (
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-50 flex -translate-x-1/2 flex-col items-center"
        data-testid="current-time-indicator"
        style={{ left: `${progress}%` }}
      >
        {withDot ? (
          <div className="size-2 shrink-0 rounded-full bg-red-500" />
        ) : null}
        <div className="w-0.5 flex-1 bg-red-500" />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-50 flex -translate-y-1/2 items-center"
      data-testid="current-time-indicator"
      style={{ top: `${progress}%` }}
    >
      {withDot ? (
        <div className="size-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
      ) : null}
      <div className="h-0.5 flex-1 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
    </div>
  );
};

// The reference time is either injected or read from the live clock; keying on
// the active source re-seeds the clock when it switches.
const KeyedCurrentTimeIndicator = (props: CurrentTimeIndicatorProps) => (
  <NoMemoCurrentTimeIndicator
    key={props.now ? "injected" : "clock"}
    {...props}
  />
);

export const CurrentTimeIndicator = memo(KeyedCurrentTimeIndicator);
