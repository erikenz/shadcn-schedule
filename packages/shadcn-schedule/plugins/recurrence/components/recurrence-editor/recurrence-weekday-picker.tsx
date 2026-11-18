import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { useRecurrenceEditor } from "@/plugins/recurrence/contexts/recurrence-editor-context";
import {
  FREQ,
  WEEKDAY_ORDER,
} from "@/plugins/recurrence/utils/recurrence-constants";
import { resolveByweekday } from "@/plugins/recurrence/utils/recurrence-presets";
import { listKey } from "@/utils/helpers";
import { format, now, startOf } from "@/utils/temporal";

// Weekday checkboxes, shown only for a custom weekly rule.
export const RecurrenceWeekdayPicker: React.FC = () => {
  const { t, firstDayOfWeek } = useCalendarContext();
  const { opts, custom, toggleDay } = useRecurrenceEditor();

  if (!custom || opts?.freq !== FREQ.WEEKLY) {
    return null;
  }

  const selected = resolveByweekday(opts?.byweekday);
  const selectedSet = new Set(selected);

  const options = WEEKDAY_ORDER.map((value, index) => ({
    label: format(startOf(now(), "week").add({ days: index }), "ddd"),
    value,
  }));

  // Rotate so the configured first day of the week leads.
  const ordered = [
    ...options.slice(firstDayOfWeek),
    ...options.slice(0, firstDayOfWeek),
  ];

  return (
    <div>
      <Label className="text-xs">{t("repeatOn")}</Label>
      <div className="mt-1 flex flex-wrap gap-1">
        {ordered.map((d, i) => {
          const handleToggle = () => {
            toggleDay(d.value);
          };

          return (
            <div
              className="flex items-center space-x-1"
              key={listKey("weekday", i)}
            >
              <Checkbox
                checked={selectedSet.has(d.value)}
                id={listKey("day", i)}
                onCheckedChange={handleToggle}
              />
              <Label
                className="cursor-pointer text-xs"
                htmlFor={listKey("day", i)}
              >
                {d.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
