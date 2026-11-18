import { cn } from "@/lib/cn";
import { useCallback, useState } from "react";
import type { Temporal } from "temporal-polyfill";

import {
  getMonthWeeks,
  getWeekDays,
  isToday,
} from "@/lib/utils/date-utils";
import {
  format,
  isAfter,
  isBefore,
  isSame,
  now,
  startOf,
  toDate,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";
import { PickerNav } from "@/components/ui/picker-nav";

interface CalendarProps {
  className?: string;
  defaultMonth?: Date;
  disabled?: (date: Date) => boolean;
  firstDayOfWeek?: number;
  /** Statically highlight the week containing this day (the current week). The
   *  hover preview takes over while the pointer is over the calendar. */
  highlightedWeekOf?: Temporal.ZonedDateTime;
  onSelect?: (date: Date | undefined) => void;
  selected?: Date;
  /** Highlight the whole week (the table row) on hover, as one continuous bar —
   *  for the week picker. Pure CSS via the row's hover state, no JS. */
  weekHover?: boolean;
}

interface DayState {
  isCurrent: boolean;
  isCurrentWeek: boolean;
  isDisabled: boolean;
  isOutside: boolean;
  isSelected: boolean;
  weekHover: boolean;
}

// Range fill lives on the cell and only the row's ends are rounded, so a week
// reads as one continuous bar. The current week mirrors the day picker's
// selected day (solid `bg-primary`) and stays put; hovering a different week
// shows a lighter `bg-accent` band, exactly like per-day hover. Both can show
// at once, so hovering never clears the active week.
const getCellClass = (state: DayState): string => {
  const hoverBand = state.weekHover && !state.isCurrentWeek;

  return cn(
    "p-0 text-center",
    state.weekHover && "first:rounded-l-md last:rounded-r-md",
    hoverBand && "group-hover/week:bg-accent",
    state.isCurrentWeek && "bg-primary"
  );
};

const getDayButtonClass = (state: DayState): string =>
  cn(
    "aspect-square w-full text-sm select-none",
    !state.isDisabled && "cursor-pointer",
    // Day picker: per-day hover pill. Week picker: the row band is the
    // feedback, so the button stays transparent.
    !(state.weekHover || state.isDisabled) && "hover:bg-accent rounded-md",
    state.isOutside && "text-muted-foreground/50",
    state.isCurrent && "ring-foreground/40 rounded-md ring-1 ring-inset",
    // Active week reads like the selected day: solid fill, inverted text.
    state.isCurrentWeek && "text-primary-foreground font-medium",
    state.isSelected &&
      "bg-primary text-primary-foreground rounded-md font-medium",
    state.isDisabled && "cursor-not-allowed opacity-50"
  );

const DayCell = ({
  day,
  state,
  onSelect,
}: {
  day: Temporal.ZonedDateTime;
  state: DayState;
  onSelect?: (date: Date | undefined) => void;
}) => {
  const handleClick = useCallback(
    () => onSelect?.(toDate(day)),
    [day, onSelect]
  );

  return (
    <td
      className={getCellClass(state)}
      data-disabled={state.isDisabled}
      data-outside={state.isOutside}
      data-selected={state.isSelected}
    >
      <button
        aria-disabled={state.isDisabled}
        aria-hidden={state.isOutside}
        className={getDayButtonClass(state)}
        data-disabled={state.isDisabled}
        data-selected={state.isSelected}
        disabled={state.isDisabled || state.isOutside}
        onClick={handleClick}
        tabIndex={state.isOutside ? -1 : 0}
        type="button"
      >
        {format(day, "D")}
      </button>
    </td>
  );
};

export const Calendar = ({
  selected,
  defaultMonth,
  onSelect,
  disabled,
  firstDayOfWeek = 0,
  className,
  weekHover = false,
  highlightedWeekOf,
}: CalendarProps) => {
  const [viewMonth, setViewMonth] = useState<Temporal.ZonedDateTime>(() =>
    startOf(toZonedDateTime(defaultMonth ?? selected ?? new Date()), "month")
  );

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => m.add({ months: 1 }));
  }, []);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => m.subtract({ months: 1 }));
  }, []);

  const weeks = getMonthWeeks(viewMonth, firstDayOfWeek);

  const selectedKey = selected
    ? format(toZonedDateTime(selected), "YYYY-MM-DD")
    : undefined;

  const weekdayHeaders = getWeekDays(now(), firstDayOfWeek).map((d) =>
    format(d, "dd")
  );

  let highlightStart: Temporal.ZonedDateTime | undefined;
  let highlightEnd: Temporal.ZonedDateTime | undefined;

  if (highlightedWeekOf) {
    const highlightedWeek = getWeekDays(highlightedWeekOf, firstDayOfWeek);
    highlightStart = highlightedWeek.at(0);
    highlightEnd = highlightedWeek.at(-1);
  }

  const toDayState = (day: Temporal.ZonedDateTime): DayState => {
    const isSelected = format(day, "YYYY-MM-DD") === selectedKey;
    let isCurrentWeek = false;

    if (highlightStart && highlightEnd) {
      const onOrAfterStart = !isBefore(day, highlightStart);
      const onOrBeforeEnd = !isAfter(day, highlightEnd);
      isCurrentWeek = onOrAfterStart && onOrBeforeEnd;
    }

    return {
      isCurrent: isToday(day) && !isSelected,
      isDisabled: disabled?.(toDate(day)) ?? false,
      isOutside: !isSame(day, viewMonth, "month"),
      isCurrentWeek,
      isSelected,
      weekHover,
    };
  };

  return (
    <div
      className={cn("bg-background w-72 p-3", className)}
      data-slot="calendar"
    >
      <PickerNav
        label={format(viewMonth, "MMMM YYYY")}
        nextLabel="Next month"
        onNext={handleNextMonth}
        onPrev={handlePrevMonth}
        prevLabel="Previous month"
      />

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {weekdayHeaders.map((label) => (
              <th
                className="text-muted-foreground py-1 text-xs font-medium select-none"
                key={label}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
            const [firstDay] = week;

            if (firstDay === undefined) {
              return null;
            }

            return (
              <tr
                className={cn(weekHover && "group/week")}
                key={toISOString(firstDay)}
              >
                {week.map((day) => (
                  <DayCell
                    day={day}
                    key={toISOString(day)}
                    onSelect={onSelect}
                    state={toDayState(day)}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
