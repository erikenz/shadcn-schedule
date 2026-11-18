import { useCallback } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeaderViews } from "@/features/calendar/components/header/use-header-views";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import type { CalendarView } from "@/types/index";

interface ViewSwitcherProps {
  className?: string;
}

// Desktop segmented control listing the available views (Day/Week/Month/...).
export const ViewSwitcher = ({ className }: ViewSwitcherProps) => {
  const { view, setView, t } = useSmartCalendarContext((ctx) => ({
    setView: ctx.setView,
    t: ctx.t,
    view: ctx.view,
  }));

  const views = useHeaderViews();

  // Every trigger value is a `PluginView.name` (a `CalendarView`), so the tab
  // value is the view name; the design system's Tabs leaves its value untyped.
  const handleValueChange = useCallback(
    (val: CalendarView) => {
      setView(val);
    },
    [setView]
  );

  return (
    <Tabs
      className={cn("w-fit", className)}
      onValueChange={handleValueChange}
      value={view}
    >
      <TabsList className="bg-muted/60 h-9 rounded-lg border p-1">
        {views.map((v) => (
          <TabsTrigger
            className="data-active:bg-background data-active:text-foreground h-7 rounded-md px-3 text-xs font-semibold transition data-active:shadow-sm"
            key={v.name}
            value={v.name}
          >
            {t(v.label ?? v.name)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
