"use client";

import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { KanbanCard, Task } from "./KanbanCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";

export interface Column {
  id: string;
  title: string;
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

export function KanbanColumn({
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

  const handleTitleBlur = () => {
    if (title !== column.title) {
      onUpdateColumn(column.id, title);
    }
    setIsEditing(false);
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-primary opacity-50 h-[500px]"
      />
    );
  }

  return (
    <Card ref={setNodeRef} style={style} className="flex flex-col min-h-[200px]">
      <CardHeader
        {...attributes}
        {...listeners}
        className="flex flex-row items-center justify-between cursor-grab"
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
              onClick={(e) => e.stopPropagation()} // Prevent drag from starting on click
            />
          ) : (
            <h3 className="font-bold">{column.title}</h3>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteColumn(column.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-grow">
        <SortableContext items={tasksIds}>
          {tasks.map((task) => (
            <KanbanCard
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
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Tarefa
        </Button>
      </div>
    </Card>
  );
}