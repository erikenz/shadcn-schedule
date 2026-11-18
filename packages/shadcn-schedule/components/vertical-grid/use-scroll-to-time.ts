import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { hasText } from "@/lib/guards";

type ScrollToTimeAxis = "vertical" | "horizontal";

interface UseScrollToTimeOptions {
  /**
   * Vertical scrolls along the Y axis (`scrollTop`), horizontal along the X
   * axis (`scrollLeft`).
   *
   * @default 'vertical'
   */
  axis?: ScrollToTimeAxis;
  enabled: boolean;
  scrollKey: string;
  scrollTime?: string;
  /**
   * Ref to the actual scrolling element (e.g. the Radix ScrollArea viewport).
   * The hook scrolls this element directly so the parent page is not affected.
   */
  viewportRef: RefObject<HTMLElement | null>;
}

const HOUR_PATTERN = /^(?<hour>\d{1,2})(?::\d{1,2})?(?::\d{1,2})?$/u;
const HOUR_SELECTOR = "[data-hour]";

const parseHour = (time: string): number | null => {
  const hourDigits = HOUR_PATTERN.exec(time)?.groups?.hour;

  if (!hasText(hourDigits)) {
    return null;
  }

  const hour = Math.trunc(Number(hourDigits));
  const isInRange = hour >= 0 && hour <= 23;

  return isInRange ? hour : null;
};

const readRowHour = (row: HTMLElement): number =>
  Math.trunc(Number(row.dataset.hour ?? ""));

const findTargetRow = (
  rows: HTMLElement[],
  targetHour: number
): HTMLElement | null => {
  const firstRow = rows.at(0);
  const lastRow = rows.at(-1);

  if (!(firstRow && lastRow)) {
    return null;
  }

  if (targetHour <= readRowHour(firstRow)) {
    return firstRow;
  }

  if (targetHour >= readRowHour(lastRow)) {
    return lastRow;
  }

  return rows.find((row) => readRowHour(row) === targetHour) ?? null;
};

const scrollViewportToRow = (
  viewport: HTMLElement,
  targetRow: HTMLElement,
  firstRow: HTMLElement,
  axis: ScrollToTimeAxis
) => {
  // Use the first row as the reference for "starting position of the time
  // area." It naturally sits past any sticky-left (or sticky-top) header
  // like the Resources column. Setting scrollLeft/scrollTop to the offset
  // from first row to target row lands the target where the first row sat,
  // i.e. right at the start of the visible time area instead of behind the
  // sticky column.
  const targetRect = targetRow.getBoundingClientRect();
  const firstRect = firstRow.getBoundingClientRect();

  if (axis === "horizontal") {
    viewport.scrollTo({
      behavior: "auto",
      left: targetRect.left - firstRect.left,
    });

    return;
  }

  viewport.scrollTo({
    behavior: "auto",
    top: targetRect.top - firstRect.top,
  });
};

export const useScrollToTime = ({
  viewportRef,
  scrollTime,
  enabled,
  scrollKey,
  axis = "vertical",
}: UseScrollToTimeOptions) => {
  const lastScrolledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(enabled && hasText(scrollTime))) {
      return;
    }

    if (lastScrolledKeyRef.current === scrollKey) {
      return;
    }

    const targetHour = parseHour(scrollTime);

    if (targetHour === null) {
      return;
    }

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const rows = [...viewport.querySelectorAll<HTMLElement>(HOUR_SELECTOR)];
    const firstRow = rows.at(0);
    const targetRow = findTargetRow(rows, targetHour);

    if (!(firstRow && targetRow)) {
      return;
    }

    scrollViewportToRow(viewport, targetRow, firstRow, axis);
    lastScrolledKeyRef.current = scrollKey;
  }, [enabled, scrollTime, scrollKey, viewportRef, axis]);
};
