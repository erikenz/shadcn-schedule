import { ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import type { Temporal } from "temporal-polyfill";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MonthGrid } from "@/features/calendar/components/header/month-grid";
import { YearGrid } from "@/features/calendar/components/header/year-grid";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { useDateTimeFormatters } from "@/hooks/use-date-time-formatters";
import { cn } from "@/lib/cn";
import { getWeekDays } from "@/lib/utils/date-utils";
import type { NavUnit, PluginView } from "@/types/index";
import { format, toDate, toZonedDateTime } from "@/utils/temporal";

interface HeaderDatePickerProps {
  className?: string;
}

type PickerKind = "day" | "week" | "month" | "year" | "range";

// A single navigation unit maps to that grid's picker; everything else is a range.
const PICKER_BY_UNIT: Partial<Record<NavUnit, PickerKind>> = {
  day: "day",
  month: "month",
  week: "week",
  year: "year",
};

// The title dropdown is a jump-to-date aid, so its picker form (and the title
// format) follow how far the view navigates — metadata every view already
// declares for prev/next via `navigationStep` / `navigationUnit`. A view that
// steps a single day/week/month/year borrows that grid's picker; anything else
// (a multi-unit or custom window) has no single cell to pick, so it shows the day
// picker over the view's range. Nothing here references a view by name, so core
// stays agnostic of agenda or any third-party view. Mirrors the step resolution
// in use-calendar-navigation.
const pickerKind = (view: PluginView | undefined): PickerKind => {
  const step = view?.navigationStep ?? {
    amount: 1,
    unit: view?.navigationUnit ?? "day",
  };

  if (step.amount !== 1) {
    return "range";
  }

  return PICKER_BY_UNIT[step.unit] ?? "range";
};

// The header title doubles as a navigation dropdown: clicking it opens a
// view-appropriate picker (day grid, week grid, month grid, or year grid).
export const HeaderDatePicker = ({ className }: HeaderDatePickerProps) => {
  const {
    currentDate,
    currentRange,
    view,
    selectDate,
    firstDayOfWeek,
    getViews,
  } = useSmartCalendarContext((ctx) => ({
    currentDate: ctx.currentDate,
    currentRange: ctx.currentRange,
    firstDayOfWeek: ctx.firstDayOfWeek,
    getViews: ctx.getViews,
    selectDate: ctx.selectDate,
    view: ctx.view,
  }));

  const { formatDateRange } = useDateTimeFormatters();
  const [open, setOpen] = useState(false);

  const weekDays = getWeekDays(currentDate, firstDayOfWeek);
  const weekStart = weekDays.at(0) ?? currentDate;
  const weekEnd = weekDays.at(-1) ?? currentDate;

  // Both 'day' and 'range' navigate within days, so both use the day calendar;
  // only their titles differ.
  const handleSelect = useCallback(
    (date: Temporal.ZonedDateTime) => {
      selectDate(date);
      setOpen(false);
    },
    [selectDate]
  );

  const handleDayPick = useCallback(
    (date: Date | undefined) => {
      if (date) {
        handleSelect(toZonedDateTime(date));
      }
    },
    [handleSelect]
  );

  const dayPicker = (
    <Calendar
      defaultMonth={toDate(currentDate)}
      firstDayOfWeek={firstDayOfWeek}
      onSelect={handleDayPick}
      selected={toDate(currentDate)}
    />
  );

  const titleByKind: Record<PickerKind, string> = {
    day: format(currentDate, "ddd, MMM D, YYYY"),
    month: format(currentDate, "MMM YYYY"),
    // A multi-unit/custom window shows its listed range, not a single day.
    range: formatDateRange(currentRange.start, currentRange.end),
    week: formatDateRange(weekStart, weekEnd),
    year: format(currentDate, "YYYY"),
  };

  // Title and picker are keyed by the derived picker kind, not the view name.
  const kind = pickerKind(getViews().find((v) => v.name === view));
  const title = titleByKind[kind];

  const contentByKind: Record<PickerKind, ReactNode> = {
    day: dayPicker,
    month: <MonthGrid onSelect={handleSelect} selected={currentDate} />,
    range: dayPicker,
    week: (
      <Calendar
        defaultMonth={toDate(currentDate)}
        firstDayOfWeek={firstDayOfWeek}
        highlightedWeekOf={currentDate}
        onSelect={handleDayPick}
        weekHover
      />
    ),
    year: <YearGrid onSelect={handleSelect} selected={currentDate} />,
  };

  const content = contentByKind[kind];

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className={cn("font-semibold", className)}
            data-testid="calendar-title"
            variant="outline"
          >
            {title}
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        {content}
      </PopoverContent>
    </Popover>
  );
};
