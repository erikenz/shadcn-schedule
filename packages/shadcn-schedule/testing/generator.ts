import type { CalendarEvent } from "@/types/index";
import { endOf, now, startOf } from "@/utils/temporal";

export const generateMockEvents = ({ count = 5 } = {}) => {
  const events: CalendarEvent[] = [];

  for (let i = 0; i < count; i += 1) {
    events.push({
      color: "bg-gray-100 text-gray-800",
      end: endOf(startOf(now(), "week").add({ days: i }), "day"),
      id: i.toString(),
      start: startOf(startOf(now(), "week").add({ days: i }), "day"),
      title: `Mock Event ${i + 1}`,
    });
  }

  return events;
};
