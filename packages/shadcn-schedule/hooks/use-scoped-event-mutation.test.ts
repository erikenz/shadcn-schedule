import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { useScopedEventMutation } from "@/hooks/use-scoped-event-mutation";
import type {
  CalendarEvent,
  CalendarPlugin,
  PluginMutationArgs,
  PluginMutationResult,
} from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

const managedEvent: CalendarEvent = {
  end: toZonedDateTime("2025-01-15T11:00:00.000Z"),
  id: "managed-1",
  start: toZonedDateTime("2025-01-15T10:00:00.000Z"),
  title: "Managed Event",
};

const EDITED = [{ ...managedEvent, title: "edited-sentinel" }];
const DELETED: CalendarEvent[] = [];

const makeMutationResult = (
  events: CalendarEvent[],
  updated: CalendarEvent[],
  added: CalendarEvent[] = [],
  deleted: CalendarEvent[] = []
): PluginMutationResult => ({ added, deleted, events, updated });

// A fake plugin that manages every event and returns sentinel results so we can
// observe that the manager's applyEdit/applyDelete were invoked with the scope.
const makeFakePlugin = (
  applyEdit: (
    args: PluginMutationArgs
  ) => CalendarEvent[] | PluginMutationResult = () => EDITED,
  applyDelete: (args: PluginMutationArgs) => CalendarEvent[] = () => DELETED
): CalendarPlugin => ({
  applyDelete,
  applyEdit,
  managesEvent: () => true,
  name: "fake",
});

interface RenderArgs {
  onComplete?: () => void;
  onEventAdd?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  plugin?: CalendarPlugin;
  strictMode?: boolean;
}

const renderScopedMutationHook = ({
  onComplete,
  plugin = makeFakePlugin(),
  onEventUpdate,
  onEventAdd,
  onEventDelete,
  strictMode = false,
}: RenderArgs = {}) => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const provider = createElement(
      CalendarProvider,
      {
        onEventAdd,
        onEventDelete,
        onEventUpdate,
        dayMaxEvents: 3,
        events: [managedEvent],
        plugins: [plugin],
      },
      children
    );

    return strictMode ? createElement(StrictMode, null, provider) : provider;
  };

  const { result } = renderHook(() => useScopedEventMutation(onComplete), {
    wrapper,
  });

  return result;
};

describe(useScopedEventMutation, () => {
  it("starts closed", () => {
    const result = renderScopedMutationHook();
    expect(result.current.dialogState.isOpen).toBeFalsy();
    expect(result.current.dialogState.event).toBeNull();
  });

  it("openEditDialog populates dialogState with event, operation, and updates", () => {
    const result = renderScopedMutationHook();

    act(() => {
      result.current.openEditDialog(managedEvent, { title: "New Title" });
    });
    expect(result.current.dialogState.isOpen).toBeTruthy();
    expect(result.current.dialogState.operation).toBe("edit");
    expect(result.current.dialogState.updates).toStrictEqual({
      title: "New Title",
    });
  });

  it("handleConfirm applies the manager edit, notifies callbacks, and closes", () => {
    let editArgs: PluginMutationArgs | undefined;

    const applyEdit = (args: PluginMutationArgs) => {
      editArgs = args;

      return EDITED;
    };

    const onEventUpdate = vi.fn<(event: CalendarEvent) => void>();
    const onComplete = vi.fn<() => void>();

    const result = renderScopedMutationHook({
      onComplete,
      onEventUpdate,
      plugin: makeFakePlugin(applyEdit),
    });

    act(() => {
      result.current.openEditDialog(managedEvent, { title: "New Title" });
    });
    act(() => {
      result.current.handleConfirm("this");
    });

    expect(editArgs?.scope).toBe("this");
    expect(editArgs?.updates).toStrictEqual({ title: "New Title" });
    expect(onEventUpdate).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(result.current.dialogState.isOpen).toBeFalsy();
  });

  it("openDeleteDialog then handleConfirm applies the manager delete and closes", () => {
    let deleteArgs: PluginMutationArgs | undefined;

    const applyDelete = (args: PluginMutationArgs) => {
      deleteArgs = args;

      return DELETED;
    };

    const onEventDelete = vi.fn<(event: CalendarEvent) => void>();

    const result = renderScopedMutationHook({
      onEventDelete,
      plugin: makeFakePlugin(undefined, applyDelete),
    });

    act(() => {
      result.current.openDeleteDialog(managedEvent);
    });
    expect(result.current.dialogState.isOpen).toBeTruthy();
    expect(result.current.dialogState.operation).toBe("delete");

    act(() => {
      result.current.handleConfirm("all");
    });

    expect(deleteArgs?.scope).toBe("all");
    expect(onEventDelete).toHaveBeenCalledOnce();
    expect(result.current.dialogState.isOpen).toBeFalsy();
  });

  it("closeDialog dismisses an open dialog without applying", () => {
    let editCalled = false;

    const applyEdit = () => {
      editCalled = true;

      return EDITED;
    };

    const result = renderScopedMutationHook({
      plugin: makeFakePlugin(applyEdit),
    });

    act(() => {
      result.current.openEditDialog(managedEvent, { title: "x" });
    });
    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.dialogState.isOpen).toBeFalsy();
    expect(result.current.dialogState.event).toBeNull();
    expect(editCalled).toBeFalsy();
  });

  it("handleConfirm fires persistence callbacks once under StrictMode", () => {
    let editCallCount = 0;
    const updatedRow = { ...managedEvent, title: "Strict once" };

    const applyEdit = () => {
      editCallCount += 1;

      return makeMutationResult([updatedRow], [updatedRow], []);
    };

    const onEventUpdate = vi.fn<(event: CalendarEvent) => void>();
    const onEventAdd = vi.fn<(event: CalendarEvent) => void>();

    const result = renderScopedMutationHook({
      onEventAdd,
      onEventUpdate,
      plugin: makeFakePlugin(applyEdit),
      strictMode: true,
    });

    act(() => {
      result.current.openEditDialog(managedEvent, { title: "Strict once" });
    });
    act(() => {
      result.current.handleConfirm("this");
    });

    expect(editCallCount).toBe(1);
    expect(onEventUpdate).toHaveBeenCalledOnce();
    expect(onEventAdd).not.toHaveBeenCalled();
  });
});
