"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

export interface Attachment {
  id: string;
  url: string;
  isCover: boolean;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  dueDate?: string;
  attachments?: Attachment[];
}

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
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

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique abra o modal
    showSuccess(`Tarefa "${task.title}" aprovada!`);
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
      <CardContent className={cn("p-4", coverImage && "pt-2")}>
        <p>{task.title}</p>
      </CardContent>
      {task.columnId === "in-progress" && (
        <CardFooter className="p-2 pt-0">
          <Button onClick={handleApprove} size="sm" className="w-full">
            Aprovar Job
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}