import React, { useCallback } from "react"; // Importar React e useCallback
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { isPast } from "date-fns";
import { Pencil, Trash2, CalendarDays, Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalTask } from "./PersonalTaskModal";
import { Label } from "@/components/ui/label";
import { Badge } from "./ui/badge";
import { formatSaoPauloDate, formatSaoPauloHour, toSaoPauloTime, formatSaoPauloTime } from "@/utils/date-utils"; // Adicionadas importações

interface PersonalTaskCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, isCompleted: boolean) => void;
}

export const PersonalTaskCard = React.memo(function PersonalTaskCard({ task, onEdit, onDelete, onToggleComplete }: PersonalTaskCardProps) {
  // Combine due_date and due_time into a single Date object in São Paulo timezone for comparison
  const fullDueDateTimeSaoPaulo = task.due_time
    ? toSaoPauloTime(`${formatSaoPauloTime(task.due_date, 'yyyy-MM-dd')}T${task.due_time}:00`)
    : toSaoPauloTime(task.due_date);

  const isOverdue = !task.is_completed && isPast(fullDueDateTimeSaoPaulo);

  const getPriorityBadgeVariant = useCallback((priority: PersonalTask['priority']) => {
    switch (priority) {
      case 'Highest': return 'destructive';
      case 'High': return 'default';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  }, []);

  const getPriorityLabel = useCallback((priority: PersonalTask['priority']) => {
    switch (priority) {
      case 'Highest': return 'Mais Alta';
      case 'High': return 'Alta';
      case 'Medium': return 'Média';
      case 'Low': return 'Baixa';
      default: return 'Média';
    }
  }, []);

  const handleEditClick = useCallback(() => onEdit(task), [onEdit, task]);
  const handleDeleteClick = useCallback(() => onDelete(task.id!), [onDelete, task.id]);
  const handleToggleCompleteChange = useCallback((checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      onToggleComplete(task.id!, checked);
    }
  }, [onToggleComplete, task.id]);

  return (
    <Card className={cn(
      "flex items-center justify-between p-4 transition-all duration-300 ease-in-out",
      task.is_completed && "opacity-70 line-through bg-green-50/20 dark:bg-green-900/10",
      isOverdue && "border-destructive ring-1 ring-destructive"
    )}>
      <div className="flex items-center space-x-4 flex-grow">
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={handleToggleCompleteChange}
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
              <span>{formatSaoPauloDate(task.due_date)}</span>
            </div>
            {task.due_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatSaoPauloHour(new Date(`2000-01-01T${task.due_time}`))}</span>
              </div>
            )}
            {task.priority && (
              <Badge variant={getPriorityBadgeVariant(task.priority)} className="flex items-center gap-1">
                <Flag className="h-3 w-3" /> {getPriorityLabel(task.priority)}
              </Badge>
            )}
            {isOverdue && (
              <span className="text-destructive font-semibold ml-2">Atrasado!</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button variant="ghost" size="icon" onClick={handleEditClick}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});