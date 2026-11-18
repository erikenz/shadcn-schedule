import type { Temporal } from "temporal-polyfill";

import type { DateTimeInput } from "@/utils/temporal";
import { toZonedDateTime } from "@/utils/temporal";

/**
 * Coerces an optional date-ish value into a ZonedDateTime, or undefined when
 * it is missing (undefined/null) or unparseable. Already-ZonedDateTime values
 * pass through untouched.
 */

const HEX_COLOR_PATTERN = /^[0-9a-fA-F]{6}$/u;

export const safeDate = (
  date: DateTimeInput | null
): Temporal.ZonedDateTime | undefined => {
  if (date === null) {
    return undefined;
  }

  try {
    return toZonedDateTime(date);
  } catch {
    return undefined;
  }
};

/**
 * Composes a stable string from parts, for React `key=` props and element ids
 * (e.g. `listKey('day', 3)` -> `'day-3'`).
 */
export const listKey = (...parts: (string | number)[]): string =>
  parts.join("-");

/**
 * Picks black or white as the most readable text color over a solid hex
 * background. Uses the standard YIQ perceived-brightness formula
 * (https://www.w3.org/TR/AERT/#color-contrast): brightness >= 128 is a light
 * background and gets dark text, otherwise white. Accepts `#rgb` or `#rrggbb`;
 * an unparseable value falls back to dark text.
 */
export const readableTextColor = (hex: string): "#000000" | "#ffffff" => {
  const normalized = hex.replace("#", "");

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;

  if (!HEX_COLOR_PATTERN.test(expanded)) {
    return "#000000";
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness >= 128 ? "#000000" : "#ffffff";
};
