import { useCallback, useState } from "react";
import type { Temporal } from "temporal-polyfill";

import { PickerNav } from "@/components/ui/picker-nav";
import { PickerGridCell } from "@/features/calendar/components/header/picker-grid-cell";
import { format, monthIndex, now } from "@/utils/temporal";

interface MonthGridProps {
  onSelect: (date: Temporal.ZonedDateTime) => void;
  /** The currently active date; its month/year drive the highlighted cell. */
  selected: Temporal.ZonedDateTime;
}

// One month cell: wraps PickerGridCell so the click handler is a stable
// useCallback reference instead of an inline closure.
const MonthCell = ({
  isCurrent,
  isSelected,
  label,
  monthOffset,
  onSelect,
  selected,
  year,
}: {
  isCurrent: boolean;
  isSelected: boolean;
  label: string;
  monthOffset: number;
  onSelect: (date: Temporal.ZonedDateTime) => void;
  selected: Temporal.ZonedDateTime;
  year: number;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(selected.with({ day: 1, month: monthOffset + 1, year }));
  }, [monthOffset, onSelect, selected, year]);

  return (
    <PickerGridCell
      isCurrent={isCurrent}
      isSelected={isSelected}
      label={label}
      onSelect={handleSelect}
    />
  );
};

// A Jan–Dec month picker with a year pager, for the Month view's title dropdown.
export const MonthGrid = ({ selected, onSelect }: MonthGridProps) => {
  const [year, setYear] = useState(() => selected.year);
  const current = now();

  const handleNext = useCallback(() => {
    setYear((y) => y + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setYear((y) => y - 1);
  }, []);

  const months = Array.from({ length: 12 }, (_, index) => ({
    index,
    label: format(selected.with({ month: index + 1 }), "MMM"),
  }));

  return (
    <div className="w-72 p-3" data-slot="month-grid">
      <PickerNav
        label={year}
        nextLabel="Next year"
        onNext={handleNext}
        onPrev={handlePrev}
        prevLabel="Previous year"
      />

      <div className="grid grid-cols-3 gap-1">
        {months.map((month) => {
          const isSelected =
            year === selected.year && month.index === monthIndex(selected);

          const isCurrent =
            year === current.year &&
            month.index === monthIndex(current) &&
            !isSelected;

          return (
            <MonthCell
              isCurrent={isCurrent}
              isSelected={isSelected}
              key={month.index}
              label={month.label}
              monthOffset={month.index}
              onSelect={onSelect}
              selected={selected}
              year={year}
            />
          );
        })}
      </div>
    </div>
  );
};
