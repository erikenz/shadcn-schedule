import type { Temporal } from "temporal-polyfill";

import { hasText } from "@/lib/guards";
import type { CalendarEvent } from "@/types/index";
import { format, now } from "@/utils/temporal";

const CRLF = "\r\n";

const UTC_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:UTC",
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZNAME:UTC",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0000",
  "END:STANDARD",
  "END:VTIMEZONE",
].join(CRLF);

const escapeText = (text: string): string =>
  text
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");

export type CollectFn = (point: string, event: CalendarEvent) => unknown[];

const formatDate = (date: Temporal.ZonedDateTime, isAllDay = false): string => {
  if (isAllDay) {
    return format(date, "YYYYMMDD");
  }

  return format(date.withTimeZone("UTC"), "YYYYMMDD[T]HHmmss[Z]");
};

const convertEventToVEvent = (
  event: CalendarEvent,
  collect: CollectFn
): string[] => {
  const timestamp = format(now("UTC"), "YYYYMMDD[T]HHmmss[Z]");
  const uid = event.uid ?? `${event.id}@calendar.local`;

  const coreLines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    event.allDay === true
      ? `DTSTART;VALUE=DATE:${formatDate(event.start, true)}`
      : `DTSTART:${formatDate(event.start)}`,
    event.allDay === true
      ? `DTEND;VALUE=DATE:${formatDate(event.end, true)}`
      : `DTEND:${formatDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    hasText(event.description)
      ? `DESCRIPTION:${escapeText(event.description)}`
      : null,
    hasText(event.location) ? `LOCATION:${escapeText(event.location)}` : null,
  ].filter((line): line is string => line !== null);

  const extra = collect("ical:vevent-properties", event);

  const trailingLines = [
    `DTSTAMP:${timestamp}`,
    `CREATED:${timestamp}`,
    `LAST-MODIFIED:${timestamp}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];

  return [...coreLines, ...extra, ...trailingLines].join(CRLF).split(CRLF);
};

export const exportToICalendar = (
  events: CalendarEvent[],
  collect: CollectFn,
  calendarName = "Calendar"
): string => {
  const name = escapeText(calendarName);

  const veventStrings = events.map((event) =>
    convertEventToVEvent(event, collect)
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//shadcn-schedule//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${name}`,
    `X-WR-CALDESC:Exported from ${name}`,
    UTC_VTIMEZONE,
    ...veventStrings,
    "END:VCALENDAR",
  ].join(CRLF);
};

export const downloadICalendar = (
  events: CalendarEvent[],
  collect: CollectFn,
  filename = "calendar.ics",
  calendarName = "Calendar"
): void => {
  const blob = new Blob([exportToICalendar(events, collect, calendarName)], {
    type: "text/calendar;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  let normalizedFilename = filename;

  if (!filename.endsWith(".ics")) {
    normalizedFilename = `${filename}.ics`;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = normalizedFilename;

  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
