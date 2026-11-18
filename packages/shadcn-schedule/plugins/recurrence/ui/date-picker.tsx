import type { ChangeEventHandler, FC } from "react";
import type { Temporal } from "temporal-polyfill";

import { cn } from "@/lib/cn";
import { format, toDate, toZonedDateTime } from "@/utils/temporal";

interface DatePickerProps {
  className?: string;
  date: Date | undefined;
  /**
   * Receives start of day in the calendar's configured timezone, which east of
   * UTC is the previous UTC day. Callers that need a whole-day boundary must
   * normalize (`toZonedDateTime(value).endOf('day')`) rather than use the instant as-is.
   */
  onChange?: (date?: Date) => void;
}

/**
 * `<input type="date">` both renders and reports its value in this shape, so it
 * is used for display formatting only — never as a parse format. The configured
 * The Temporal parser (`utils/temporal`) treats strings without an offset as
 * wall time in the default zone, so passing a parse format as a second argument
 * format throws `RangeError: invalid time zone`.
 */
const DATE_INPUT_FORMAT = "YYYY-MM-DD";

export const DatePicker: FC<DatePickerProps> = ({
  date,
  onChange,
  className,
}) => {
  const inputValue = date
    ? format(toZonedDateTime(date), DATE_INPUT_FORMAT)
    : "";

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const raw = event.target.value;

    if (!raw) {
      onChange?.();

      return;
    }

    // `raw` is already an ISO date ('YYYY-MM-DD') from the native date input, so
    // the single-argument constructor parses it correctly and honours the
    // calendar's configured timezone.
    let parsed: Temporal.ZonedDateTime | null = null;

    try {
      parsed = toZonedDateTime(raw);
    } catch {
      parsed = null;
    }

    onChange?.(parsed ? toDate(parsed) : undefined);
  };

  return (
    <input
      className={cn(
        "border-input focus-visible:ring-ring/50 flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={handleChange}
      type="date"
      value={inputValue}
    />
  );
};
