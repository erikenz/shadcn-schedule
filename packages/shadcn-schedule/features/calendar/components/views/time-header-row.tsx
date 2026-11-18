import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import { HourLabel } from "@/components/hour-label/hour-label";
import { RESOURCE_CELL_WIDTH } from "@/features/calendar/components/views/resource-axis";
import { cn } from "@/lib/cn";
import { HEADER_ROW_HEIGHT } from "@/lib/constants";
import { keys } from "@/lib/utils/keys";
import { format, isSame, now } from "@/utils/temporal";

interface TimeHeaderRowProps {
  hours: Temporal.ZonedDateTime[];
  view: "week" | "day";
}

export const TimeHeaderRow: React.FC<TimeHeaderRowProps> = ({
  hours,
  view,
}) => (
  <div className={cn("bg-border flex gap-px border-b", HEADER_ROW_HEIGHT)}>
    {hours.map((col, index) => {
      const isNowHour = isSame(col, now(), "hour");
      const hourStr = format(col, "HH");
      const key = keys.header.week.hour(col, index);

      return (
        <div
          className={cn(
            RESOURCE_CELL_WIDTH,
            "bg-background flex shrink-0 items-center justify-center text-xs",
            isNowHour && "bg-blue-50 font-medium text-blue-600"
          )}
          data-hour={hourStr}
          data-testid={keys.header.resource.timeLabel(view, hourStr)}
          key={key}
        >
          {/* `HourLabel` renders bare text, so the animated wrapper has to
					    carry the centering the cell used to apply directly. */}
          <AnimatedSection className="text-center" transitionKey={key}>
            <HourLabel date={col} />
          </AnimatedSection>
        </div>
      );
    })}
  </div>
);
