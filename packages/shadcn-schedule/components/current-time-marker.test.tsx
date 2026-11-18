import { cleanup, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it } from "vitest";

import { CurrentTimeMarker } from "@/components/current-time-marker";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { CalendarProviderProps } from "@/features/calendar/contexts/calendar-context/provider";
import type { RenderCurrentTimeIndicatorProps } from "@/features/calendar/types/index";
import type { CalendarView, Resource } from "@/types/index";
import { format, isSame, toZonedDateTime } from "@/utils/temporal";

/**
 * Shared custom render implementation for tests.
 * Displays time, progress and column index for verification.
 */
const TEST_CUSTOM_RENDER = ({
  currentTime,
  progress,
  resource,
  view,
}: RenderCurrentTimeIndicatorProps) => (
  <div data-testid="custom-indicator">
    <span data-testid="custom-time">{format(currentTime, "HH:mm")}</span>
    <span data-testid="custom-progress">{progress}%</span>
    <span data-testid="custom-resource-id">{resource?.id ?? "none"}</span>
    <span data-testid="custom-view">{view}</span>
  </div>
);

// Unwrap the props captured by the custom render (assigned through a closure,
// so TS cannot narrow the capture site) or fail the test when it never ran.
const assertRenderProps = (
  receivedProps: RenderCurrentTimeIndicatorProps | null
): RenderCurrentTimeIndicatorProps => {
  if (receivedProps === null) {
    throw new Error("Expected the custom render to have been called");
  }

  return receivedProps;
};

type CustomTimeIndicator = NonNullable<
  CalendarProviderProps["renderCurrentTimeIndicator"]
>;

/**
 * Builds a `renderCurrentTimeIndicator` prop that records what it receives,
 * so tests can assert on the props the marker passes to it.
 */
const createRenderPropsRecorder = () => {
  let received: RenderCurrentTimeIndicatorProps | null = null;

  const renderCurrentTimeIndicator = (
    renderProps: RenderCurrentTimeIndicatorProps
  ) => {
    received = renderProps;

    return TEST_CUSTOM_RENDER(renderProps);
  };

  return { getReceived: () => received, renderCurrentTimeIndicator };
};

/**
 * Test wrapper using the real CalendarProvider with only the props the
 * CurrentTimeMarker tests need; the engine fills in the rest of the context.
 */
const TestWrapper: React.FC<{
  children: React.ReactNode;
  renderCurrentTimeIndicator?: CustomTimeIndicator;
  view?: CalendarView;
}> = ({ children, renderCurrentTimeIndicator, view = "day" }) => (
  <CalendarProvider
    initialView={view}
    renderCurrentTimeIndicator={renderCurrentTimeIndicator}
  >
    {children}
  </CalendarProvider>
);

interface IndicatorProps {
  axis?: "vertical" | "horizontal";
  now?: Temporal.ZonedDateTime;
  rangeEnd: Temporal.ZonedDateTime;
  rangeStart: Temporal.ZonedDateTime;
  renderCurrentTimeIndicator?: CustomTimeIndicator;
  resource?: Resource;
  view?: CalendarView;
}

/**
 * Helper component that wraps CurrentTimeMarker in the test context.
 * Useful for both render and rerender calls.
 */
const Indicator = ({
  renderCurrentTimeIndicator,
  view,
  ...props
}: IndicatorProps) => (
  <TestWrapper
    renderCurrentTimeIndicator={renderCurrentTimeIndicator}
    view={view}
  >
    <CurrentTimeMarker {...props} />
  </TestWrapper>
);

const renderIndicator = (props: IndicatorProps) =>
  render(<Indicator {...props} />);

describe(CurrentTimeMarker, () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders correctly in a vertical time range (e.g. Day View column)", () => {
    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T10:30:00.000Z");

    renderIndicator({ now, rangeEnd, rangeStart });

    const indicator = screen.getByTestId("current-time-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.style.top).toBe("50%");
  });

  it("renders correctly in a multi-hour range", () => {
    const rangeStart = toZonedDateTime("2025-01-01T00:00:00.000Z");
    const rangeEnd = rangeStart.add({ days: 1 });
    const now = toZonedDateTime("2025-01-01T06:00:00.000Z");

    renderIndicator({ now, rangeEnd, rangeStart });

    const indicator = screen.getByTestId("current-time-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.style.top).toBe("25%");
  });

  it("does not render if now is before range", () => {
    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T09:59:59.999Z");

    renderIndicator({ now, rangeEnd, rangeStart });

    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("does not render if now is after range", () => {
    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T11:00:00.000Z");

    renderIndicator({ now, rangeEnd, rangeStart });

    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("respects date boundaries", () => {
    const jan1 = toZonedDateTime("2025-01-01T00:00:00.000Z");
    const jan1End = jan1.add({ days: 1 });
    const jan2 = toZonedDateTime("2025-01-02T00:00:00.000Z");
    const jan2End = jan2.add({ days: 1 });
    const now = toZonedDateTime("2025-01-01T12:00:00.000Z");

    const { rerender } = renderIndicator({
      now,
      rangeEnd: jan1End,
      rangeStart: jan1,
    });

    expect(screen.getByTestId("current-time-indicator")).toBeInTheDocument();

    // Use Indicator helper for rerender as well
    rerender(<Indicator now={now} rangeEnd={jan2End} rangeStart={jan2} />);
    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("uses custom renderCurrentTimeIndicator to render indicator content", () => {
    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T10:30:00.000Z");

    renderIndicator({
      now,
      rangeEnd,
      rangeStart,
      renderCurrentTimeIndicator: TEST_CUSTOM_RENDER,
      resource: { id: "test-resource", title: "Test Resource" },
      view: "week",
    });

    expect(screen.getByTestId("custom-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("custom-time")).toHaveTextContent("10:30");
    expect(screen.getByTestId("custom-progress")).toHaveTextContent("50%");
  });

  it("uses custom renderCurrentTimeIndicator with resource/view and suppresses default indicator", () => {
    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T10:30:00.000Z");

    renderIndicator({
      now,
      rangeEnd,
      rangeStart,
      renderCurrentTimeIndicator: TEST_CUSTOM_RENDER,
      resource: { id: "test-resource", title: "Test Resource" },
      view: "week",
    });

    expect(screen.getByTestId("custom-resource-id")).toHaveTextContent(
      "test-resource"
    );
    expect(screen.getByTestId("custom-view")).toHaveTextContent("week");
    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("resource is undefined when not provided", () => {
    let receivedResource: RenderCurrentTimeIndicatorProps["resource"];

    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T10:30:00.000Z");

    renderIndicator({
      now,
      rangeEnd,
      rangeStart,
      renderCurrentTimeIndicator: (
        renderProps: RenderCurrentTimeIndicatorProps
      ) => {
        receivedResource = renderProps.resource;

        return TEST_CUSTOM_RENDER(renderProps);
      },
    });

    expect(receivedResource).toBeUndefined();
  });

  it("passes correct timing props to custom render function", () => {
    const recorder = createRenderPropsRecorder();

    const rangeStart = toZonedDateTime("2025-01-01T08:00:00.000Z");
    const rangeEnd = toZonedDateTime("2025-01-01T18:00:00.000Z");
    const now = toZonedDateTime("2025-01-01T13:00:00.000Z");

    renderIndicator({
      now,
      rangeEnd,
      rangeStart,
      renderCurrentTimeIndicator: recorder.renderCurrentTimeIndicator,
    });

    const props = assertRenderProps(recorder.getReceived());
    expect(isSame(props.currentTime, now)).toBeTruthy();
    expect(props.progress).toBe(50);
  });

  it("passes correct resource, view, and axis props to custom render function", () => {
    const recorder = createRenderPropsRecorder();

    const rangeStart = toZonedDateTime("2025-01-01T08:00:00.000Z");
    const rangeEnd = toZonedDateTime("2025-01-01T18:00:00.000Z");
    const now = toZonedDateTime("2025-01-01T13:00:00.000Z");
    const resource: Resource = { id: "res-1", title: "Res 1" };
    const view = "day";

    renderIndicator({
      now,
      rangeEnd,
      rangeStart,
      resource,
      view,
      renderCurrentTimeIndicator: recorder.renderCurrentTimeIndicator,
    });

    const props = assertRenderProps(recorder.getReceived());
    expect(props.resource).toStrictEqual(resource);
    expect(props.view).toBe(view);
    expect(props.axis).toBe("vertical");
  });

  it('renders horizontally positioned default indicator when axis="horizontal"', () => {
    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T10:30:00.000Z");

    renderIndicator({ axis: "horizontal", now, rangeEnd, rangeStart });

    const indicator = screen.getByTestId("current-time-indicator");
    expect(indicator).toBeInTheDocument();
    // Horizontal axis positions by `left` (vertical positions by `top`).
    expect(indicator.style.left).toBe("50%");
    expect(indicator.style.top).toBe("");
  });

  it('forwards axis="horizontal" to custom render function', () => {
    const recorder = createRenderPropsRecorder();

    const rangeStart = toZonedDateTime("2025-01-01T10:00:00.000Z");
    const rangeEnd = rangeStart.add({ hours: 1 });
    const now = toZonedDateTime("2025-01-01T10:30:00.000Z");

    renderIndicator({
      now,
      rangeEnd,
      rangeStart,
      axis: "horizontal",
      renderCurrentTimeIndicator: recorder.renderCurrentTimeIndicator,
    });

    const props = assertRenderProps(recorder.getReceived());
    expect(props.axis).toBe("horizontal");
    expect(props.progress).toBe(50);
  });
});
