import { fireEvent } from "@testing-library/react";

const SLOT_BUTTON_SELECTOR = "button[aria-label='Select slot']";

/**
 * Activate a DroppableCell's slot-select button. The cell container is a
 * plain div (its children may be interactive controls), so the cell action
 * lives on the full-size overlay button — tests must click that control,
 * just like a real user does.
 */
export const clickCellSlot = (cell: HTMLElement) => {
  const slotButton =
    cell.querySelector<HTMLButtonElement>(SLOT_BUTTON_SELECTOR);

  if (!slotButton) {
    throw new Error("DroppableCell has no slot-select button");
  }

  fireEvent.click(slotButton);
};
