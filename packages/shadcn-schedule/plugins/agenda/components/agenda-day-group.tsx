import type { ReactNode } from "react";

import { CurrentTimeIndicator } from "@/components/ui/current-time-indicator";
import type { CurrentTimeIndicatorRenderProps } from "@/components/ui/current-time-indicator";
import { DayLabel } from "@/components/ui/day-label";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { AgendaEventRow } from "@/plugins/agenda/components/agenda-event-row";
import type { AgendaDayGroupData } from "@/plugins/agenda/utils/group-events-by-day";
import { listKey } from "@/utils/helpers";
import { endOf, format, isSame, now, startOf } from "@/utils/temporal";

interface AgendaDayGroupProps {
  group: AgendaDayGroupData;
}

export const AgendaDayGroup = ({ group }: AgendaDayGroupProps) => {
  const { view, renderCurrentTimeIndicator } = useCalendarContext();
  const isToday = isSame(group.date, now(), "day");

  let renderIndicator:
    | ((props: CurrentTimeIndicatorRenderProps) => ReactNode)
    | undefined;

  if (renderCurrentTimeIndicator) {
    // oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
    renderIndicator = (props) => renderCurrentTimeIndicator({ ...props, view });
  }

  return (
    <div
      className="flex gap-4 border-b px-2 py-3"
      data-testid={listKey("agenda-day", group.key)}
    >
      <div className="text-muted-foreground flex w-16 shrink-0 flex-col items-center text-center">
        <DayLabel
          className="flex-col-reverse"
          dayNumber={format(group.date, "D")}
          today={isToday}
          weekday={format(group.date, "ddd")}
        />
      </div>
      {/* Treat the day group as a full day: the shared indicator positions a
			    red line at the current time's % through the day (today only). */}
      <div className="relative flex flex-1 flex-col gap-1">
        {isToday && (
          <CurrentTimeIndicator
            rangeEnd={endOf(group.date, "day")}
            rangeStart={startOf(group.date, "day")}
            render={renderIndicator}
          />
        )}
        {group.events.map((event) => (
          <AgendaEventRow
            day={group.date}
            event={event}
            key={listKey(group.key, event.id)}
          />
        ))}
      </div>
    </div>
  );
};
