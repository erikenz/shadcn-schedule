import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { numberOr } from "@/lib/guards";
import { useRecurrenceEditor } from "@/plugins/recurrence/contexts/recurrence-editor-context";
import { FREQ } from "@/plugins/recurrence/utils/recurrence-constants";

const FREQ_MAP = {
  DAILY: FREQ.DAILY,
  MONTHLY: FREQ.MONTHLY,
  WEEKLY: FREQ.WEEKLY,
  YEARLY: FREQ.YEARLY,
};

type FreqName = keyof typeof FREQ_MAP;

// The select only ever emits the keys above; this narrows `onValueChange`'s free
// string back to the codes FREQ_MAP knows.
const isFreqName = (value: string): value is FreqName =>
  Object.hasOwn(FREQ_MAP, value);

// Reverse lookup for the select's current value: frequency code -> select key.
const FREQ_TO_STR = new Map<number, string>(
  Object.entries(FREQ_MAP).map(([name, code]) => [code, name])
);

const parseInterval = (v: string) => Math.max(1, Math.trunc(Number(v)) || 1);

// Frequency + interval, shown only while customizing.
export const RecurrenceFrequencyFields: React.FC = () => {
  const { t } = useCalendarContext();
  const { opts, custom, update } = useRecurrenceEditor();

  if (!custom) {
    return null;
  }

  const freqStr = FREQ_TO_STR.get(opts?.freq ?? FREQ.DAILY) ?? "DAILY";
  const interval = numberOr(opts?.interval, 1);

  const handleFreqChange = (f: string | null) => {
    if (f !== null && isFreqName(f)) {
      update({ freq: FREQ_MAP[f] });
    }
  };

  const handleIntervalChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ interval: parseInterval(e.target.value) });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-xs" htmlFor="frequency">
          {t("frequency")}
        </Label>
        <Select
          items={Object.keys(FREQ_MAP).map((f) => ({
            label: t(f.toLowerCase()),
            value: f,
          }))}
          onValueChange={handleFreqChange}
          value={freqStr}
        >
          <SelectTrigger
            className="h-8 w-full"
            data-testid="frequency-select"
            id="frequency"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(FREQ_MAP).map((f) => (
              <SelectItem key={f} label={t(f.toLowerCase())} value={f}>
                {t(f.toLowerCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs" htmlFor="interval">
          {t("every")}
        </Label>
        <Input
          className="h-8"
          id="interval"
          min="1"
          onChange={handleIntervalChange}
          type="number"
          value={interval}
        />
      </div>
    </div>
  );
};
