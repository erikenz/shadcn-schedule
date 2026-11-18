import type React from "react";
import { useRef, useState } from "react";

import {
  EventFormSlot,
  EventMutationScopeSlot,
} from "@/components/calendar-slots";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { useEffectiveBusinessHours } from "@/features/calendar/hooks/use-effective-business-hours";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { isBusinessDay } from "@/features/calendar/utils/business-hours";
import {
  buildDateTime,
  buildEndDateTime,
  getTimeConstraints,
} from "@/features/calendar/utils/event-form-utils";
import { useScopedEventMutation } from "@/hooks/use-scoped-event-mutation";
import { hasRef, hasText, hasValue, textOr } from "@/lib/guards";
import type { BusinessHours, CalendarEvent, Resource } from "@/types/index";
import { readableTextColor } from "@/utils/helpers";
import {
  format,
  isAfter,
  isBefore,
  isSame,
  now,
  toDate,
  toZonedDateTime,
} from "@/utils/temporal";

// Default event color, kept as a Tailwind class-pair (theme-aware) like before.
const DEFAULT_EVENT_COLOR = "bg-blue-100 text-blue-800";

// Curated swatches: the original Tailwind class-pairs (theme-aware). The picker
// additionally allows any custom color via its native input + hex field.
const EVENT_COLOR_SWATCHES = [
  { label: "Blue", value: DEFAULT_EVENT_COLOR },
  { label: "Green", value: "bg-green-100 text-green-800" },
  { label: "Purple", value: "bg-purple-100 text-purple-800" },
  { label: "Red", value: "bg-red-100 text-red-800" },
  { label: "Yellow", value: "bg-yellow-100 text-yellow-800" },
  { label: "Pink", value: "bg-pink-100 text-pink-800" },
  { label: "Indigo", value: "bg-indigo-100 text-indigo-800" },
  { label: "Amber", value: "bg-amber-100 text-amber-800" },
  { label: "Emerald", value: "bg-emerald-100 text-emerald-800" },
  { label: "Sky", value: "bg-sky-100 text-sky-800" },
  { label: "Violet", value: "bg-violet-100 text-violet-800" },
  { label: "Rose", value: "bg-rose-100 text-rose-800" },
  { label: "Teal", value: "bg-teal-100 text-teal-800" },
  { label: "Orange", value: "bg-orange-100 text-orange-800" },
];

// All-day events end at the end of the day; the end time also resets to this
// when "all day" is switched on.
const ALL_DAY_END_TIME = "23:59";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

// The picker's value is whatever the event already stored (a Tailwind class-pair
// from a swatch, or a hex). Prefer a hex `backgroundColor`, then `color`, else
// the default class-pair.
const resolveInitialColor = (
  backgroundColor: string | null | undefined,
  color: string | undefined
): string => {
  if (hasText(backgroundColor) && HEX_COLOR_PATTERN.test(backgroundColor)) {
    return backgroundColor;
  }

  return color ?? DEFAULT_EVENT_COLOR;
};

// A swatch stores a Tailwind class-pair in `color`; a custom hex stores
// `backgroundColor` + a readable text `color`.
const buildColorFields = (
  color: string
): Pick<CalendarEvent, "backgroundColor" | "color"> => {
  if (HEX_COLOR_PATTERN.test(color)) {
    return { backgroundColor: color, color: readableTextColor(color) };
  }

  return { backgroundColor: null, color };
};

// Write the new color only when the user picked one (or the event had none).
// Otherwise preserve the event's original color (legacy class-pair or hex) as-is.
const buildColorFieldsFor = ({
  colorChanged,
  hadInitialColor,
  selectedColor,
  initialBackgroundColor,
  initialColor,
}: {
  colorChanged: boolean;
  hadInitialColor: boolean;
  selectedColor: string;
  initialBackgroundColor: string | null | undefined;
  initialColor: string | undefined;
}): Pick<CalendarEvent, "backgroundColor" | "color"> => {
  if (colorChanged || !hadInitialColor) {
    return buildColorFields(selectedColor);
  }

  return { backgroundColor: initialBackgroundColor, color: initialColor };
};

// The form's initial field values: the selected event's fields, or the
// new-event defaults. `now()` is called here, once per new event.
const resolveInitialFields = <TMeta = unknown,>(
  selectedEvent: CalendarEvent<TMeta> | null | undefined
) => {
  const {
    id: selectedEventId,
    resourceId,
    resourceIds,
    start = now(),
    end = now().add({ hours: 1 }),
    allDay: initialAllDay = false,
    color: initialColor,
    backgroundColor: initialBackgroundColor,
    title: initialTitle = "",
    description: initialDescription = "",
    location: initialLocation = "",
  } = selectedEvent ?? {};

  return {
    end,
    initialAllDay,
    initialBackgroundColor,
    initialColor,
    initialDescription,
    initialLocation,
    initialTitle,
    resourceId,
    resourceIds,
    selectedEventId,
    start,
  };
};

type TextFieldName = "title" | "description" | "location";

interface EventFormTextFieldProps {
  label: string;
  // Render a multi-line textarea (e.g. for the description) instead of an input.
  multiline?: boolean;
  name: TextFieldName;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}

// Shared title / description / location inputs (must live outside EventForm to keep focus).
const EventFormTextField = ({
  name,
  label,
  placeholder,
  value,
  required = false,
  multiline = false,
  onChange,
}: EventFormTextFieldProps) => (
  <div className="grid gap-1 sm:gap-2">
    <Label className="text-xs sm:text-sm" htmlFor={name}>
      {label}
    </Label>
    {multiline ? (
      <Textarea
        className="min-h-16 text-sm"
        id={name}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    ) : (
      <Input
        className="h-8 text-sm sm:h-9"
        id={name}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    )}
  </div>
);

export interface EventFormProps<TMeta = unknown> {
  onAdd?: (event: CalendarEvent<TMeta>) => void;
  onClose: () => void;
  onDelete?: (event: CalendarEvent<TMeta>) => void;
  onUpdate?: (event: CalendarEvent<TMeta>) => void;
  open?: boolean;
  selectedEvent?: CalendarEvent<TMeta> | null;
}

interface ResourceSelectFieldProps {
  onChange: (value: string | null) => void;
  resources: Resource[];
  value: string | null;
}

/** Resource picker, shown when the calendar exposes more than one. */
const ResourceSelectField = ({
  onChange,
  resources,
  value,
}: ResourceSelectFieldProps) => {
  const { t } = useSmartCalendarContext((context) => ({ t: context.t }));

  return (
    <div className="grid gap-1 sm:gap-2">
      <Label className="text-xs sm:text-sm" htmlFor="resource">
        {t("resource")}
      </Label>
      <Select
        items={resources.map((resource) => ({
          label: resource.title,
          value: String(resource.id),
        }))}
        onValueChange={onChange}
        value={value}
      >
        <SelectTrigger
          className="h-8 text-sm sm:h-9"
          data-testid="resource-select"
          id="resource"
        >
          <SelectValue placeholder={t("selectResource")} />
        </SelectTrigger>
        <SelectContent>
          {resources.map((resource) => (
            <SelectItem
              key={String(resource.id)}
              label={resource.title}
              value={String(resource.id)}
            >
              {resource.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface EventScheduleFieldsProps {
  businessHours: BusinessHours | BusinessHours[] | undefined;
  endDate: Date;
  endTime: string;
  isAllDay: boolean;
  onEndDateChange: (date: Date | undefined) => void;
  onEndTimeChange: (time: string) => void;
  onStartDateChange: (date: Date | undefined) => void;
  onStartTimeChange: (time: string) => void;
  startDate: Date;
  startTime: string;
}

/**
 * Start / end date and time fields. The time bounds come from the effective
 * business hours, and the time fields stay hidden for all-day events.
 */
const EventScheduleFields = ({
  businessHours,
  endDate,
  endTime,
  isAllDay,
  onEndDateChange,
  onEndTimeChange,
  onStartDateChange,
  onStartTimeChange,
  startDate,
  startTime,
}: EventScheduleFieldsProps) => {
  const { t, timeFormat } = useSmartCalendarContext((context) => ({
    t: context.t,
    timeFormat: context.timeFormat,
  }));

  let disabledDateMatcher: ((date: Date) => boolean) | undefined;

  if (businessHours) {
    disabledDateMatcher = (date) =>
      !isBusinessDay(toZonedDateTime(date), businessHours);
  }

  const startConstraints = getTimeConstraints(startDate, businessHours);
  const endConstraints = getTimeConstraints(endDate, businessHours);

  const dateFields = [
    ["startDate", startDate, onStartDateChange],
    ["endDate", endDate, onEndDateChange],
  ] as const;

  const timeFields = [
    ["startTime", "start-time", startTime, onStartTimeChange, startConstraints],
    ["endTime", "end-time", endTime, onEndTimeChange, endConstraints],
  ] as const;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {dateFields.map(([label, date, onChange]) => (
          <div key={label}>
            <Label className="text-xs sm:text-sm">{t(label)}</Label>
            <DatePicker
              className="mt-1"
              closeOnSelect
              date={date}
              disabled={disabledDateMatcher}
              onChange={onChange}
            />
          </div>
        ))}
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {timeFields.map(([label, name, value, onChange, c]) => (
            <div key={label}>
              <Label className="text-xs sm:text-sm">{t(label)}</Label>
              <TimePicker
                className="mt-1 h-8 text-sm sm:h-9"
                maxTime={c.max}
                minTime={c.min}
                name={name}
                onChange={onChange}
                placeholder={t("searchTime")}
                timeFormat={timeFormat}
                value={value}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

interface EventFormFooterProps {
  isResourceMissing: boolean;
  onClose: () => void;
  onDelete: () => void;
  selectedEventId: CalendarEvent["id"] | undefined;
}

/** Cancel / submit actions, plus delete when an existing event is edited. */
const EventFormFooter = ({
  isResourceMissing,
  onClose,
  onDelete,
  selectedEventId,
}: EventFormFooterProps) => {
  const { t } = useSmartCalendarContext((context) => ({ t: context.t }));

  return (
    <DialogFooter className="mt-4 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
      {hasRef(selectedEventId) ? (
        <Button
          className="w-full sm:mr-auto sm:w-auto"
          onClick={onDelete}
          size="sm"
          type="button"
          variant="destructive"
        >
          {t("delete")}
        </Button>
      ) : null}
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          className="flex-1 sm:flex-none"
          onClick={onClose}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("cancel")}
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          disabled={isResourceMissing}
          size="sm"
          type="submit"
        >
          {hasRef(selectedEventId) ? t("update") : t("create")}
        </Button>
      </div>
    </DialogFooter>
  );
};

/**
 * Event colour, plus whether the user actually picked one. Existing events
 * keep their original colour (legacy Tailwind class-pair included) unless a
 * new one is picked, so the flag is only read when submitting.
 */
const useEventColor = (
  initialColor: string | undefined,
  initialBackgroundColor: string | null | undefined
) => {
  const [selectedColor, setSelectedColor] = useState(() =>
    resolveInitialColor(initialBackgroundColor, initialColor)
  );

  const colorPickedRef = useRef(false);
  const hadInitialColor = Boolean(textOr(initialColor, initialBackgroundColor));

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    colorPickedRef.current = true;
  };

  // Only the picked-colour path writes the new hex model; otherwise the
  // event keeps whatever colour it already had.
  const resolveColorFields = () =>
    buildColorFieldsFor({
      colorChanged: colorPickedRef.current,
      hadInitialColor,
      initialBackgroundColor,
      initialColor,
      selectedColor,
    });

  return { handleColorChange, resolveColorFields, selectedColor };
};

/**
 * Start / end date and time state. The date and time handlers keep the pair
 * consistent: picking a start past the end moves the end, and the same for
 * the times when both fall on one day. An all-day event ends at the end of
 * the day, so switching "all day" off afterwards leaves a sensible end time.
 */
const useEventSchedule = ({
  end,
  initialAllDay,
  start,
}: {
  end: CalendarEvent["end"];
  initialAllDay: boolean;
  start: CalendarEvent["start"];
}) => {
  const [startDate, setStartDate] = useState(() => toDate(start));
  const [endDate, setEndDate] = useState(() => toDate(end));
  const [isAllDay, setIsAllDay] = useState(initialAllDay);
  const [startTime, setStartTime] = useState(() => format(start, "HH:mm"));

  const [endTime, setEndTime] = useState(() =>
    initialAllDay ? ALL_DAY_END_TIME : format(end, "HH:mm")
  );

  // Create wrapper functions to fix TypeScript errors with DatePicker
  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    setStartDate(date);

    if (isAfter(toZonedDateTime(date), toZonedDateTime(endDate))) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    setEndDate(date);

    if (
      hasValue(date) &&
      isBefore(toZonedDateTime(date), toZonedDateTime(startDate))
    ) {
      setStartDate(date);
    }
  };

  // Time validation handlers - only validate when dates are the same
  const handleStartTimeChange = (time: string) => {
    setStartTime(time);

    // Only validate if same day
    if (
      isSame(toZonedDateTime(startDate), toZonedDateTime(endDate), "day") &&
      time > endTime
    ) {
      setEndTime(time);
    }
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);

    // Only validate if same day
    if (
      isSame(toZonedDateTime(startDate), toZonedDateTime(endDate), "day") &&
      time < startTime
    ) {
      setStartTime(time);
    }
  };

  const handleAllDayChange = (checked: boolean) => {
    const next = checked;
    setIsAllDay(next);

    if (next) {
      setEndTime(ALL_DAY_END_TIME);
    }
  };

  return {
    endDate,
    endTime,
    handleAllDayChange,
    handleEndDateChange,
    handleEndTimeChange,
    handleStartDateChange,
    handleStartTimeChange,
    isAllDay,
    startDate,
    startTime,
  };
};

export const EventForm: React.FC<EventFormProps> = ({
  selectedEvent,
  onClose,
  onUpdate,
  onDelete,
  onAdd,
}) => {
  const {
    dialogState,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    handleConfirm,
  } = useScopedEventMutation(onClose);

  const { t, getEventManager, resources } = useSmartCalendarContext(
    (context) => ({
      getEventManager: context.getEventManager,
      resources: context.resources ?? [],
      t: context.t,
    })
  );

  const {
    end,
    initialAllDay,
    initialBackgroundColor,
    initialColor,
    initialDescription,
    initialLocation,
    initialTitle,
    resourceId,
    resourceIds,
    selectedEventId,
    start,
  } = resolveInitialFields(selectedEvent);

  const hasResources = resources.length > 0;
  const initialSelectedResourceId = resourceId ?? resourceIds?.at(0);

  const showResourceSelector =
    hasResources && initialSelectedResourceId === undefined;

  const [selectedResourceId, setSelectedResourceId] = useState<
    string | number | undefined
  >(initialSelectedResourceId);

  const effectiveResourceId = hasResources ? selectedResourceId : resourceId;

  const effectiveBusinessHours = useEffectiveBusinessHours(effectiveResourceId);

  const { handleColorChange, resolveColorFields, selectedColor } =
    useEventColor(initialColor, initialBackgroundColor);

  const {
    endDate,
    endTime,
    handleAllDayChange,
    handleEndDateChange,
    handleEndTimeChange,
    handleStartDateChange,
    handleStartTimeChange,
    isAllDay,
    startDate,
    startTime,
  } = useEventSchedule({ end, initialAllDay, start });

  // Whether a plugin owns this event (gates the scoped edit/delete flow)
  const eventIsOwned = Boolean(selectedEvent && getEventManager(selectedEvent));

  // Initialize form values from selected event or defaults
  const [formValues, setFormValues] = useState({
    description: initialDescription,
    location: initialLocation,
    title: initialTitle,
  });

  // Generic draft of plugin-contributed fields (e.g. recurrence's rrule).
  // Plugins push their fields through the event-form slot's `onChange`.
  const [pluginUpdates, setPluginUpdates] = useState<Partial<CalendarEvent>>(
    {}
  );

  // The event as the plugin editors see it: the selected event plus any
  // in-progress plugin fields, so their inputs stay controlled. Object.assign
  // (rather than a spread) keeps the result typed as a full CalendarEvent:
  // spreading a possibly-null source would make every field optional.
  // oxlint-disable-next-line eslint/prefer-object-spread -- a spread would make every property optional because the source is possibly-nullish so the result would no longer satisfy the full CalendarEvent the slot contract requires
  const draftEvent: CalendarEvent = Object.assign(
    {},
    selectedEvent,
    pluginUpdates
  );

  const mergePluginUpdates = (updates: Partial<CalendarEvent>) => {
    setPluginUpdates((prev) => ({ ...prev, ...updates }));
  };

  // Update form values when input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const resolveResourceId = (value: string): string | number => {
    const resource = resources.find((item) => String(item.id) === value);

    return resource?.id ?? value;
  };

  const isResourceMissing =
    showResourceSelector && selectedResourceId === undefined;

  const handleResourceChange = (value: string | null) => {
    if (value === null) {
      return;
    }

    setSelectedResourceId(resolveResourceId(value));
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isResourceMissing) {
      return;
    }

    const startDateTime = buildDateTime(startDate, startTime, isAllDay);
    const endDateTime = buildEndDateTime(endDate, endTime, isAllDay);

    const colorFields = resolveColorFields();

    const eventData: CalendarEvent = {
      allDay: isAllDay,
      description: formValues.description,
      end: endDateTime,
      id: selectedEventId ?? format(now(), "YYYYMMDDHHmmss"),
      location: formValues.location,
      resourceId: effectiveResourceId,
      start: startDateTime,
      title: formValues.title,
      ...colorFields,
      ...pluginUpdates,
    };

    if (hasRef(selectedEvent?.id) && eventIsOwned) {
      openEditDialog(selectedEvent, {
        allDay: isAllDay,
        color: selectedColor,
        description: formValues.description,
        end: endDateTime,
        location: formValues.location,
        resourceId: effectiveResourceId,
        start: startDateTime,
        title: formValues.title,
        ...pluginUpdates,
      });

      return;
    }

    if (hasRef(selectedEventId)) {
      onUpdate?.(eventData);
    } else {
      onAdd?.(eventData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (!hasRef(selectedEvent?.id)) {
      return;
    }

    // A plugin owns this event (e.g. recurring): let it gather the delete
    // scope via its dialog; don't close the form yet.
    if (eventIsOwned) {
      openDeleteDialog(selectedEvent);

      return;
    }

    onDelete?.(selectedEvent);
    onClose();
  };

  // Base UI treats `undefined` as uncontrolled and warns when the value later
  // becomes defined. Keep it controlled with `null` (Base UI's "no selection")
  // while no resource is chosen.
  const resourceSelectValue = hasRef(selectedResourceId)
    ? String(selectedResourceId)
    : null;

  return (
    <>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-3 p-1 sm:gap-4">
            <EventFormTextField
              label={t("title")}
              name="title"
              onChange={handleInputChange}
              placeholder={t("eventTitlePlaceholder")}
              required
              value={formValues.title}
            />
            <EventFormTextField
              label={t("description")}
              multiline
              name="description"
              onChange={handleInputChange}
              placeholder={t("eventDescriptionPlaceholder")}
              value={formValues.description}
            />

            {showResourceSelector ? (
              <ResourceSelectField
                onChange={handleResourceChange}
                resources={resources}
                value={resourceSelectValue}
              />
            ) : null}

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={isAllDay}
                id="allDay"
                onCheckedChange={handleAllDayChange}
              />
              <Label className="text-xs sm:text-sm" htmlFor="allDay">
                {t("allDay")}
              </Label>
            </div>

            <EventScheduleFields
              businessHours={effectiveBusinessHours}
              endDate={endDate}
              endTime={endTime}
              isAllDay={isAllDay}
              onEndDateChange={handleEndDateChange}
              onEndTimeChange={handleEndTimeChange}
              onStartDateChange={handleStartDateChange}
              onStartTimeChange={handleStartTimeChange}
              startDate={startDate}
              startTime={startTime}
            />

            <div className="grid gap-1 sm:gap-2">
              <Label className="text-xs sm:text-sm">{t("color")}</Label>
              <ColorPicker
                aria-label={t("color")}
                onChange={handleColorChange}
                swatches={EVENT_COLOR_SWATCHES}
                value={selectedColor}
              />
            </div>

            <EventFormTextField
              label={t("location")}
              name="location"
              onChange={handleInputChange}
              placeholder={t("eventLocationPlaceholder")}
              value={formValues.location}
            />

            {/* Plugin-provided form sections (e.g. the recurrence editor). */}
            <EventFormSlot event={draftEvent} onChange={mergePluginUpdates} />
          </div>
        </ScrollArea>

        <EventFormFooter
          isResourceMissing={isResourceMissing}
          onClose={onClose}
          onDelete={handleDelete}
          selectedEventId={selectedEventId}
        />
      </form>

      {/* Scope dialog, provided by the owning plugin (e.g. recurrence) */}
      <EventMutationScopeSlot
        dialog={dialogState}
        onCancel={closeDialog}
        onResolve={handleConfirm}
      />
    </>
  );
};
