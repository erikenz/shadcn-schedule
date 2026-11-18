import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import type { Resource } from "@/types/index";

export interface ResourceCellProps {
  children?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  resource: Resource;
  style?: React.CSSProperties;
}

export const ResourceCell: React.FC<ResourceCellProps> = ({
  resource,
  className,
  children,
  style,
  "data-testid": dataTestId,
}) => {
  const { renderResource } = useSmartCalendarContext();

  return (
    <div
      className={cn("flex min-w-0 items-center justify-center p-2", className)}
      data-testid={dataTestId}
      style={{
        backgroundColor: resource.backgroundColor,
        color: resource.color,
        ...style,
      }}
    >
      {renderResource
        ? renderResource(resource)
        : (children ?? (
            // oxlint-disable-next-line github/a11y-no-title-attribute -- native tooltip for truncated resource label
            <div
              className="min-w-0 truncate text-sm font-medium"
              title={resource.title}
            >
              {resource.title}
            </div>
          ))}
    </div>
  );
};
