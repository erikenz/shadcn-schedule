import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PickerGridCellProps {
  /** Today's month/year (outline ring), shown only when not selected. */
  isCurrent: boolean;
  /** The active value (solid fill, like the day picker's selected day). */
  isSelected: boolean;
  label: ReactNode;
  onSelect: () => void;
}

// One cell in the month / year picker grids (the header title dropdown).
export const PickerGridCell = ({
  label,
  isSelected,
  isCurrent,
  onSelect,
}: PickerGridCellProps) => (
  <button
    aria-pressed={isSelected}
    className={cn(
      "hover:bg-accent cursor-pointer rounded-md py-2 text-sm font-medium select-none",
      isCurrent && "ring-foreground/40 ring-1 ring-inset",
      isSelected && "bg-primary text-primary-foreground"
    )}
    onClick={onSelect}
    type="button"
  >
    {label}
  </button>
);
