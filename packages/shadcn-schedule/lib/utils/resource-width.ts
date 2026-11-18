import type React from "react";

import type { CalendarClassesOverride } from "@/features/calendar/types/index";
import { cn } from "@/lib/cn";
import { hasText } from "@/lib/guards";

export const RESOURCE_ROW_LABEL_WIDTH =
  "w-[var(--schedule-resource-width,9rem)] min-w-[var(--schedule-resource-width,9rem)] sm:w-[var(--schedule-resource-width,12rem)] sm:min-w-[var(--schedule-resource-width,12rem)] shrink-0";

export const WIDTH_CLASS_REGEX = /(?:^|\s)(?:[a-z0-9_-]+:)?(?:w|min-w|max-w)-/u;

export const WIDTH_TOKEN_REGEX = /^(?:[a-z0-9_-]+:)?(?:w|min-w|max-w)-/u;

export const hasWidthClass = (className?: string): boolean =>
  hasText(className) && WIDTH_CLASS_REGEX.test(className);

export const extractWidthClass = (
  width?: string | number
): string | undefined => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- checks if width prop is a Tailwind CSS class
  if (typeof width === "string" && hasWidthClass(width)) {
    return width;
  }

  return undefined;
};

export const cleanMergeResourceWidth = (
  baseClasses: string,
  overrideClasses?: string
): string => {
  if (overrideClasses === undefined || overrideClasses === "") {
    return baseClasses;
  }

  if (!hasWidthClass(overrideClasses)) {
    return cn(baseClasses, overrideClasses);
  }

  const strippedBase = baseClasses
    .split(/\s+/u)
    .filter((token) => !WIDTH_TOKEN_REGEX.test(token))
    .join(" ");

  return cn(strippedBase, overrideClasses);
};

export const normalizeResourceWidth = (
  width?: string | number
): string | undefined => {
  if (width === undefined || width === null || width === "") {
    return undefined;
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- distinguishes numeric pixel width from CSS dimension string
  if (typeof width === "number") {
    return `${width}px`;
  }

  return width;
};

export interface ResolvedResourceClasses {
  finalCornerClass?: string;
  finalLabelClass?: string;
}

export const resolveResourceClasses = (
  classesOverride?: CalendarClassesOverride,
  customWidthClass?: string
): ResolvedResourceClasses => {
  const cornerOverride =
    classesOverride?.resourceCorner ?? classesOverride?.resourceHeader;

  const labelOverride = classesOverride?.resourceLabel;

  const cornerHasWidth = hasWidthClass(cornerOverride);
  const labelHasWidth = hasWidthClass(labelOverride);

  let finalCorner =
    cornerOverride ?? (labelHasWidth ? labelOverride : undefined);

  let finalLabel =
    labelOverride ?? (cornerHasWidth ? cornerOverride : undefined);

  if (customWidthClass !== undefined && customWidthClass !== "") {
    finalCorner = cn(finalCorner, customWidthClass);
    finalLabel = cn(finalLabel, customWidthClass);
  }

  return {
    finalCornerClass: finalCorner,
    finalLabelClass: finalLabel,
  };
};

export const computeResourceWidthStyle = ({
  customWidth,
  hasWidthInClasses,
  extraStyle,
}: {
  customWidth?: string | number;
  hasWidthInClasses?: boolean;
  extraStyle?: React.CSSProperties;
}): React.CSSProperties => {
  const normalized = normalizeResourceWidth(customWidth);

  // If customWidth is a CSS dimension (e.g. "3rem", 120 -> "120px") and not a Tailwind class
  if (normalized !== undefined && !hasWidthClass(normalized)) {
    return {
      ...extraStyle,
      minWidth: normalized,
      width: normalized,
    };
  }

  if (hasWidthInClasses === true) {
    return { ...extraStyle };
  }

  return {
    ...extraStyle,
    width: "var(--schedule-resource-width, auto)",
  };
};
