import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSwipeNavigation } from "@/features/calendar/hooks/use-swipe-navigation";
import type { SwipeNavigationOptions } from "@/features/calendar/hooks/use-swipe-navigation";

const TestSwipeComponent = (props: SwipeNavigationOptions) => {
  const swipeHandlers = useSwipeNavigation(props);

  return (
    <div data-testid="swipe-container" {...swipeHandlers}>
      <button data-calendar-event="true" data-testid="event-btn" type="button">
        Event Card
      </button>
      <input data-testid="test-input" type="text" />
      <div data-testid="plain-area">Plain Area</div>
    </div>
  );
};

describe(useSwipeNavigation, () => {
  afterEach(() => {
    cleanup();
  });

  it("triggers onSwipeLeft on horizontal swipe left", () => {
    const onSwipeLeft = vi.fn<() => void>();
    const onSwipeRight = vi.fn<() => void>();

    render(
      <TestSwipeComponent
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      />
    );

    const plain = screen.getByTestId("plain-area");
    fireEvent.touchStart(plain, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(plain, {
      changedTouches: [{ clientX: 100, clientY: 105 }],
    });

    expect(onSwipeLeft).toHaveBeenCalledOnce();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("triggers onSwipeRight on horizontal swipe right", () => {
    const onSwipeLeft = vi.fn<() => void>();
    const onSwipeRight = vi.fn<() => void>();

    render(
      <TestSwipeComponent
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      />
    );

    const plain = screen.getByTestId("plain-area");
    fireEvent.touchStart(plain, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(plain, {
      changedTouches: [{ clientX: 200, clientY: 105 }],
    });

    expect(onSwipeRight).toHaveBeenCalledOnce();
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("allows swipe gestures that start over calendar event elements", () => {
    const onSwipeLeft = vi.fn<() => void>();

    render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);

    const eventEl = screen.getByTestId("event-btn");
    fireEvent.touchStart(eventEl, {
      touches: [{ clientX: 250, clientY: 100 }],
    });
    fireEvent.touchEnd(eventEl, {
      changedTouches: [{ clientX: 150, clientY: 102 }],
    });

    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it("blocks swipe gestures that start over form inputs", () => {
    const onSwipeLeft = vi.fn<() => void>();

    render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);

    const input = screen.getByTestId("test-input");
    fireEvent.touchStart(input, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(input, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores vertical scrolling gestures", () => {
    const onSwipeLeft = vi.fn<() => void>();
    const onSwipeRight = vi.fn<() => void>();

    render(
      <TestSwipeComponent
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      />
    );

    const plain = screen.getByTestId("plain-area");
    fireEvent.touchStart(plain, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(plain, {
      changedTouches: [{ clientX: 160, clientY: 250 }],
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("triggers early swipe on touchMove over event elements", () => {
    const onSwipeLeft = vi.fn<() => void>();

    render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);

    const eventEl = screen.getByTestId("event-btn");
    fireEvent.touchStart(eventEl, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchMove(eventEl, {
      touches: [{ clientX: 150, clientY: 102 }],
    });

    expect(onSwipeLeft).toHaveBeenCalledOnce();

    // Subsequent touchEnd should not trigger a second time
    fireEvent.touchEnd(eventEl, {
      changedTouches: [{ clientX: 140, clientY: 102 }],
    });
    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it("handles touchCancel when threshold was already reached", () => {
    const onSwipeRight = vi.fn<() => void>();

    render(<TestSwipeComponent onSwipeRight={onSwipeRight} />);

    const eventEl = screen.getByTestId("event-btn");
    fireEvent.touchStart(eventEl, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchCancel(eventEl, {
      changedTouches: [{ clientX: 160, clientY: 102 }],
    });

    expect(onSwipeRight).toHaveBeenCalledOnce();
  });

  it("triggers onSwipeLeft on mouse/pointer drag left over event elements", () => {
    const onSwipeLeft = vi.fn<() => void>();

    render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);

    const eventEl = screen.getByTestId("event-btn");
    fireEvent.pointerDown(eventEl, {
      button: 0,
      clientX: 200,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(eventEl, {
      clientX: 150,
      clientY: 102,
      pointerId: 1,
    });

    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it("blocks swipe gestures during mouse pointer drag (reserved for event dragging)", () => {
    const onSwipeLeft = vi.fn<() => void>();

    render(<TestSwipeComponent onSwipeLeft={onSwipeLeft} />);

    const eventEl = screen.getByTestId("event-btn");
    fireEvent.pointerDown(eventEl, {
      button: 0,
      clientX: 200,
      clientY: 100,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(eventEl, {
      clientX: 150,
      clientY: 102,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
