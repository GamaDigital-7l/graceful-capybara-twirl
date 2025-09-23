import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalTask } from "./PersonalTaskModal";

interface PersonalTaskCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, isCompleted: boolean) => void;
}

export function PersonalTaskCard({ task, onEdit, onDelete, onToggleComplete }: PersonalTaskCardProps) {
  const fullDueDateTime = task.due_time
    ? new Date(`${format(task.due_date, 'yyyy-MM-dd')}T${task.due_time}`)
    : task.due_date;

  const isOverdue = !task.is_completed && isPast(fullDueDateTime);

  return (
    <Card className={cn(
      "flex items-center justify-between p-4",
      task.is_completed && "opacity-70 line-through",
      isOverdue && "border-destructive ring-1 ring-destructive"
    )}>
      <div className="flex items-center space-x-4 flex-grow">
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={(checked: boolean) => onToggleComplete(task.id!, checked)}
          id={`task-${task.id}`}
        />
        <div className="flex-grow">
          <Label htmlFor={`task-${task.id}`} className="text-lg font-medium cursor-pointer">
            {task.title}
          </Label>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>{format(task.due_date, "dd MMM, yyyy", { locale: ptBR })}</span>
            </div>
            {task.due_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{task.due_time}</span>
              </div>
            )}
            {isOverdue && (
              <span className="text-destructive font-semibold ml-2">Atrasado!</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => onDelete(task.id!)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}