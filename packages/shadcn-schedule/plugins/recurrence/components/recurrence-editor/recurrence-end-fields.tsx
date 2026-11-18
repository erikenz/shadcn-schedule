import type { ChangeEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { numberOr } from "@/lib/guards";
import { useRecurrenceEditor } from "@/plugins/recurrence/contexts/recurrence-editor-context";
import type { EndType } from "@/plugins/recurrence/contexts/recurrence-editor-context";
import { DatePicker } from "@/plugins/recurrence/ui/date-picker";

const END_TYPES = [
  { id: "never", labelKey: "never", type: "never" },
  { id: "after", labelKey: "after", type: "count" },
  { id: "on", labelKey: "on", type: "until" },
] as const;

const parseCount = (v: string) => Math.max(1, Math.trunc(Number(v)) || 1);

export const RecurrenceEndFields: React.FC = () => {
  const { t } = useCalendarContext();
  const { opts, update, setEndType, setUntil } = useRecurrenceEditor();
  let endType: EndType = "never";

  if (opts?.until) {
    endType = "until";
  } else if ((opts?.count ?? 0) > 0) {
    endType = "count";
  }

  const count = numberOr(opts?.count, 1);
  const until = opts?.until ?? undefined;

  return (
    <div>
      <Label className="text-xs">{t("ends")}</Label>
      <div className="mt-1 space-y-2">
        {END_TYPES.map(({ type, id, labelKey }) => {
          const showCountInput = type === "count" && endType === "count";
          const showUntilInput = type === "until" && endType === "until";

          const handleCheckedChange = () => {
            setEndType(type);
          };

          // oxlint-disable-next-line unicorn/consistent-function-scoping -- captures values from its enclosing scope
          const handleCountChange = (e: ChangeEvent<HTMLInputElement>) => {
            update({ count: parseCount(e.target.value) });
          };

          return (
            <div className="flex items-center space-x-2" key={type}>
              <Checkbox
                checked={endType === type}
                id={id}
                onCheckedChange={handleCheckedChange}
              />
              <Label className="text-xs" htmlFor={id}>
                {t(labelKey)}
              </Label>
              {showCountInput ? (
                <>
                  <Input
                    className="h-6 w-16 text-xs"
                    data-testid="count-input"
                    min="1"
                    onChange={handleCountChange}
                    type="number"
                    value={count}
                  />
                  <span className="text-xs">{t("occurrences")}</span>
                </>
              ) : null}
              {showUntilInput ? (
                <DatePicker className="h-6" date={until} onChange={setUntil} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
