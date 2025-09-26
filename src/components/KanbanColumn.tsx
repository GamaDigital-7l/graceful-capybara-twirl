import React, { useMemo, useState, useCallback } from "react";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { KanbanCard, Task } from "./KanbanCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "./ui/badge";

export interface Column {
  id: string;
  title: string;
  position: number; // Adicionado
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onCardClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onUpdateColumn: (columnId: string, title: string) => void;
  onApproveTask: (taskId: string) => void;
  onEditRequestTask: (taskId: string) => void;
}

export const KanbanColumn = React.memo(function KanbanColumn({
  column,
  tasks,
  onCardClick,
  onAddTask,
  onDeleteColumn,
  onUpdateColumn,
  onApproveTask,
  onEditRequestTask,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title);

  const tasksIds = useMemo(() => {
    return tasks.map((task) => task.id);
  }, [tasks]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleTitleBlur = useCallback(() => {
    if (title !== column.title) {
      onUpdateColumn(column.id, title);
    }
    setIsEditing(false);
  }, [title, column.title, column.id, onUpdateColumn]);

  const handleDeleteColumnClick = useCallback(() => {
    onDeleteColumn(column.id);
  }, [column.id, onDeleteColumn]);

  const handleAddTaskClick = useCallback(() => {
    onAddTask(column.id);
  }, [column.id, onAddTask]);

  const MemoizedKanbanCard = React.memo(KanbanCard);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-[300px] flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-primary opacity-50 h-[500px]"
      />
    );
  }

  return (
    <Card ref={setNodeRef} style={style} className="flex flex-col w-[300px] flex-shrink-0">
      <CardHeader
        {...attributes}
        {...listeners}
        className="flex flex-row items-center justify-between cursor-grab p-4"
      >
        <div className="flex items-center gap-2 flex-grow" onClick={() => setIsEditing(true)}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{column.title}</h3>
              <Badge variant="secondary" className="h-5">{tasks.length}</Badge>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar Coluna
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá deletar a coluna "{column.title}" e todas as suas tarefas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteColumnClick}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-grow overflow-y-auto">
        <SortableContext items={tasksIds}>
          {tasks.map((task) => (
            <MemoizedKanbanCard
              key={task.id}
              task={task}
              onClick={() => onCardClick(task)}
              onApprove={onApproveTask}
              onEditRequest={onEditRequestTask}
            />
          ))}
        </SortableContext>
      </CardContent>
      <div className="p-4 pt-0">
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleAddTaskClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Tarefa
        </Button>
      </div>
    </Card>
  );
});