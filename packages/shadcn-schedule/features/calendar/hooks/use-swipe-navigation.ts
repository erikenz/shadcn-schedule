import { useCallback, useRef } from "react";

export interface SwipeNavigationOptions {
  enabled?: boolean;
  maxDuration?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

interface TouchCoordinates {
  time: number;
  x: number;
  y: number;
}

// pixels
const DEFAULT_THRESHOLD = 35;

// ms
const DEFAULT_MAX_DURATION = 600;

/**
 * First touch of a touch list, or undefined when the list is empty.
 *
 * React's `TouchList` type is not iterable (and its `Touch` items differ from
 * the DOM ones), so the list cannot be spread or passed to `Array.from`.
 */
const firstTouch = (
  touches: React.TouchEvent["touches"]
): React.Touch | undefined => touches[0];

/**
 * Checks whether an event target is an interactive element that should
 * prevent period swipe gestures.
 */
const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  // If the touch originated on a calendar event, allow the swipe gesture for touch devices
  if (target.closest('[data-calendar-event="true"], [data-event-type]')) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, select, textarea, [role="dialog"], [role="menu"], [role="menuitem"], [data-state="open"]'
    )
  );
};

/**
 * Attaches touch handlers to support swipe gestures for navigating calendar periods.
 * - Swipe left (finger moving left) -> navigates to NEXT period
 * - Swipe right (finger moving right) -> navigates to PREVIOUS period
 *
 * Automatically guards against:
 * - Multi-touch (pinching/zooming)
 * - Mouse drag operations (event dragging, slot creation)
 * - Predominantly vertical scrolling (|deltaY| >= |deltaX|)
 * - Touches originating inside interactive controls (events, inputs, menus, dialogs)
 */
export const useSwipeNavigation = ({
  enabled = true,
  onSwipeLeft,
  onSwipeRight,
  threshold = DEFAULT_THRESHOLD,
  maxDuration = DEFAULT_MAX_DURATION,
}: SwipeNavigationOptions) => {
  const startTouchRef = useRef<TouchCoordinates | null>(null);

  const startPointerRef = useRef<{
    pointerId: number;
    time: number;
    x: number;
    y: number;
  } | null>(null);

  const lastSwipedAtRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Mouse drag is reserved for calendar interactions (event move, slot creation);
      // swipe navigation applies strictly to touch/pen gestures.
      if (!enabled || e.button !== 0 || e.pointerType === "mouse") {
        startPointerRef.current = null;

        return;
      }

      if (isInteractiveElement(e.target)) {
        startPointerRef.current = null;

        return;
      }

      startPointerRef.current = {
        pointerId: e.pointerId,
        time: Date.now(),
        x: e.clientX,
        y: e.clientY,
      };
    },
    [enabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { current: startPointer } = startPointerRef;

      if (
        !(enabled && startPointer && startPointer.pointerId === e.pointerId)
      ) {
        return;
      }

      const deltaX = e.clientX - startPointer.x;
      const deltaY = e.clientY - startPointer.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX >= threshold && absX > absY) {
        startPointerRef.current = null;
        lastSwipedAtRef.current = Date.now();

        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    },
    [enabled, onSwipeLeft, onSwipeRight, threshold]
  );

  const handlePointerUp = useCallback(() => {
    startPointerRef.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 1) {
        startTouchRef.current = null;

        return;
      }

      if (isInteractiveElement(e.target)) {
        startTouchRef.current = null;

        return;
      }

      const touch = firstTouch(e.touches);

      if (touch) {
        startTouchRef.current = {
          time: Date.now(),
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const { current: startTouch } = startTouchRef;

      if (!(enabled && startTouch)) {
        return;
      }

      const touch = firstTouch(e.touches);

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - startTouch.x;
      const deltaY = touch.clientY - startTouch.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Trigger swipe immediately once horizontal distance exceeds threshold
      if (absX >= threshold && absX > absY) {
        startTouchRef.current = null;
        lastSwipedAtRef.current = Date.now();

        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    },
    [enabled, onSwipeLeft, onSwipeRight, threshold]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const { current: startTouch } = startTouchRef;

      if (!(enabled && startTouch)) {
        return;
      }

      startTouchRef.current = null;

      const touch = firstTouch(e.changedTouches);

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - startTouch.x;
      const deltaY = touch.clientY - startTouch.y;
      const duration = Date.now() - startTouch.time;

      if (duration > maxDuration) {
        return;
      }

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Must exceed horizontal threshold and be predominantly horizontal
      if (absX >= threshold && absX > absY) {
        lastSwipedAtRef.current = Date.now();

        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    },
    [enabled, maxDuration, onSwipeLeft, onSwipeRight, threshold]
  );

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      const { current: startTouch } = startTouchRef;
      startTouchRef.current = null;

      if (!(enabled && startTouch)) {
        return;
      }

      const touch = firstTouch(e.changedTouches);

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - startTouch.x;
      const deltaY = touch.clientY - startTouch.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX >= threshold && absX > absY) {
        lastSwipedAtRef.current = Date.now();

        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    },
    [enabled, onSwipeLeft, onSwipeRight, threshold]
  );

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (Date.now() - lastSwipedAtRef.current < 400) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return {
    onClickCapture: handleClickCapture,
    onPointerCancel: handlePointerUp,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onTouchCancel: handleTouchCancel,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onTouchStart: handleTouchStart,
  };
};
