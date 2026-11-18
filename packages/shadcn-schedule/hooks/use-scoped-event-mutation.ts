import { useCallback, useEffect, useRef, useState } from "react";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { CalendarEvent } from "@/types/index";

export interface ScopedMutationDialogState {
  event: CalendarEvent | null;
  isOpen: boolean;
  operation: "edit" | "delete";
  updates?: Partial<CalendarEvent>;
}

const CLOSED: ScopedMutationDialogState = {
  event: null,
  isOpen: false,
  operation: "edit",
};

interface ScopedEventMutation {
  closeDialog: () => void;
  dialogState: ScopedMutationDialogState;
  handleConfirm: (scope: string) => void;
  openDeleteDialog: (event: CalendarEvent) => void;
  openEditDialog: (
    event: CalendarEvent,
    updates: Partial<CalendarEvent>
  ) => void;
}

export const useScopedEventMutation = (
  onComplete?: () => void
): ScopedEventMutation => {
  const { applyScopedEdit, applyScopedDelete } = useSmartCalendarContext(
    (c) => ({
      applyScopedDelete: c.applyScopedDelete,
      applyScopedEdit: c.applyScopedEdit,
    })
  );

  const [dialogState, setDialogState] =
    useState<ScopedMutationDialogState>(CLOSED);

  const dialogStateRef = useRef(dialogState);
  useEffect(() => {
    dialogStateRef.current = dialogState;
  }, [dialogState]);

  const openEditDialog = useCallback(
    (event: CalendarEvent, updates: Partial<CalendarEvent>) => {
      setDialogState({ event, updates, isOpen: true, operation: "edit" });
    },
    []
  );

  const openDeleteDialog = useCallback((event: CalendarEvent) => {
    setDialogState({ event, isOpen: true, operation: "delete" });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState(CLOSED);
  }, []);

  // Side effects must not run inside a setState updater — React StrictMode
  // (enabled in the demo) intentionally double-invokes updaters in dev.
  const handleConfirm = useCallback(
    (scope: string) => {
      const state = dialogStateRef.current;

      if (!state.event) {
        return;
      }

      if (state.operation === "edit") {
        applyScopedEdit(state.event, state.updates ?? {}, scope);
      } else {
        applyScopedDelete(state.event, scope);
      }

      setDialogState(CLOSED);
      onComplete?.();
    },
    [applyScopedEdit, applyScopedDelete, onComplete]
  );

  return {
    closeDialog,
    dialogState,
    handleConfirm,
    openDeleteDialog,
    openEditDialog,
  };
};
