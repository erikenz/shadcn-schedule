import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { HeaderDatePicker } from "@/features/calendar/components/header/header-date-picker";
import { useExportCalendar } from "@/features/calendar/components/header/use-export-calendar";
import { ViewMenu } from "@/features/calendar/components/header/view-menu";
import { ViewSwitcher } from "@/features/calendar/components/header/view-switcher";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasValue } from "@/lib/guards";

interface HeaderProps {
  className?: string;
}

// oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
export const Header: React.FC<HeaderProps> = ({ className = "" }) => {
  const {
    nextPeriod,
    prevPeriod,
    today,
    openEventForm,
    headerComponent,
    headerClassName,
    t,
    hideExportButton,
  } = useSmartCalendarContext((ctx) => ({
    headerClassName: ctx.headerClassName,
    headerComponent: ctx.headerComponent,
    hideExportButton: ctx.hideExportButton,
    nextPeriod: ctx.nextPeriod,
    openEventForm: ctx.openEventForm,
    prevPeriod: ctx.prevPeriod,
    t: ctx.t,
    today: ctx.today,
  }));

  const exportCalendar = useExportCalendar();

  const handleNew = () => {
    openEventForm();
  };

  if (hasValue(headerComponent)) {
    return headerComponent;
  }

  // Container queries drive both the control variants and the row/stack decision.
  // The row vs. two-row layout is keyed to the container width (@lg), NOT to
  // flex-wrap: wrapping would key off content width, so the date title changing
  // per view (e.g. "Jun 2026" vs "Jun 28 - Jul 4") could flip a fixed-width
  // container between one and two rows. No JS measurement needed.
  return (
    <div
      className={cn("@container/base-header w-full", headerClassName)}
      data-testid="calendar-header"
    >
      <div
        className={cn(
          // Below @lg (phones): stack the two clusters, each centered on its
          // own line. At @lg and up the compact row fits: lay out in a single
          // row and spread to the edges.
          "flex flex-col items-center gap-2 @lg/base-header:flex-row @lg/base-header:justify-between",
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-background flex h-9 items-center rounded-lg border">
            <Button
              aria-label={t("previous")}
              className="h-full"
              onClick={prevPeriod}
              size="icon"
              variant="ghost"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              aria-label={t("next")}
              className="h-full"
              onClick={nextPeriod}
              size="icon"
              variant="ghost"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button onClick={today} size="default" variant="outline">
            {t("today")}
          </Button>
          <HeaderDatePicker />
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented switcher once it fits (~@3xl); compact dropdown below. */}
          <ViewSwitcher className="hidden @3xl/base-header:flex" />
          <ViewMenu className="@3xl/base-header:hidden" />

          {/* Export + New show a label when there's room, icon-only when narrow. */}
          {!hideExportButton && (
            <Button
              aria-label={t("export")}
              onClick={exportCalendar}
              size="default"
              variant="outline"
            >
              <Download className="size-4" />
              <span className="hidden @2xl/base-header:inline">
                {t("export")}
              </span>
            </Button>
          )}
          <Button aria-label={t("new")} onClick={handleNew} size="default">
            <Plus className="size-4" />
            <span className="hidden @2xl/base-header:inline">{t("new")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
