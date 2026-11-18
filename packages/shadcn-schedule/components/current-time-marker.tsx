import { memo } from "react";
import type { ReactNode } from "react";
import type { Temporal } from "temporal-polyfill";

import { CurrentTimeIndicator } from "@/components/ui/current-time-indicator";
import type { CurrentTimeIndicatorRenderProps } from "@/components/ui/current-time-indicator";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { Resource } from "@/types/index";

interface CurrentTimeMarkerProps {
  axis?: "vertical" | "horizontal";
  now?: Temporal.ZonedDateTime;
  rangeEnd: Temporal.ZonedDateTime;
  rangeStart: Temporal.ZonedDateTime;
  resource?: Resource;
  withDot?: boolean;
}

/**
 * Calendar wrapper over the shared `@repo/design-system` CurrentTimeIndicator: wires the
 * consumer's `renderCurrentTimeIndicator` and the current `view` from context,
 * adding `view`/`resource` to the shared component's computed position.
 */
const NoMemoCurrentTimeMarker = ({
  rangeStart,
  rangeEnd,
  now,
  resource,
  axis = "vertical",
  withDot,
}: CurrentTimeMarkerProps) => {
  const { renderCurrentTimeIndicator, view } = useSmartCalendarContext(
    (state) => ({
      renderCurrentTimeIndicator: state.renderCurrentTimeIndicator,
      view: state.view,
    })
  );

  let render:
    | ((props: CurrentTimeIndicatorRenderProps) => ReactNode)
    | undefined;

  if (renderCurrentTimeIndicator) {
    // oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
    render = (props) =>
      renderCurrentTimeIndicator({ ...props, resource, view });
  }

  return (
    <CurrentTimeIndicator
      axis={axis}
      now={now}
      rangeEnd={rangeEnd}
      rangeStart={rangeStart}
      render={render}
      withDot={withDot}
    />
  );
};

export const CurrentTimeMarker = memo(NoMemoCurrentTimeMarker);
