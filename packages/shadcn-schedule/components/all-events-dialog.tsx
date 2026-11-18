import type React from "react";
import { useImperativeHandle, useState } from "react";
import type { Temporal } from "temporal-polyfill";

import { DraggableEvent } from "@/components/draggable-event/draggable-event";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { CalendarEvent } from "@/types/index";
import { format } from "@/utils/temporal";

export interface SelectedDayEvents {
  day: Temporal.ZonedDateTime;
  events: CalendarEvent[];
}

interface AllEventDialogProps {
  ref: React.Ref<{
    open: () => void;
    close: () => void;
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void;
  }>;
}

export const AllEventDialog: React.FC<AllEventDialogProps> = ({ ref }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedDayEvents, setSelectedDayEvents] =
    useState<SelectedDayEvents | null>(null);

  const { eventHeight } = useSmartCalendarContext();

  useImperativeHandle(ref, () => ({
    close: () => {
      setDialogOpen(false);
    },
    open: () => {
      setDialogOpen(true);
    },
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => {
      setSelectedDayEvents(dayEvents);
    },
  }));

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedDayEvents
              ? format(selectedDayEvents.day, "MMMM D, YYYY")
              : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {selectedDayEvents?.events.map((event) => (
            <DraggableEvent
              className="relative my-1"
              elementId={`all-events-dialog-event-${event.id}`}
              event={event}
              key={event.id}
              style={{ height: `${eventHeight}px` }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
