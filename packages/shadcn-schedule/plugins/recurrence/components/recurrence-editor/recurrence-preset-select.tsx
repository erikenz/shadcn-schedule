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
  detectPreset,
  getPresetLabel,
} from "@/plugins/recurrence/utils/recurrence-presets";
import type { RecurrencePreset } from "@/plugins/recurrence/utils/recurrence-presets";

// Presets offered in the picker. `once` is represented by the disabled toggle,
// so it is not listed here; `customize` reveals the detailed controls.
const PRESET_OPTIONS: RecurrencePreset[] = [
  "daily",
  "weekdays",
  "weeklyOnDay",
  "monthlyOnDay",
  "monthlyOnWeekday",
  "customize",
];

export const RecurrencePresetSelect: React.FC = () => {
  const { t } = useCalendarContext();
  const { opts, custom, reference, selectPreset } = useRecurrenceEditor();
  const preset = custom ? "customize" : detectPreset(opts, reference);

  const handlePresetChange = (p: string | null) => {
    if (p === null) {
      return;
    }

    const chosen = PRESET_OPTIONS.find((option) => option === p) ?? "customize";
    selectPreset(chosen);
  };

  return (
    <div>
      <Label className="text-xs" htmlFor="recurrence-preset">
        {t("repeats")}
      </Label>
      <Select
        items={PRESET_OPTIONS.map((p) => ({
          label: getPresetLabel(p, reference, t),
          value: p,
        }))}
        onValueChange={handlePresetChange}
        value={preset}
      >
        <SelectTrigger
          className="h-8 w-full"
          data-testid="preset-select"
          id="recurrence-preset"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((p) => (
            <SelectItem
              key={p}
              label={getPresetLabel(p, reference, t)}
              value={p}
            >
              {getPresetLabel(p, reference, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
