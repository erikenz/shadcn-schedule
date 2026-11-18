import { describe, expect, it } from "vitest";

import {
  RESOURCE_ROW_LABEL_WIDTH,
  cleanMergeResourceWidth,
  computeResourceWidthStyle,
  hasWidthClass,
  normalizeResourceWidth,
  resolveResourceClasses,
} from "./resource-width";

describe("resource-width utilities", () => {
  describe(hasWidthClass, () => {
    it("detects basic Tailwind width classes", () => {
      expect(hasWidthClass("w-12")).toBeTruthy();
      expect(hasWidthClass("w-36")).toBeTruthy();
      expect(hasWidthClass("min-w-24")).toBeTruthy();
      expect(hasWidthClass("max-w-md")).toBeTruthy();
    });

    it("detects responsive and arbitrary Tailwind width classes", () => {
      expect(hasWidthClass("w-[200px]")).toBeTruthy();
      expect(hasWidthClass("sm:w-48")).toBeTruthy();
      expect(hasWidthClass("md:min-w-[10rem]")).toBeTruthy();
    });

    it("returns false for non-width style classes", () => {
      expect(hasWidthClass("bg-muted")).toBeFalsy();
      expect(hasWidthClass("text-sm font-medium")).toBeFalsy();
      expect(hasWidthClass("whitespace-nowrap")).toBeFalsy();
      expect(hasWidthClass("border-white")).toBeFalsy();
    });

    it("returns false for undefined or empty string", () => {
      expect(hasWidthClass(undefined)).toBeFalsy();
      expect(hasWidthClass("")).toBeFalsy();
    });
  });

  describe(cleanMergeResourceWidth, () => {
    it("returns base classes when no override is provided", () => {
      expect(cleanMergeResourceWidth(RESOURCE_ROW_LABEL_WIDTH, undefined)).toBe(
        RESOURCE_ROW_LABEL_WIDTH
      );
    });

    it("preserves default width classes when override has no width utility", () => {
      const merged = cleanMergeResourceWidth(
        RESOURCE_ROW_LABEL_WIDTH,
        "bg-secondary text-primary"
      );

      expect(merged).toContain("bg-secondary");
      expect(merged).toContain("text-primary");
      expect(merged).toContain("shrink-0");
      expect(merged).toContain("w-[var(--schedule-resource-width,9rem)]");
    });

    it("strips base fixed width tokens when a custom width class is provided", () => {
      const merged = cleanMergeResourceWidth(RESOURCE_ROW_LABEL_WIDTH, "w-12");

      expect(merged).toContain("w-12");
      expect(merged).toContain("shrink-0");
      expect(merged).not.toContain("w-[var(--schedule-resource-width,9rem)]");
      expect(merged).not.toContain(
        "min-w-[var(--schedule-resource-width,9rem)]"
      );
    });

    it("strips base responsive width tokens when a custom width class is provided", () => {
      const merged = cleanMergeResourceWidth(RESOURCE_ROW_LABEL_WIDTH, "w-12");

      expect(merged).not.toContain(
        "sm:w-[var(--schedule-resource-width,12rem)]"
      );
      expect(merged).not.toContain(
        "sm:min-w-[var(--schedule-resource-width,12rem)]"
      );
    });

    it("handles arbitrary value width overrides", () => {
      const merged = cleanMergeResourceWidth(
        RESOURCE_ROW_LABEL_WIDTH,
        "w-[150px] min-w-[150px]"
      );

      expect(merged).toContain("w-[150px]");
      expect(merged).toContain("min-w-[150px]");
      expect(merged).toContain("shrink-0");
      expect(merged).not.toContain("9rem");
    });
  });

  describe(normalizeResourceWidth, () => {
    it("converts numeric width to pixels", () => {
      expect(normalizeResourceWidth(120)).toBe("120px");
      expect(normalizeResourceWidth(64)).toBe("64px");
    });

    it("preserves string values", () => {
      expect(normalizeResourceWidth("3rem")).toBe("3rem");
      expect(normalizeResourceWidth("150px")).toBe("150px");
      expect(normalizeResourceWidth("w-24")).toBe("w-24");
    });

    it("returns undefined for empty/nullish values", () => {
      expect(normalizeResourceWidth(undefined)).toBeUndefined();
      expect(normalizeResourceWidth("")).toBeUndefined();
    });
  });

  describe(resolveResourceClasses, () => {
    it("returns undefined when no overrides or custom class provided", () => {
      const { finalCornerClass, finalLabelClass } =
        resolveResourceClasses(undefined);

      expect(finalCornerClass).toBeUndefined();
      expect(finalLabelClass).toBeUndefined();
    });

    it("synchronizes width override from resourceLabel to corner cell when corner is not specified", () => {
      const { finalCornerClass, finalLabelClass } = resolveResourceClasses({
        resourceLabel: "w-12",
      });

      expect(finalCornerClass).toBe("w-12");
      expect(finalLabelClass).toBe("w-12");
    });

    it("synchronizes width override from resourceCorner to label cell when label is not specified", () => {
      const { finalCornerClass, finalLabelClass } = resolveResourceClasses({
        resourceCorner: "w-16",
      });

      expect(finalCornerClass).toBe("w-16");
      expect(finalLabelClass).toBe("w-16");
    });

    it("supports resourceHeader as an alias for corner", () => {
      const { finalCornerClass, finalLabelClass } = resolveResourceClasses({
        resourceHeader: "w-20",
      });

      expect(finalCornerClass).toBe("w-20");
      expect(finalLabelClass).toBe("w-20");
    });

    it("does not cross-apply non-width classes", () => {
      const { finalCornerClass, finalLabelClass } = resolveResourceClasses({
        resourceLabel: "bg-red-500 font-bold",
      });

      expect(finalCornerClass).toBeUndefined();
      expect(finalLabelClass).toBe("bg-red-500 font-bold");
    });

    it("applies customWidthClass to both corner and label cells", () => {
      const { finalCornerClass, finalLabelClass } = resolveResourceClasses(
        undefined,
        "w-24"
      );

      expect(finalCornerClass).toBe("w-24");
      expect(finalLabelClass).toBe("w-24");
    });
  });

  describe(computeResourceWidthStyle, () => {
    it("returns CSS variable width style by default", () => {
      const style = computeResourceWidthStyle({});

      expect(style).toStrictEqual({
        width: "var(--schedule-resource-width, auto)",
      });
    });

    it("sets minWidth and width when a CSS dimension prop is provided", () => {
      const style = computeResourceWidthStyle({ customWidth: "3rem" });

      expect(style).toStrictEqual({
        minWidth: "3rem",
        width: "3rem",
      });
    });

    it("sets minWidth and width in pixels when a numeric prop is provided", () => {
      const style = computeResourceWidthStyle({ customWidth: 120 });

      expect(style).toStrictEqual({
        minWidth: "120px",
        width: "120px",
      });
    });

    it("omits inline width when width is specified via classes to avoid overriding", () => {
      const style = computeResourceWidthStyle({ hasWidthInClasses: true });

      expect(style.width).toBeUndefined();
    });

    it("merges with extraStyle", () => {
      const style = computeResourceWidthStyle({
        customWidth: "3rem",
        extraStyle: { backgroundColor: "blue", color: "white" },
      });

      expect(style).toStrictEqual({
        backgroundColor: "blue",
        color: "white",
        minWidth: "3rem",
        width: "3rem",
      });
    });
  });
});
