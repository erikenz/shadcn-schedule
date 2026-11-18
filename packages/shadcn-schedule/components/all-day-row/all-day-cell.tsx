import { memo } from "react";

import {
  GUTTER_WIDTH,
  STICKY_GUTTER_SHADOW,
} from "@/components/vertical-grid/gutter";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";

interface AllDayCellProps {
  className?: string;
}

const NoMemoAllDayCell: React.FC<AllDayCellProps> = ({ className }) => {
  const { t } = useSmartCalendarContext();

  return (
    <div
      className={cn(
        "bg-background text-muted-foreground sticky left-0 z-20 flex shrink-0 items-center justify-center px-0.5 py-1 text-center text-[9px] leading-[1.15] sm:text-xs",
        GUTTER_WIDTH,
        STICKY_GUTTER_SHADOW,
        className
      )}
    >
      <span className="text-center break-words whitespace-normal">
        {t("allDay")}
      </span>
    </div>
  );
};

export const AllDayCell = memo(NoMemoAllDayCell);
