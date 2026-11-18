import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Calendar } from "@/features/calendar/components/calendar";
import type { CalendarProps } from "@/features/calendar/types/index";
import { keys } from "@/lib/utils/keys";
import type { Resource } from "@/types/index";

const MOCK_RESOURCES: Resource[] = [
  { id: "1", title: "Resource 1" },
  { id: "2", title: "Very Long Resource Title That Should Be Truncated" },
];

const renderHorizontalCalendar = (props: Partial<CalendarProps> = {}) =>
  render(
    <Calendar
      events={[]}
      initialDate="2026-11-18"
      initialView="month"
      orientation="horizontal"
      resources={MOCK_RESOURCES}
      {...props}
    />
  );

describe("custom resource column width in horizontal views", () => {
  describe("default behavior (backward compatibility)", () => {
    it("uses default CSS variable width classes on corner and row cells", () => {
      renderHorizontalCalendar();

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).toContain(
        "w-[var(--schedule-resource-width,9rem)]"
      );
      expect(cornerCell.className).toContain(
        "min-w-[var(--schedule-resource-width,9rem)]"
      );
      expect(cornerCell.className).toContain("shrink-0");

      expect(row1.className).toContain(
        "w-[var(--schedule-resource-width,9rem)]"
      );
      expect(row1.className).toContain(
        "min-w-[var(--schedule-resource-width,9rem)]"
      );
    });

    it("uses default CSS variable fallback styles on cells", () => {
      renderHorizontalCalendar();

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));
      const row2 = screen.getByTestId(keys.container.horizontal.rowLabel("2"));

      expect(row1.className).toContain("shrink-0");
      expect(cornerCell.style.width).toBe(
        "var(--schedule-resource-width, auto)"
      );
      expect(row1.style.width).toBe("var(--schedule-resource-width, auto)");
      expect(row2.style.width).toBe("var(--schedule-resource-width, auto)");
    });
  });

  describe("CSS variable customization", () => {
    it("supports overriding width via inline style --schedule-resource-width on Calendar", () => {
      renderHorizontalCalendar({
        style: { "--schedule-resource-width": "3rem" },
      });

      const calendarRoot = screen.getByTestId("calendar");
      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(
        calendarRoot.style.getPropertyValue("--schedule-resource-width")
      ).toBe("3rem");
      expect(cornerCell.style.width).toBe(
        "var(--schedule-resource-width, auto)"
      );
      expect(row1.style.width).toBe("var(--schedule-resource-width, auto)");
    });

    it("passes className through to root Calendar element", () => {
      renderHorizontalCalendar({
        className: "custom-calendar-class [--schedule-resource-width:4rem]",
      });

      const calendarRoot = screen.getByTestId("calendar");

      expect(calendarRoot.className).toContain("custom-calendar-class");
      expect(calendarRoot.className).toContain(
        "[--schedule-resource-width:4rem]"
      );
    });
  });

  describe("prop customization (resourceColumnWidth & resourceWidth)", () => {
    it("sets custom width and minWidth on corner cell via resourceColumnWidth string", () => {
      renderHorizontalCalendar({
        resourceColumnWidth: "3rem",
      });

      const calendarRoot = screen.getByTestId("calendar");
      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);

      expect(
        calendarRoot.style.getPropertyValue("--schedule-resource-width")
      ).toBe("3rem");
      expect(cornerCell.style.width).toBe("3rem");
      expect(cornerCell.style.minWidth).toBe("3rem");
    });

    it("sets matching width and minWidth on row cells via resourceColumnWidth string", () => {
      renderHorizontalCalendar({
        resourceColumnWidth: "3rem",
      });

      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));
      const row2 = screen.getByTestId(keys.container.horizontal.rowLabel("2"));

      expect(row1.style.width).toBe("3rem");
      expect(row1.style.minWidth).toBe("3rem");
      expect(row2.style.width).toBe("3rem");
      expect(row2.style.minWidth).toBe("3rem");
    });

    it("supports pixel numbers converted to px via resourceWidth", () => {
      renderHorizontalCalendar({
        resourceWidth: 120,
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.style.width).toBe("120px");
      expect(cornerCell.style.minWidth).toBe("120px");
      expect(row1.style.width).toBe("120px");
      expect(row1.style.minWidth).toBe("120px");
    });

    it("applies Tailwind utility class passed to resourceColumnWidth", () => {
      renderHorizontalCalendar({
        resourceColumnWidth: "w-24 min-w-24",
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).toContain("w-24");
      expect(cornerCell.className).toContain("min-w-24");
      expect(row1.className).toContain("w-24");
      expect(row1.className).toContain("min-w-24");
    });

    it("strips default classes and omits inline width for class overrides", () => {
      renderHorizontalCalendar({
        resourceColumnWidth: "w-24 min-w-24",
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).not.toContain("9rem");
      expect(row1.className).not.toContain("9rem");
      expect(cornerCell.style.width).toBe("");
      expect(row1.style.width).toBe("");
    });
  });

  describe("classesOverride customization", () => {
    it("synchronizes width utility class to corner and row cells", () => {
      renderHorizontalCalendar({
        classesOverride: {
          resourceLabel: "w-12",
        },
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).toContain("w-12");
      expect(row1.className).toContain("w-12");
    });

    it("strips default fixed width classes when classesOverride provides width", () => {
      renderHorizontalCalendar({
        classesOverride: {
          resourceLabel: "w-12",
        },
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).not.toContain(
        "w-[var(--schedule-resource-width,9rem)]"
      );
      expect(cornerCell.className).not.toContain(
        "min-w-[var(--schedule-resource-width,9rem)]"
      );
      expect(row1.className).not.toContain(
        "w-[var(--schedule-resource-width,9rem)]"
      );
      expect(row1.className).not.toContain(
        "min-w-[var(--schedule-resource-width,9rem)]"
      );
    });

    it("omits inline width style when width is specified via classesOverride", () => {
      renderHorizontalCalendar({
        classesOverride: {
          resourceLabel: "w-12",
        },
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.style.width).toBe("");
      expect(row1.style.width).toBe("");
    });

    it("supports specifying both resourceCorner and resourceLabel independently", () => {
      renderHorizontalCalendar({
        classesOverride: {
          resourceCorner: "w-16 min-w-16",
          resourceLabel: "w-16 min-w-16",
        },
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).toContain("w-16");
      expect(cornerCell.className).toContain("min-w-16");
      expect(row1.className).toContain("w-16");
      expect(row1.className).toContain("min-w-16");
    });

    it("supports resourceHeader as an alias for resourceCorner", () => {
      renderHorizontalCalendar({
        classesOverride: {
          resourceHeader: "w-20",
        },
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.className).toContain("w-20");
      expect(row1.className).toContain("w-20");
    });
  });

  describe("text truncation and tooltip", () => {
    it("truncates long resource labels and provides title tooltip attribute", () => {
      renderHorizontalCalendar({
        resourceColumnWidth: "w-12",
      });

      const row2 = screen.getByTestId(keys.container.horizontal.rowLabel("2"));
      const labelDiv = row2.querySelector("div");

      expect(labelDiv).not.toBeNull();
      expect(labelDiv?.className).toContain("truncate");
      expect(labelDiv?.className).toContain("min-w-0");
      expect(labelDiv?.getAttribute("title")).toBe(
        "Very Long Resource Title That Should Be Truncated"
      );
      expect(labelDiv?.textContent).toBe(
        "Very Long Resource Title That Should Be Truncated"
      );
    });
  });

  describe("horizontal week and month views", () => {
    it("synchronizes corner cell and row labels in horizontal week view", () => {
      renderHorizontalCalendar({
        initialView: "week",
        resourceColumnWidth: "3rem",
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.style.width).toBe("3rem");
      expect(cornerCell.style.minWidth).toBe("3rem");
      expect(row1.style.width).toBe("3rem");
      expect(row1.style.minWidth).toBe("3rem");
    });

    it("synchronizes corner cell and row labels in horizontal month view", () => {
      renderHorizontalCalendar({
        initialView: "month",
        resourceColumnWidth: "3rem",
      });

      const cornerCell = screen.getByTestId(keys.header.resource.cornerCell);
      const row1 = screen.getByTestId(keys.container.horizontal.rowLabel("1"));

      expect(cornerCell.style.width).toBe("3rem");
      expect(cornerCell.style.minWidth).toBe("3rem");
      expect(row1.style.width).toBe("3rem");
      expect(row1.style.minWidth).toBe("3rem");
    });
  });
});
