import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import type { RecurrenceEditScope } from "@/plugins/recurrence/types";

const SCOPES = [
  {
    deleteKey: "onlyDeleteThis",
    editKey: "onlyChangeThis",
    scope: "this",
    title: "thisEvent",
  },
  {
    deleteKey: "deleteThisAndFuture",
    editKey: "changeThisAndFuture",
    scope: "following",
    title: "thisAndFollowingEvents",
  },
  {
    deleteKey: "deleteEntireSeries",
    editKey: "changeEntireSeries",
    scope: "all",
    title: "allEvents",
  },
] as const;

interface RecurrenceEditDialogProps {
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: RecurrenceEditScope) => void;
  operationType: "edit" | "delete";
}

export const RecurrenceEditDialog = ({
  isOpen,
  onClose,
  onConfirm,
  operationType,
  eventTitle,
}: RecurrenceEditDialogProps) => {
  const { t } = useCalendarContext();

  const handleScopeSelect = (scope: RecurrenceEditScope) => {
    onConfirm(scope);
    onClose();
  };

  const isEdit = operationType === "edit";

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  let title = t("deleteRecurringEvent");
  let question = t("deleteRecurringEventQuestion");

  if (isEdit) {
    title = t("editRecurringEvent");
    question = t("editRecurringEventQuestion");
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            &quot;{eventTitle}&quot; {question}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {SCOPES.map(({ scope, title: scopeTitle, editKey, deleteKey }) => {
            const handleSelect = () => {
              handleScopeSelect(scope);
            };

            return (
              <Button
                className="h-auto w-full justify-start p-4"
                key={scope}
                onClick={handleSelect}
                variant="outline"
              >
                <div className="text-left">
                  <div className="font-medium">{t(scopeTitle)}</div>
                  <div className="text-muted-foreground text-sm">
                    {t(isEdit ? editKey : deleteKey)}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
