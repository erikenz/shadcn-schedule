import { cleanup, render, screen } from "@testing-library/react";
import type { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { VerticalGridEventsLayer } from "@/components/vertical-grid/vertical-grid-events-layer";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import type { CalendarProviderProps } from "@/features/calendar/contexts/calendar-context/provider";
import type { RenderCurrentTimeIndicatorProps } from "@/features/calendar/types/index";
import type { CalendarView, Resource } from "@/types/index";
import {
  now,
  resetNow,
  setNow,
  startOf,
  toZonedDateTime,
} from "@/utils/temporal";

/**
 * Shared custom render implementation for tests.
 */
const TEST_CUSTOM_RENDER = ({ resource }: RenderCurrentTimeIndicatorProps) => (
  <div data-testid="custom-indicator">
    <span data-testid="resource-id">{resource?.id ?? "none"}</span>
  </div>
);

type CustomTimeIndicator = NonNullable<
  CalendarProviderProps["renderCurrentTimeIndicator"]
>;

// Test wrapper using the real CalendarProvider with only the props the
// events layer tests need; the engine fills in the rest of the context.
const TestWrapper: React.FC<{
  children: React.ReactNode;
  renderCurrentTimeIndicator?: CustomTimeIndicator;
  view?: CalendarView;
}> = ({ children, renderCurrentTimeIndicator, view = "day" }) => (
  <CalendarProvider
    events={[]}
    initialView={view}
    renderCurrentTimeIndicator={renderCurrentTimeIndicator}
  >
    {children}
  </CalendarProvider>
);

const renderEventsLayer = ({
  renderCurrentTimeIndicator,
  view,
  ...props
}: {
  days: Temporal.ZonedDateTime[];
  renderCurrentTimeIndicator?: CustomTimeIndicator;
  resource?: Resource;
  view?: CalendarView;
  gridType?: "day" | "hour";
  "data-testid"?: string;
}) =>
  render(
    <TestWrapper
      renderCurrentTimeIndicator={renderCurrentTimeIndicator}
      view={view}
    >
      <VerticalGridEventsLayer {...props} />
    </TestWrapper>
  );

describe(VerticalGridEventsLayer, () => {
  beforeEach(() => {
    // Pin the clock so current-time gating is deterministic (Temporal.Now is
    // not controllable by fake timers, and real now() can drift across an
    // hour/day boundary mid-test).
    setNow(toZonedDateTime("2025-01-01T10:30:00.000Z"));
    cleanup();
  });

  afterEach(() => {
    resetNow();
  });

  it("renders current time indicator when current time is within range", () => {
    const current = now();
    const rangeStart = startOf(current, "hour");
    const hours = [rangeStart];

    renderEventsLayer({ "data-testid": "events-layer", days: hours });

    expect(screen.getByTestId("current-time-indicator")).toBeInTheDocument();
  });

  it("renders the indicator in hour-resolution grids", () => {
    const current = now();
    const rangeStart = startOf(current, "hour");

    renderEventsLayer({
      "data-testid": "events-layer",
      days: [rangeStart],
      gridType: "hour",
    });

    expect(screen.getByTestId("current-time-indicator")).toBeInTheDocument();
  });

  it("does not render the indicator in day-resolution grids (issue #123)", () => {
    // Day-resolution vertical views (resource month, resource week daily) span
    // whole days, so a sub-day "now" line is meaningless and should be hidden,
    // even though the current day is within range.
    const today = startOf(now(), "day");

    renderEventsLayer({
      "data-testid": "events-layer",
      days: [today],
      gridType: "day",
    });

    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("does not render current time indicator when current time is outside range", () => {
    const futureDate = toZonedDateTime("2099-01-01T10:00:00.000Z");
    const hours = [futureDate];

    renderEventsLayer({ "data-testid": "events-layer", days: hours });

    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("uses custom renderCurrentTimeIndicator from context", () => {
    const current = now();
    const rangeStart = startOf(current, "hour");
    const hours = [rangeStart];
    const resource = { id: "res-2", title: "Resource 2" };

    renderEventsLayer({
      "data-testid": "events-layer",
      days: hours,
      renderCurrentTimeIndicator: TEST_CUSTOM_RENDER,
      resource,
    });

    expect(screen.getByTestId("custom-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("resource-id")).toHaveTextContent("res-2");
    expect(
      screen.queryByTestId("current-time-indicator")
    ).not.toBeInTheDocument();
  });

  it("passes resource to CurrentTimeIndicator", () => {
    let receivedResource: Resource | undefined;

    const current = now();
    const rangeStart = startOf(current, "hour");
    const hours = [rangeStart];
    const resource = { id: "res-5", title: "Resource 5" };

    renderEventsLayer({
      "data-testid": "events-layer",
      days: hours,
      renderCurrentTimeIndicator: (props) => {
        receivedResource = props.resource;

        return TEST_CUSTOM_RENDER(props);
      },
      resource,
    });

    expect(receivedResource).toStrictEqual(resource);
  });

  it("resource defaults to undefined", () => {
    let receivedResource: Resource | undefined;

    const current = now();
    const rangeStart = startOf(current, "hour");
    const hours = [rangeStart];

    renderEventsLayer({
      "data-testid": "events-layer",
      days: hours,
      renderCurrentTimeIndicator: (props) => {
        receivedResource = props.resource;

        return TEST_CUSTOM_RENDER(props);
      },
    });

    expect(receivedResource).toBeUndefined();
  });
});
