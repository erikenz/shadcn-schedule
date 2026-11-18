import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecurrenceEditDialog } from "@/plugins/recurrence/components/recurrence-edit-dialog/recurrence-edit-dialog";
import type { RecurrenceEditScope } from "@/plugins/recurrence/types";
import { CalendarTestProvider } from "@/testing/index";

const EDIT_RECURRING_EVENT_TITLE = /Edit.*recurring event/u;

const RECURRING_EVENT_DESCRIPTION =
  /Test Recurring Event.*is a recurring event/u;

const EDIT_QUESTION = /How would you like to.*edit.*it/u;
const CHANGE_THIS_OCCURRENCE = /Only.*change.*this specific occurrence/u;
const CHANGE_FUTURE_OCCURRENCES = /Change.*this and all future occurrences/u;
const CHANGE_ENTIRE_SERIES = /Change.*the entire recurring series/u;
const DELETE_RECURRING_EVENT_TITLE = /Delete.*recurring event/u;
const DELETE_QUESTION = /How would you like to.*delete.*it/u;
const DELETE_THIS_OCCURRENCE = /Only.*delete.*this specific occurrence/u;
const DELETE_FUTURE_OCCURRENCES = /Delete.*this and all future occurrences/u;
const DELETE_ENTIRE_SERIES = /Delete.*the entire recurring series/u;
const RECURRING_EVENT_SUFFIX = /is a recurring event/u;
const QUOTED_EVENT_TITLE = /Event with "quotes"/u;
const THIS_EVENT_BUTTON = /This event/u;

describe(RecurrenceEditDialog, () => {
  const mockOnClose = vi.fn<() => void>(() => {});
  const mockOnConfirm = vi.fn<(scope: RecurrenceEditScope) => void>(() => {});

  const renderWithProvider = (
    props: Partial<ComponentProps<typeof RecurrenceEditDialog>> = {}
  ) => {
    const defaultProps: ComponentProps<typeof RecurrenceEditDialog> = {
      eventTitle: "Test Recurring Event",
      isOpen: true,
      onClose: mockOnClose,
      onConfirm: mockOnConfirm,
      operationType: "edit",
      ...props,
    };

    return render(
      <CalendarTestProvider>
        <RecurrenceEditDialog {...defaultProps} />
      </CalendarTestProvider>
    );
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  describe("Edit Operation", () => {
    it("should render edit dialog with correct title and description", () => {
      renderWithProvider();

      expect(screen.getByText(EDIT_RECURRING_EVENT_TITLE)).toBeInTheDocument();
      expect(screen.getByText(RECURRING_EVENT_DESCRIPTION)).toBeInTheDocument();
      expect(screen.getByText(EDIT_QUESTION)).toBeInTheDocument();
    });

    it("should display all three edit options", () => {
      renderWithProvider();

      expect(screen.getByText("This event")).toBeInTheDocument();
      expect(screen.getByText("This and following events")).toBeInTheDocument();
      expect(screen.getByText("All events")).toBeInTheDocument();
    });

    it("should show correct descriptions for edit options", () => {
      renderWithProvider();

      expect(screen.getByText(CHANGE_THIS_OCCURRENCE)).toBeInTheDocument();
      expect(screen.getByText(CHANGE_FUTURE_OCCURRENCES)).toBeInTheDocument();
      expect(screen.getByText(CHANGE_ENTIRE_SERIES)).toBeInTheDocument();
    });

    it('should call onConfirm with "this" scope when first option is clicked', () => {
      renderWithProvider();

      const thisEventButton = screen.getByText("This event");
      fireEvent.click(thisEventButton);

      expect(mockOnConfirm).toHaveBeenCalledExactlyOnceWith("this");
    });

    it('should call onConfirm with "following" scope when second option is clicked', () => {
      renderWithProvider();

      const followingEventsButton = screen.getByText(
        "This and following events"
      );

      fireEvent.click(followingEventsButton);

      expect(mockOnConfirm).toHaveBeenCalledExactlyOnceWith("following");
    });

    it('should call onConfirm with "all" scope when third option is clicked', () => {
      renderWithProvider();

      const allEventsButton = screen.getByText("All events");
      fireEvent.click(allEventsButton);

      expect(mockOnConfirm).toHaveBeenCalledExactlyOnceWith("all");
    });
  });

  describe("Delete Operation", () => {
    it("should render delete dialog with correct title and description", () => {
      renderWithProvider({ operationType: "delete" });

      expect(
        screen.getByText(DELETE_RECURRING_EVENT_TITLE)
      ).toBeInTheDocument();
      expect(screen.getByText(RECURRING_EVENT_DESCRIPTION)).toBeInTheDocument();
      expect(screen.getByText(DELETE_QUESTION)).toBeInTheDocument();
    });

    it("should show correct descriptions for delete options", () => {
      renderWithProvider({ operationType: "delete" });

      expect(screen.getByText(DELETE_THIS_OCCURRENCE)).toBeInTheDocument();
      expect(screen.getByText(DELETE_FUTURE_OCCURRENCES)).toBeInTheDocument();
      expect(screen.getByText(DELETE_ENTIRE_SERIES)).toBeInTheDocument();
    });

    it("should call onConfirm with correct scope for delete operations", () => {
      renderWithProvider({ operationType: "delete" });

      const thisEventButton = screen.getByText("This event");
      fireEvent.click(thisEventButton);

      expect(mockOnConfirm).toHaveBeenCalledWith("this");
    });
  });

  describe("Dialog Behavior", () => {
    it("should not render when isOpen is false", () => {
      renderWithProvider({ isOpen: false });

      expect(
        screen.queryByText("Edit Recurring Event")
      ).not.toBeInTheDocument();
    });

    it("should call onClose when cancel button is clicked", () => {
      renderWithProvider();

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it("should handle empty event title gracefully", () => {
      renderWithProvider({ eventTitle: "" });

      // Should still render the dialog with empty quotes
      expect(screen.getByText(RECURRING_EVENT_SUFFIX)).toBeInTheDocument();
    });

    it("should render with proper dialog structure and accessibility", () => {
      renderWithProvider();

      // Check for dialog role
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Check for buttons (3 options + cancel + close)
      expect(screen.getAllByRole("button")).toHaveLength(5);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long event titles", () => {
      const longTitle = "A".repeat(100);
      renderWithProvider({ eventTitle: longTitle });

      expect(
        screen.getByText(new RegExp(longTitle.slice(0, 50), "u"))
      ).toBeInTheDocument();
    });

    it("should handle special characters in event title", () => {
      const specialTitle = 'Event with "quotes" & <tags>';
      renderWithProvider({ eventTitle: specialTitle });

      expect(screen.getByText(QUOTED_EVENT_TITLE)).toBeInTheDocument();
    });

    it("should maintain button focus after keyboard navigation", () => {
      renderWithProvider();

      const firstButton = screen.getByRole("button", {
        name: THIS_EVENT_BUTTON,
      });

      firstButton.focus();

      expect(document.activeElement).toBe(firstButton);
    });
  });
});
