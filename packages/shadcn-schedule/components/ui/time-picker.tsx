import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { cn } from "@/lib/cn";
import { Clock } from "lucide-react";

import { useAutocompleteTimepicker } from "@/hooks/use-autocomplete-timepicker";
import { keys } from "@/lib/utils/keys";
import type { TimeFormat } from "@/types/index";

interface TimePickerProps {
  className?: string;
  disabled?: boolean;
  maxTime?: string;
  minTime?: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  timeFormat?: TimeFormat;
  value: string;
}

/**
 * Time-of-day picker: a button showing the current value that opens a searchable
 * list of times. The list, the filtering, the keyboard navigation and the ARIA
 * wiring all come from the design system's Base UI combobox, which renders the
 * trigger as the combobox itself.
 */
export const TimePicker = ({
  value,
  onChange,
  minTime = "00:00",
  maxTime = "23:45",
  timeFormat = "12-hour",
  placeholder = "Select time...",
  className,
  disabled = false,
  name,
}: TimePickerProps) => {
  const { timeOptions, formatTime } = useAutocompleteTimepicker({
    maxTime,
    minTime,
    timeFormat,
  });

  return (
    <Combobox
      disabled={disabled}
      itemToStringValue={formatTime}
      items={timeOptions}
      onValueChange={(next) => {
        if (next !== null) {
          onChange(next);
        }
      }}
      value={value === "" ? null : value}
    >
      <ComboboxTrigger
        render={
          <Button
            className={cn("w-full justify-start", className)}
            data-testid={keys.timePicker(name)}
            disabled={disabled}
            variant="outline"
          />
        }
      >
        <Clock className="mr-2 h-4 w-4" />
        <ComboboxValue>
          {() => (value === "" ? placeholder : formatTime(value))}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="Search time..." showTrigger={false} />
        <ComboboxEmpty>N/A</ComboboxEmpty>
        <ComboboxList>
          {(time: string) => (
            <ComboboxItem key={time} value={time}>
              {formatTime(time)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
