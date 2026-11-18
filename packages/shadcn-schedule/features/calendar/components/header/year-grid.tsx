import { useCallback, useState } from "react";
import type { Temporal } from "temporal-polyfill";

import { PickerNav } from "@/components/ui/picker-nav";
import { PickerGridCell } from "@/features/calendar/components/header/picker-grid-cell";
import { now } from "@/utils/temporal";

const BLOCK = 12;

interface YearGridProps {
  onSelect: (date: Temporal.ZonedDateTime) => void;
  /** The currently active date; its year drives the highlighted cell. */
  selected: Temporal.ZonedDateTime;
}

// One year cell: wraps PickerGridCell so the click handler is a stable
// useCallback reference instead of an inline closure.
const YearCell = ({
  isCurrent,
  isSelected,
  onSelect,
  selected,
  year,
}: {
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: (date: Temporal.ZonedDateTime) => void;
  selected: Temporal.ZonedDateTime;
  year: number;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(selected.with({ year }));
  }, [onSelect, selected, year]);

  return (
    <PickerGridCell
      isCurrent={isCurrent}
      isSelected={isSelected}
      label={year}
      onSelect={handleSelect}
    />
  );
};

// A 12-year block picker with a pager, for the Year view's title dropdown.
export const YearGrid = ({ selected, onSelect }: YearGridProps) => {
  // Align blocks to multiples of 12 so the active year sits in a stable grid.
  const [blockStart, setBlockStart] = useState(
    () => selected.year - (selected.year % BLOCK)
  );

  const current = now();

  const handleNext = useCallback(() => {
    setBlockStart((s) => s + BLOCK);
  }, []);

  const handlePrev = useCallback(() => {
    setBlockStart((s) => s - BLOCK);
  }, []);

  const years = Array.from({ length: BLOCK }, (_, i) => blockStart + i);

  return (
    <div className="w-72 p-3" data-slot="year-grid">
      <PickerNav
        label={`${blockStart} – ${blockStart + BLOCK - 1}`}
        nextLabel="Next years"
        onNext={handleNext}
        onPrev={handlePrev}
        prevLabel="Previous years"
      />

      <div className="grid grid-cols-3 gap-1">
        {years.map((year) => {
          const isSelected = year === selected.year;
          const isCurrent = year === current.year && !isSelected;

          return (
            <YearCell
              isCurrent={isCurrent}
              isSelected={isSelected}
              key={year}
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
