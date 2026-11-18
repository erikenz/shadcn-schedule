import { useMemo } from "react";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { BusinessHours } from "@/types/index";

/**
 * Returns the resource-specific business hours when available, otherwise
 * falls back to the calendar-wide `businessHours`. Shared by components
 * that need per-resource working-hours semantics (grid cells, event form).
 */
export const useEffectiveBusinessHours = (
  resourceId: string | number | undefined
): BusinessHours | BusinessHours[] | undefined => {
  const { businessHours, getResourceById } = useSmartCalendarContext((ctx) => ({
    businessHours: ctx.businessHours,
    getResourceById: ctx.getResourceById,
  }));

  return useMemo(() => {
    if (resourceId !== undefined) {
      const resource = getResourceById(resourceId);

      if (resource?.businessHours) {
        return resource.businessHours;
      }
    }

    return businessHours;
  }, [resourceId, getResourceById, businessHours]);
};
