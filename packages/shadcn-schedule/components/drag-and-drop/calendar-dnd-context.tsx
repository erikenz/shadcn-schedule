import {
  DndContext,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import type React from "react";
import { useCallback, useId, useRef } from "react";

import { EventMutationScopeSlot } from "@/components/calendar-slots";
import { getUpdatedEvent } from "@/components/drag-and-drop/dnd-utils";
import { EventDragOverlay } from "@/components/drag-and-drop/event-drag-overlay";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { useScopedEventMutation } from "@/hooks/use-scoped-event-mutation";
import { hasRef } from "@/lib/guards";
import type { CalendarEvent } from "@/types/index";

/* oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-argument, typescript/no-unsafe-member-access -- dnd-kit types drag payloads as Record<string, any>; this layer is the only writer and reader, and its replacement is tracked in the root backlog list */

interface CalendarDndContextProps {
  children: React.ReactNode;
}

// oxlint-disable-next-line typescript/promise-function-async -- the declared type is a React/Payload union that includes a promise, so async would change the component
export const CalendarDndContext = ({ children }: CalendarDndContextProps) => {
  const activeEventRef = useRef<CalendarEvent>(null);

  const dragOverlayRef = useRef<{
    setActiveEvent: (event: CalendarEvent | null) => void;
  }>(null);

  const { updateEvent, getEventManager, disableDragAndDrop } =
    useSmartCalendarContext((context) => ({
      disableDragAndDrop: context.disableDragAndDrop,
      getEventManager: context.getEventManager,
      updateEvent: context.updateEvent,
    }));

  const { dialogState, openEditDialog, closeDialog, handleConfirm } =
    useScopedEventMutation();

  // Configure sensors with reduced activation constraints for easier dragging
  const mouseSensor = useSensor(MouseSensor, {
    // Require minimal movement before activating
    activationConstraint: {
      distance: 2,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    // Reduce delay for touch devices
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Helper function to perform the actual event update
  const performEventUpdate = useCallback(
    (event: CalendarEvent, updates: Partial<CalendarEvent>) => {
      const hasNoUpdates = Object.keys(updates).length === 0;

      if (!hasRef(event.id) || hasNoUpdates) {
        return;
      }

      const owner = getEventManager(event);

      if (owner?.applyEdit) {
        // Owned events route through the owner's scoped mutation flow: prompt
        // for scope (the owner renders the eventMutationScope slot), then apply.
        openEditDialog(event, updates);
      } else {
        updateEvent(event.id, updates);
      }
    },
    [getEventManager, openEditDialog, updateEvent]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

    // Set the active event based on the event data
    if (active.data.current?.type === "calendar-event") {
      // React 19 `useRef<T>(null)` keeps `.current` nullable (TS18047); `?.` is required.
      dragOverlayRef.current?.setActiveEvent(active.data.current.event);
      activeEventRef.current = active.data.current.event;
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const updatedEvent = getUpdatedEvent(event, activeEventRef.current);

      if (updatedEvent) {
        const { activeEvent, updates } = updatedEvent;
        performEventUpdate(activeEvent, updates);
      }

      // Clear the active event reference
      activeEventRef.current = null;
      // React 19 `useRef<T>(null)` keeps `.current` nullable (TS18047); `?.` is required.
      dragOverlayRef.current?.setActiveEvent(null);
    },
    [performEventUpdate]
  );

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    activeEventRef.current = null;
  }, []);

  const dndId = useId();

  // If drag and drop is disabled, just return children without DndContext
  if (disableDragAndDrop) {
    return children;
  }

  return (
    <>
      <DndContext
        collisionDetection={pointerWithin}
        id={dndId}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {children}
        <EventDragOverlay ref={dragOverlayRef} />
      </DndContext>

      {/* Scope dialog for the owned event, provided by the owning plugin */}
      <EventMutationScopeSlot
        dialog={dialogState}
        onCancel={closeDialog}
        onResolve={handleConfirm}
      />
    </>
  );
};
