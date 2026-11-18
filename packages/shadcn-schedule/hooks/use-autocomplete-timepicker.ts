import { useMemo } from "react";

import type { TimeFormat } from "@/types/index";

interface UseAutocompleteTimepickerProps {
  maxTime?: string;
  minTime?: string;
  timeFormat?: TimeFormat;
}

/**
 * Splits an "HH:mm" string into its numeric parts. A missing part comes back as
 * NaN, so a malformed time (e.g. "09") keeps behaving as it always has: the
 * option loop generates nothing and the label reads "NaN".
 */
const parseTimeParts = (time: string): [hours: number, minutes: number] => {
  const [hours = Number.NaN, minutes = Number.NaN] = time
    .split(":")
    .map(Number);

  return [hours, minutes];
};

export const useAutocompleteTimepicker = ({
  timeFormat = "12-hour",
  minTime = "00:00",
  maxTime = "23:45",
}: UseAutocompleteTimepickerProps) => {
  // Generate time options (15-minute intervals) within min/max range
  const timeOptions = useMemo(() => {
    const times: string[] = [];
    const [minHour, minMinute] = parseTimeParts(minTime);
    const [maxHour, maxMinute] = parseTimeParts(maxTime);

    const minTotalMinutes = minHour * 60 + minMinute;
    const maxTotalMinutes = maxHour * 60 + maxMinute;

    for (
      let totalMinutes = minTotalMinutes;
      totalMinutes <= maxTotalMinutes;
      totalMinutes += 15
    ) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      times.push(timeString);
    }

    return times;
  }, [minTime, maxTime]);

  const formatTime = (time: string) => {
    const [hours, minutes] = parseTimeParts(time);

    if (timeFormat === "24-hour") {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }

    const period = hours >= 12 ? "PM" : "AM";
    let displayHours = hours;

    if (hours === 0) {
      displayHours = 12;
    } else if (hours > 12) {
      displayHours = hours - 12;
    }

    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return {
    formatTime,
    timeOptions,
  };
};
