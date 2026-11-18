import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { downloadICalendar } from "@/lib/utils/export-ical";
import { format, now } from "@/utils/temporal";

// Single source for the header's iCal export, used by the Export button.
export const useExportCalendar = (): (() => void) => {
  const { rawEvents, collect } = useSmartCalendarContext((ctx) => ({
    collect: ctx.collect,
    rawEvents: ctx.rawEvents,
  }));

  return () => {
    const filename = `calendar-${format(now(), "YYYY-MM-DD")}.ics`;
    downloadICalendar(rawEvents, collect, filename, "Calendar");
  };
};
