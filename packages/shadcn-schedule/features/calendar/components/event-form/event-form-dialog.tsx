import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "@/features/calendar/components/event-form/event-form";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { hasRef } from "@/lib/guards";
import type { CalendarEvent } from "@/types/index";

// oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
export const EventFormDialog = () => {
  const {
    t,
    selectedEvent,
    isEventFormOpen,
    closeEventForm,
    addEvent,
    updateEvent,
    deleteEvent,
    renderEventForm,
    components,
  } = useSmartCalendarContext((context) => ({
    addEvent: context.addEvent,
    closeEventForm: context.closeEventForm,
    components: context.components,
    deleteEvent: context.deleteEvent,
    isEventFormOpen: context.isEventFormOpen,
    renderEventForm: context.renderEventForm,
    selectedEvent: context.selectedEvent,
    t: context.t,
    updateEvent: context.updateEvent,
  }));

  const handleOnUpdate = (event: CalendarEvent) => {
    updateEvent(event.id, event);
  };

  const handleOnDelete = (event: CalendarEvent) => {
    deleteEvent(event.id);
  };

  const eventFormProps = {
    onAdd: addEvent,
    onClose: closeEventForm,
    onDelete: handleOnDelete,
    onUpdate: handleOnUpdate,
    open: isEventFormOpen,
    selectedEvent,
  };

  if (components?.EventForm === false || components?.EventForm === null) {
    return null;
  }

  if (components?.EventForm) {
    const CustomEventForm = components.EventForm;

    return <CustomEventForm {...eventFormProps} />;
  }

  if (renderEventForm) {
    return renderEventForm(eventFormProps);
  }

  return (
    <Dialog onOpenChange={closeEventForm} open={isEventFormOpen}>
      <DialogContent className="flex h-[90vh] w-[90vw] max-w-[500px] flex-col gap-0 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="mb-2 shrink-0 sm:mb-4">
          <DialogTitle className="text-base sm:text-lg">
            {hasRef(selectedEvent?.id) ? t("editEvent") : t("createEvent")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {hasRef(selectedEvent?.id)
              ? t("editEventDetails")
              : t("addNewEvent")}
          </DialogDescription>
        </DialogHeader>

        <EventForm {...eventFormProps} />
      </DialogContent>
    </Dialog>
  );
};
