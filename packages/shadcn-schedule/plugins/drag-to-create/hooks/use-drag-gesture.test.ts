import { setTimeout as sleep } from "node:timers/promises";

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDragGesture } from "@/plugins/drag-to-create/hooks/use-drag-gesture";
import type { UseDragGestureOptions } from "@/plugins/drag-to-create/hooks/use-drag-gesture";

// Drive the hook with synthetic pointer events and record the lifecycle, so each
// test reads as: dispatched events -> recorded callbacks. The payload is a plain
// string ('cell') since the hook is domain-agnostic.
interface Recorder {
  cancels: number;
  ends: string[];
  moves: { x: number; y: number; payload: string }[];
  starts: string[];
}

const renderGesture = (
  overrides: Partial<UseDragGestureOptions<string>> = {}
) => {
  const rec: Recorder = { cancels: 0, ends: [], moves: [], starts: [] };

  const options: UseDragGestureOptions<string> = {
    onCancel: () => {
      rec.cancels += 1;
    },
    onEnd: (payload) => {
      rec.ends.push(payload);
    },
    onMove: (point, payload) => {
      rec.moves.push({ payload, x: point.clientX, y: point.clientY });
    },
    onStart: (payload) => {
      rec.starts.push(payload);
    },
    resolvePress: () => "cell",
    ...overrides,
  };

  const { unmount } = renderHook(() => {
    useDragGesture(options);
  });

  return { rec, unmount };
};

// pointerdown is bound to document; the rest to window (matches the hook).
const down = (init: PointerEventInit = {}) =>
  document.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
      ...init,
    })
  );

const move = (init: PointerEventInit = {}) =>
  window.dispatchEvent(
    new PointerEvent("pointermove", { bubbles: true, pointerId: 1, ...init })
  );

const up = (init: PointerEventInit = {}) =>
  window.dispatchEvent(
    new PointerEvent("pointerup", { bubbles: true, pointerId: 1, ...init })
  );

const delay = async (ms: number): Promise<void> => {
  await sleep(ms);
};

describe(useDragGesture, () => {
  describe("mouse / pen", () => {
    it("fires start, move, end across a drag past the threshold", () => {
      const { rec } = renderGesture();

      down({ clientX: 0, clientY: 0 });
      // hypot 5 >= 2
      move({ clientX: 5, clientY: 0 });
      up({ clientX: 5, clientY: 0 });

      expect(rec.starts).toStrictEqual(["cell"]);
      expect(rec.moves).toStrictEqual([{ payload: "cell", x: 5, y: 0 }]);
      expect(rec.ends).toStrictEqual(["cell"]);
      expect(rec.cancels).toBe(0);
    });

    it("a tap (no movement) fires nothing", () => {
      const { rec } = renderGesture();

      down({ clientX: 0, clientY: 0 });
      up({ clientX: 0, clientY: 0 });

      expect(rec.starts).toStrictEqual([]);
      expect(rec.ends).toStrictEqual([]);
      expect(rec.cancels).toBe(0);
    });

    it("movement below the threshold does not start a drag", () => {
      const { rec } = renderGesture();

      down({ clientX: 0, clientY: 0 });
      // hypot 1 < 2
      move({ clientX: 1, clientY: 0 });
      up({ clientX: 1, clientY: 0 });

      expect(rec.starts).toStrictEqual([]);
      expect(rec.ends).toStrictEqual([]);
    });

    it("ignores the press when resolvePress returns null", () => {
      const { rec } = renderGesture({ resolvePress: () => null });

      down({ clientX: 0 });
      move({ clientX: 50 });
      up({ clientX: 50 });

      expect(rec.starts).toStrictEqual([]);
      expect(rec.moves).toStrictEqual([]);
    });

    it("honours a custom thresholdPx", () => {
      const { rec } = renderGesture({ thresholdPx: 30 });

      down({ clientX: 0 });
      // < 30, no start yet
      move({ clientX: 10 });
      expect(rec.starts).toStrictEqual([]);

      // >= 30
      move({ clientX: 40 });
      expect(rec.starts).toStrictEqual(["cell"]);
    });

    it("ignores secondary / non-primary buttons", () => {
      const { rec } = renderGesture();

      down({ button: 2, clientX: 0 });
      move({ clientX: 50 });

      expect(rec.starts).toStrictEqual([]);
    });
  });

  describe("cancellation", () => {
    it("cancels an active drag on Escape and stops tracking", () => {
      const { rec } = renderGesture();

      down();
      move({ clientX: 10 });
      expect(rec.starts).toStrictEqual(["cell"]);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(rec.cancels).toBe(1);

      // no longer tracked
      move({ clientX: 20 });
      expect(rec.moves).toHaveLength(1);
    });

    it("cancels on pointercancel", () => {
      const { rec } = renderGesture();

      down();
      move({ clientX: 10 });
      window.dispatchEvent(
        new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 })
      );

      expect(rec.cancels).toBe(1);
    });

    it("cancels on window blur", () => {
      const { rec } = renderGesture();

      down();
      move({ clientX: 10 });
      window.dispatchEvent(new Event("blur"));

      expect(rec.cancels).toBe(1);
    });
  });

  describe("touch (long-press)", () => {
    it("starts after the hold, then tracks and ends", async () => {
      const { rec } = renderGesture({ longPressMs: 1 });

      down({ clientX: 0, clientY: 0, pointerType: "touch" });
      // hold pending, not yet a select
      expect(rec.starts).toStrictEqual([]);

      await delay(20);
      // hold fired
      expect(rec.starts).toStrictEqual(["cell"]);

      move({ clientX: 0, clientY: 30, pointerType: "touch" });
      up({ pointerType: "touch" });

      expect(rec.moves).toStrictEqual([{ payload: "cell", x: 0, y: 30 }]);
      expect(rec.ends).toStrictEqual(["cell"]);
    });

    it("aborts to a scroll when the finger moves before the hold fires", () => {
      const { rec } = renderGesture({ longPressMs: 1000 });

      down({ clientX: 0, clientY: 0, pointerType: "touch" });
      // > slop 10
      move({ clientX: 0, clientY: 20, pointerType: "touch" });

      expect(rec.starts).toStrictEqual([]);
      expect(rec.cancels).toBe(1);
    });

    it("jitter under the slop does not abort the hold", async () => {
      const { rec } = renderGesture({ longPressMs: 1, touchCancelSlopPx: 10 });

      down({ clientX: 0, clientY: 0, pointerType: "touch" });
      // < 10
      move({ clientX: 3, clientY: 0, pointerType: "touch" });
      expect(rec.cancels).toBe(0);

      await delay(20);
      expect(rec.starts).toStrictEqual(["cell"]);
    });
  });

  describe("side effects", () => {
    it("locks user-select while active and restores it on end", () => {
      renderGesture();

      down();
      move({ clientX: 10 });
      expect(document.body.style.getPropertyValue("user-select")).toBe("none");

      up({ clientX: 10 });
      expect(document.body.style.getPropertyValue("user-select")).toBe("");
    });

    it("suppresses the click synthesized right after a drag, once", () => {
      renderGesture();

      down();
      move({ clientX: 10 });
      up({ clientX: 10 });

      const first = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(first);
      expect(first.defaultPrevented).toBeTruthy();

      const second = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(second);
      expect(second.defaultPrevented).toBeFalsy();
    });
  });

  describe("cleanup", () => {
    it("removes listeners on unmount", () => {
      const { rec, unmount } = renderGesture();

      unmount();
      down();
      move({ clientX: 10 });
      up({ clientX: 10 });

      expect(rec.starts).toStrictEqual([]);
    });
  });
});
