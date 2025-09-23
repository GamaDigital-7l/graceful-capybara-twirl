import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { isPast } from "date-fns";
import { Pencil, Trash2, CalendarDays, Clock, Flag } from "lucide-react"; // Import Flag icon
import { cn } from "@/lib/utils";
import { PersonalTask } from "./PersonalTaskModal";
import { Label } from "@/components/ui/label";
import { Badge } from "./ui/badge"; // Import Badge
import { formatSaoPauloDate, formatSaoPauloHour } from "@/utils/date-utils"; // Importar utilitário de data

interface PersonalTaskCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, isCompleted: boolean) => void;
}

export function PersonalTaskCard({ task, onEdit, onDelete, onToggleComplete }: PersonalTaskCardProps) {
  const fullDueDateTime = task.due_time
    ? new Date(`${formatSaoPauloDate(task.due_date)}T${task.due_time}`)
    : task.due_date;

  const isOverdue = !task.is_completed && isPast(fullDueDateTime);

  const getPriorityBadgeVariant = (priority: PersonalTask['priority']) => {
    switch (priority) {
      case 'Highest': return 'destructive';
      case 'High': return 'default'; // You might want a specific 'high' color
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: PersonalTask['priority']) => {
    switch (priority) {
      case 'Highest': return 'Mais Alta';
      case 'High': return 'Alta';
      case 'Medium': return 'Média';
      case 'Low': return 'Baixa';
      default: return 'Média';
    }
  };

  return (
    <Card className={cn(
      "flex items-center justify-between p-4 transition-all duration-300 ease-in-out", // Added transition
      task.is_completed && "opacity-70 line-through bg-green-50/20 dark:bg-green-900/10", // Visual feedback
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