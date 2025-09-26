import React, { useState, useCallback } from "react"; // Importar React e useCallback
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, MessageSquare, Eye, User } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatSaoPauloDate } from "@/utils/date-utils";

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
  due_time?: string;
  attachments?: Attachment[];
  actionType?: TaskActionType;
  comments?: Comment[];
  position: number;
  assignedTo?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
}

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
  onApprove?: (taskId: string) => void;
  onEditRequest?: (taskId: string) => void;
}

export const KanbanCard = React.memo(function KanbanCard({
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

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleActionClick = useCallback((
    e: React.MouseEvent,
    action?: (taskId: string) => void
  ) => {
    e.stopPropagation();
    if (action) {
      action(task.id);
    }
  }, [task.id]);

  const handleImagePreviewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const coverImage = task.attachments?.find((att) => att.isCover)?.url;
    if (coverImage) {
      setPreviewImageUrl(coverImage);
      setIsPreviewModalOpen(true);
    }
  }, [task.attachments]);

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
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className="cursor-pointer hover:ring-2 hover:ring-primary transition-shadow"
      >
        {coverImage && (
          <div> 
            <AspectRatio ratio={16 / 9} className="rounded-t-lg overflow-hidden group relative">
              <img
                src={coverImage}
                alt={task.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div 
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleImagePreviewClick}
              >
                <Eye className="h-8 w-8 text-white" />
              </div>
            </AspectRatio>
          </div>
        )}
        <CardContent className={cn("p-4 pb-2", coverImage && "pt-2")}>
          <p className="font-medium">{task.title}</p>
          {task.assignedTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignedToAvatar || undefined} loading="lazy" />
                <AvatarFallback className="text-xs">{task.assignedToName?.charAt(0) || <User className="h-3 w-3" />}</AvatarFallback>
              </Avatar>
              <span>{task.assignedToName}</span>
            </div>
          )}
        </CardContent>

        {(task.dueDate || (task.comments && task.comments.length > 0)) && (
          <div className="px-4 pb-2 flex justify-between items-center text-sm text-muted-foreground">
            {task.dueDate ? (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>{formatSaoPauloDate(task.dueDate)}</span>
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
                className="w-full dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                variant="secondary"
              >
                Aprovar
              </Button>
            )}
            {onEditRequest && (
              <Button
                onClick={(e) => handleActionClick(e, onEditRequest)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Editar
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
      <ImagePreviewModal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
        imageUrl={previewImageUrl} 
      />
    </>
  );
});