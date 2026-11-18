import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { Calendar as CalendarIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { format, toZonedDateTime } from "@/utils/temporal";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerProps {
  className?: string;
  closeOnSelect?: boolean;
  date: Date | undefined;
  disabled?: (date: Date) => boolean;
  label?: string;
  onChange?: (date: Date | undefined) => void;
}

export const DatePicker = ({
  date,
  closeOnSelect,
  onChange,
  label = "Pick a date",
  className,
  disabled,
}: DatePickerProps) => {
  const firstDayOfWeek = useSmartCalendarContext(
    (context) => context.firstDayOfWeek
  );

  const [open, setOpen] = useState(false);
  // The selection is optimistic (the consumer may ignore `undefined`), and
  // re-seeded from the `date` prop while rendering so the trigger never shows
  // the previous date.
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);
  const [lastDate, setLastDate] = useState<Date | undefined>(date);

  if (lastDate !== date) {
    setLastDate(date);
    setSelectedDate(date);
  }

  const handleDateSelect = useCallback(
    (selected: Date | undefined) => {
      setSelectedDate(selected);

      if (closeOnSelect === true) {
        setOpen(false);
      }

      onChange?.(selected);
    },
    [closeOnSelect, onChange]
  );

  return (
    <div className={className}>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button
              className={cn(
                "data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
              )}
              data-empty={!date}
              variant="outline"
            >
              <CalendarIcon />
              {selectedDate ? (
                format(toZonedDateTime(selectedDate), "MMM D, YYYY")
              ) : (
                <span>{label}</span>
              )}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            defaultMonth={selectedDate}
            disabled={disabled}
            firstDayOfWeek={firstDayOfWeek}
            onSelect={handleDateSelect}
            selected={selectedDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
