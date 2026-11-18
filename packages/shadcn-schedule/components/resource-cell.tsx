import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import type { Resource } from "@/types/index";

interface ResourceCellProps {
  children?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  resource: Resource;
}

export const ResourceCell: React.FC<ResourceCellProps> = ({
  resource,
  className,
  children,
  "data-testid": dataTestId,
}) => {
  const { renderResource } = useSmartCalendarContext();

  return (
    <div
      className={cn("flex items-center justify-center p-2", className)}
      data-testid={dataTestId}
      style={{
        backgroundColor: resource.backgroundColor,
        color: resource.color,
      }}
    >
      {renderResource
        ? renderResource(resource)
        : (children ?? (
            <div className="truncate text-sm font-medium">{resource.title}</div>
          ))}
    </div>
  );
};
