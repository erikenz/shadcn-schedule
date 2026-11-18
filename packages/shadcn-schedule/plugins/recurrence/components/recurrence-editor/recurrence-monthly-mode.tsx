import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { useRecurrenceEditor } from "@/plugins/recurrence/contexts/recurrence-editor-context";
import {
  FREQ,
  isWeekday,
} from "@/plugins/recurrence/utils/recurrence-constants";
import {
  getPresetLabel,
  resolveByweekday,
} from "@/plugins/recurrence/utils/recurrence-presets";

// "On day N" vs "on the Nth weekday", shown only for a custom monthly rule.
export const RecurrenceMonthlyMode: React.FC = () => {
  const { t } = useCalendarContext();
  const { opts, custom, reference, setMonthlyMode } = useRecurrenceEditor();

  if (!custom || opts?.freq !== FREQ.MONTHLY) {
    return null;
  }

  const isByWeekday = resolveByweekday(opts?.byweekday).some(
    (d) => isWeekday(d) && d.n !== undefined
  );

  const value = isByWeekday ? "weekday" : "day";

  const handleMonthlyModeChange = (m: string | null) => {
    setMonthlyMode(m === "weekday" ? "weekday" : "day");
  };

  return (
    <div>
      <Label className="text-xs" htmlFor="monthly-mode">
        {t("repeatOn")}
      </Label>
      <Select
        items={[
          {
            label: getPresetLabel("monthlyOnDay", reference, t),
            value: "day",
          },
          {
            label: getPresetLabel("monthlyOnWeekday", reference, t),
            value: "weekday",
          },
        ]}
        onValueChange={handleMonthlyModeChange}
        value={value}
      >
        <SelectTrigger
          className="h-8 w-full"
          data-testid="monthly-mode-select"
          id="monthly-mode"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            label={getPresetLabel("monthlyOnDay", reference, t)}
            value="day"
          >
            {getPresetLabel("monthlyOnDay", reference, t)}
          </SelectItem>
          <SelectItem
            label={getPresetLabel("monthlyOnWeekday", reference, t)}
            value="weekday"
          >
            {getPresetLabel("monthlyOnWeekday", reference, t)}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
