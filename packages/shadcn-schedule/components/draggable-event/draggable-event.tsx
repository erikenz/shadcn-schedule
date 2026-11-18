import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import { memo, useCallback } from "react";

import { AnimatedSection } from "@/components/animations/animated-section";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasText, textOr } from "@/lib/guards";
import type { CalendarEvent } from "@/types/index";
import { readableTextColor } from "@/utils/helpers";

const getBorderRadiusClass = (
  isTruncatedStart: boolean,
  isTruncatedEnd: boolean
) => {
  if (isTruncatedStart && isTruncatedEnd) {
    return "rounded-none";
  }

  if (isTruncatedStart) {
    return "rounded-r-md rounded-l-none";
  }

  if (isTruncatedEnd) {
    return "rounded-l-md rounded-r-none";
  }

  return "rounded-md";
};

interface DraggableEventProps {
  elementId: string;
  className?: string;
  style?: CSSProperties;
  event: CalendarEvent;
  disableDrag?: boolean;
  /** Set by the horizontal events layer when the bar continues past the visible range. */
  isTruncatedStart?: boolean;
  isTruncatedEnd?: boolean;
}

interface ResolvedEventColors {
  className?: string;
  style?: CSSProperties;
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

const resolveEventColors = (event: CalendarEvent): ResolvedEventColors => {
  const color = hasText(event.color) ? event.color : "";
  const bg = hasText(event.backgroundColor) ? event.backgroundColor : "";

  const hexColor = HEX_PATTERN.test(color) ? color : null;
  const hexBg = HEX_PATTERN.test(bg) ? bg : null;

  if (hexBg !== null) {
    const isTailwindTextColor = color.length > 0 && !HEX_PATTERN.test(color);

    const style: CSSProperties = {
      backgroundColor: hexBg,
    };

    if (!isTailwindTextColor) {
      style.color = color.length > 0 ? color : readableTextColor(hexBg);
    }

    const resolved: ResolvedEventColors = { style };

    if (isTailwindTextColor) {
      resolved.className = color;
    }

    return resolved;
  }

  if (hexColor !== null) {
    // Single hex color supplied: use it as the fill background with computed high-contrast text
    return {
      style: {
        backgroundColor: hexColor,
        color: readableTextColor(hexColor),
      },
    };
  }

  const isRawColorText = color.length > 0 && !color.includes("text-");
  const fallbackStyle: CSSProperties = {};

  if (bg.length > 0) {
    fallbackStyle.backgroundColor = bg;
  }

  if (isRawColorText) {
    fallbackStyle.color = color;
  }

  const result: ResolvedEventColors = {
    className: cn(
      textOr(event.backgroundColor, "bg-blue-500"),
      textOr(event.color, "text-white")
    ),
  };

  if (Object.keys(fallbackStyle).length > 0) {
    result.style = fallbackStyle;
  }

  return result;
};

/**
 * The fallback event body: the colored bar, its truncation indicators and the
 * title. Used when no `renderEvent` is supplied from context.
 */
const DefaultEventContent = ({
  event,
  isTruncatedStart,
  isTruncatedEnd,
}: Required<
  Pick<DraggableEventProps, "event" | "isTruncatedStart" | "isTruncatedEnd">
>) => {
  const { className: colorClassName, style: colorStyle } =
    resolveEventColors(event);

  return (
    <div
      className={cn(
        "border-card relative h-full w-full overflow-clip border-[1.5px] px-1 text-left",
        colorClassName,
        getBorderRadiusClass(isTruncatedStart, isTruncatedEnd)
      )}
      style={colorStyle}
    >
      {/* Left continuation indicator */}
      {isTruncatedStart ? (
        <div className="bg-foreground/25 absolute top-0 bottom-0 left-0 w-0.5" />
      ) : null}

      {/* Event title */}
      <p
        className={cn(
          "mt-0.5 text-[10px] font-semibold sm:text-xs",
          // Add slight padding to avoid overlap with indicators
          isTruncatedStart && "pl-1",
          isTruncatedEnd && "pr-1"
        )}
      >
        {event.title}
      </p>

      {/* Right continuation indicator */}
      {isTruncatedEnd ? (
        <div className="bg-foreground/25 absolute top-0 right-0 bottom-0 w-0.5" />
      ) : null}
    </div>
  );
};

const DraggableEventUnmemoized = ({
  elementId,
  event,
  className,
  style,
  disableDrag = false,
  isTruncatedStart = false,
  isTruncatedEnd = false,
}: DraggableEventProps) => {
  const { onEventClick, renderEvent, disableEventClick, disableDragAndDrop } =
    useSmartCalendarContext();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEventClick(event, e);
    },
    [event, onEventClick]
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    data: {
      event,
      type: "calendar-event",
    },
    disabled: disableDrag || disableDragAndDrop,
    id: elementId,
  });

  // Default event content to render if custom renderEvent is not provided
  const defaultEventContent = (
    <DefaultEventContent
      event={event}
      isTruncatedEnd={isTruncatedEnd}
      isTruncatedStart={isTruncatedStart}
    />
  );

  const renderedEvent = renderEvent
    ? renderEvent(event, {
        isStart: !isTruncatedStart,
        isEnd: !isTruncatedEnd,
      })
    : null;

  const isDragDisabled = disableDrag || disableDragAndDrop;

  const idleCursorClass = disableEventClick
    ? "cursor-default"
    : "cursor-pointer";

  const cursorClass = isDragDisabled ? idleCursorClass : "cursor-grab";

  const draggingClass =
    isDragging && !isDragDisabled && "cursor-grabbing shadow-lg";

  // No drag interactions (the grid is read-only): render a real button.
  // dnd-kit would otherwise spread role="button" + aria-disabled="true" onto
  // a div and drop its keyboard listeners, so assistive tech would announce
  // the event as disabled and keyboard users could never activate it.
  if (isDragDisabled) {
    return (
      <button
        className={cn(
          // oxlint-disable-next-line shadcn/no-unknown-classes -- animate-enter-y lives in the package CSS
          "animate-enter-y inline-block h-full w-full touch-pan-y truncate select-none",
          idleCursorClass,
          className
        )}
        data-calendar-event="true"
        disabled={disableEventClick}
        key={elementId}
        onClick={handleClick}
        style={style}
        type="button"
      >
        {renderedEvent ?? defaultEventContent}
      </button>
    );
  }

  return (
    <AnimatedSection
      className={cn(
        "h-full w-full touch-pan-y truncate",
        cursorClass,
        draggingClass,
        className
      )}
      data-calendar-event="true"
      onClick={handleClick}
      ref={setNodeRef}
      style={style}
      transitionKey={elementId}
      {...attributes}
      {...listeners}
    >
      {/* Use custom renderEvent from context if available, otherwise use default */}
      {renderedEvent ?? defaultEventContent}
    </AnimatedSection>
  );
};

// Compare the essential props to prevent unnecessary re-renders.
const isSameDraggableEventProps = (
  prevProps: DraggableEventProps,
  nextProps: DraggableEventProps
) => {
  const sameDragIdentity =
    prevProps.elementId === nextProps.elementId &&
    prevProps.disableDrag === nextProps.disableDrag;

  const sameRendering =
    prevProps.className === nextProps.className &&
    prevProps.event === nextProps.event;

  const sameTruncation =
    prevProps.isTruncatedStart === nextProps.isTruncatedStart &&
    prevProps.isTruncatedEnd === nextProps.isTruncatedEnd;

  return sameDragIdentity && sameRendering && sameTruncation;
};

export const DraggableEvent = memo(
  DraggableEventUnmemoized,
  isSameDraggableEventProps
);
