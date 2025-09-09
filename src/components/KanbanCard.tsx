"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export interface Attachment {
  id: string;
  url: string;
  isCover: boolean;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type TaskActionType = "review" | "none";

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  dueDate?: string;
  attachments?: Attachment[];
  actionType?: TaskActionType;
  comments?: Comment[];
}

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
  onApprove?: (taskId: string) => void;
  onEditRequest?: (taskId: string) => void;
}

export function KanbanCard({
  task,
  onClick,
  onApprove,
  onEditRequest,
}: KanbanCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleActionClick = (
    e: React.MouseEvent,
    action?: (taskId: string) => void
  ) => {
    e.stopPropagation();
    if (action) {
      action(task.id);
    }
  };

  const coverImage = task.attachments?.find((att) => att.isCover)?.url;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-4 bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-primary opacity-50 h-24"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="touch-none cursor-pointer hover:ring-2 hover:ring-primary transition-shadow"
    >
      {coverImage && (
        <img
          src={coverImage}
          alt={task.title}
          className="w-full h-32 object-cover rounded-t-lg"
        />
      )}
      <CardContent className={cn("p-4 pb-2", coverImage && "pt-2")}>
        <p>{task.title}</p>
      </CardContent>

      {(task.dueDate || (task.comments && task.comments.length > 0)) && (
        <div className="px-4 pb-2 flex justify-between items-center text-sm text-muted-foreground">
          {task.dueDate ? (
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>{format(new Date(task.dueDate), "dd MMM")}</span>
            </div>
          ) : <div />}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>
      )}

      {task.actionType === "review" && (
        <CardFooter className="p-2 pt-0 flex gap-2">
          {onApprove && (
            <Button
              onClick={(e) => handleActionClick(e, onApprove)}
              size="sm"
              className="w-full"
            >
              Aprovar
            </Button>
          )}
          {onEditRequest && (
            <Button
              onClick={(e) => handleActionClick(e, onEditRequest)}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Editar
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}