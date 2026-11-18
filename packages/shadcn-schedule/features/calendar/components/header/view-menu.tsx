import { Check, ChevronDown } from "lucide-react";
import { useCallback } from "react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHeaderViews } from "@/features/calendar/components/header/use-header-views";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";

interface ViewMenuProps {
  className?: string;
}

// One entry in the dropdown: wraps DropdownMenuItem so the select handler is a
// stable useCallback reference instead of an inline closure.
const ViewMenuItem = ({
  active,
  icon: Icon,
  label,
  name,
  onSelect,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  name: string;
  onSelect: (view: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(name);
  }, [name, onSelect]);

  return (
    <DropdownMenuItem onSelect={handleSelect}>
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {active ? <Check className="size-4" /> : null}
    </DropdownMenuItem>
  );
};

// Compact view picker (tablet/phone): a dropdown showing the current view, with
// a checkmark on the active one. Collapses the desktop segmented switcher.
export const ViewMenu = ({ className }: ViewMenuProps) => {
  const { view, setView, t } = useSmartCalendarContext((ctx) => ({
    setView: ctx.setView,
    t: ctx.t,
    view: ctx.view,
  }));

  const views = useHeaderViews();
  const current = views.find((v) => v.name === view);
  const currentLabel = current ? t(current.label ?? current.name) : "";
  const CurrentIcon = current?.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className={className} size="default" variant="outline">
            {CurrentIcon ? <CurrentIcon className="size-4" /> : null}
            <span>{currentLabel}</span>
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-40">
        {views.map((v) => (
          <ViewMenuItem
            active={v.name === view}
            icon={v.icon}
            key={v.name}
            label={t(v.label ?? v.name)}
            name={v.name}
            onSelect={setView}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
