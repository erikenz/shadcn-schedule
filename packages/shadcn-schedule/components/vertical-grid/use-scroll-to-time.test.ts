import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScrollToTime } from "@/components/vertical-grid/use-scroll-to-time";

const HOUR_PIXEL_SIZE = 60;

const stubRect = (top: number, left: number) => (): DOMRect => ({
  left,
  top,
  bottom: 0,
  height: 0,
  right: 0,
  toJSON: () => ({}),
  width: 0,
  x: 0,
  y: 0,
});

const buildViewport = (hours: number[]) => {
  const viewport = document.createElement("div");
  viewport.getBoundingClientRect = stubRect(0, 0);

  for (const [index, hour] of hours.entries()) {
    const row = document.createElement("div");
    row.dataset.hour = String(hour).padStart(2, "0");
    // First row sits at offset 0 inside the time area; later rows step
    // down/right by one hour height. Mirrors how the real time-gutter or
    // time-header row is laid out after any sticky-left/top column.
    row.getBoundingClientRect = stubRect(
      index * HOUR_PIXEL_SIZE,
      index * HOUR_PIXEL_SIZE
    );
    viewport.append(row);
  }

  document.body.append(viewport);

  return viewport;
};

const hourIndex = (hour: number) =>
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].indexOf(hour);

const setupScrollSpy = () => {
  const spy = vi.fn<(options?: ScrollToOptions) => void>(
    (_options?: ScrollToOptions) => {}
  );

  // jsdom has no Element.scrollTo; define it so the hook's `viewport.scrollTo`
  // calls are recorded by the mock (the descriptor value is untyped, so no
  // assertion is needed to bridge the Mock and overloaded DOM signatures).
  Object.defineProperty(Element.prototype, "scrollTo", {
    configurable: true,
    value: spy,
    writable: true,
  });

  return spy;
};

describe(useScrollToTime, () => {
  let viewport: HTMLElement;
  let scrollSpy: ReturnType<typeof setupScrollSpy>;

  beforeEach(() => {
    viewport = buildViewport([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    scrollSpy = setupScrollSpy();
  });

  afterEach(() => {
    document.body.textContent = "";
  });

  // `scrollTime: null` mounts the hook with no target time at all, which is
  // how a view without a configured scroll time reaches the hook.
  const renderScrollHook = (
    overrides: Partial<{
      viewportRef: ReturnType<typeof createRef<HTMLElement>>;
      scrollTime: string | null;
      enabled: boolean;
      scrollKey: string;
      axis: "vertical" | "horizontal";
    }> = {}
  ) => {
    const viewportRef = createRef<HTMLElement>();
    viewportRef.current = viewport;
    const { scrollTime = "08:00:00", ...rest } = overrides;

    const options = {
      enabled: true,
      scrollKey: "day-2025-01-01",
      viewportRef,
      ...rest,
    };

    return renderHook(() => {
      useScrollToTime(
        scrollTime === null ? options : { ...options, scrollTime }
      );
    });
  };

  const scrolledToTop = (): number | undefined =>
    scrollSpy.mock.calls.at(0)?.at(0)?.top;

  const scrolledToLeft = (): number | undefined =>
    scrollSpy.mock.calls.at(0)?.at(0)?.left;

  it("scrolls the viewport to the row matching scrollTime on mount", () => {
    renderScrollHook({ scrollTime: "08:00:00" });

    expect(scrollSpy).toHaveBeenCalledOnce();
    expect(scrollSpy.mock.contexts.at(0)).toBe(viewport);
    expect(scrolledToTop()).toBe(hourIndex(8) * HOUR_PIXEL_SIZE);
  });

  it("does not scroll when scrollTime is undefined", () => {
    renderScrollHook({ scrollTime: null });

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("does not scroll when enabled is false", () => {
    renderScrollHook({ enabled: false });

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("clamps to the first row when scrollTime is before the visible range", () => {
    renderScrollHook({ scrollTime: "03:00:00" });

    expect(scrolledToTop()).toBe(hourIndex(6) * HOUR_PIXEL_SIZE);
  });

  it("clamps to the last row when scrollTime is after the visible range", () => {
    renderScrollHook({ scrollTime: "22:00:00" });

    expect(scrolledToTop()).toBe(hourIndex(17) * HOUR_PIXEL_SIZE);
  });

  it("floors minutes to the hour", () => {
    renderScrollHook({ scrollTime: "08:45:30" });

    expect(scrolledToTop()).toBe(hourIndex(8) * HOUR_PIXEL_SIZE);
  });

  it("accepts HH:mm format without seconds", () => {
    renderScrollHook({ scrollTime: "10:00" });

    expect(scrolledToTop()).toBe(hourIndex(10) * HOUR_PIXEL_SIZE);
  });

  it("does nothing when scrollTime is malformed", () => {
    renderScrollHook({ scrollTime: "not-a-time" });

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("re-scrolls when scrollKey changes", () => {
    const viewportRef = createRef<HTMLElement>();
    viewportRef.current = viewport;

    const { rerender } = renderHook(
      (props: { scrollKey: string }) => {
        useScrollToTime({
          enabled: true,
          scrollKey: props.scrollKey,
          scrollTime: "08:00:00",
          viewportRef,
        });
      },
      { initialProps: { scrollKey: "day-2025-01-01" } }
    );

    expect(scrollSpy).toHaveBeenCalledOnce();
    rerender({ scrollKey: "day-2025-01-02" });
    expect(scrollSpy).toHaveBeenCalledTimes(2);
  });

  it('scrolls horizontally when axis is "horizontal"', () => {
    renderScrollHook({ axis: "horizontal", scrollTime: "10:00" });

    expect(scrolledToLeft()).toBe(hourIndex(10) * HOUR_PIXEL_SIZE);
    expect(scrolledToTop()).toBeUndefined();
  });
});
