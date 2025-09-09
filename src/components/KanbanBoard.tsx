"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn, Column } from "./KanbanColumn";
import { KanbanCard, Task } from "./KanbanCard";
import { createPortal } from "react-dom";
import { TaskModal } from "./TaskModal";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface KanbanBoardProps {
  groupId: string;
}

// API Functions
const fetchKanbanData = async (groupId: string) => {
  // 1. Fetch columns for the group
  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, title, position")
    .eq("group_id", groupId)
    .order("position");

  if (columnsError) throw new Error(columnsError.message);
  if (!columns) return { columns: [], tasks: [] };

  const columnIds = columns.map((c) => c.id);
  if (columnIds.length === 0) return { columns, tasks: [] };

  // 2. Fetch all tasks for those columns
  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .in("column_id", columnIds)
    .order("position");

  if (tasksError) throw new Error(tasksError.message);

  // 3. Map snake_case from DB to camelCase for frontend components
  const tasks = tasksData.map((task) => ({
    id: task.id,
    columnId: task.column_id,
    title: task.title,
    description: task.description,
    position: task.position,
    dueDate: task.due_date,
    actionType: task.action_type,
    attachments: task.attachments,
    comments: task.comments,
    created_at: task.created_at,
  }));

  return { columns, tasks };
};

export function KanbanBoard({ groupId }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kanbanData", groupId],
    queryFn: () => fetchKanbanData(groupId),
  });

  const columns = data?.columns || [];
  const tasks = data?.tasks || [];

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  );

  // Mutations
  const invalidateKanbanData = () => {
    queryClient.invalidateQueries({ queryKey: ["kanbanData", groupId] });
  };

  const createColumnMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("columns").insert({
        group_id: groupId,
        title: "Nova Coluna",
        position: columns.length,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateKanbanData();
      showSuccess("Coluna criada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("columns").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateKanbanData,
    onError: (e: Error) => showError(e.message),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("columns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateKanbanData();
      showSuccess("Coluna deletada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { id, columnId, dueDate, actionType, ...restOfTask } = task;

      const dataToSave: { [key: string]: any } = {
        ...restOfTask,
        column_id: columnId,
        due_date: dueDate,
        action_type: actionType,
      };

      // Remove undefined keys so they don't overwrite existing values with null
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
          delete dataToSave[key];
        }
      });

      if (id) {
        const { error } = await supabase.from("tasks").update(dataToSave).eq("id", id);
        if (error) throw error;
      } else {
        const tasksInColumn = tasks.filter(t => t.columnId === columnId).length;
        const { error } = await supabase.from("tasks").insert({ ...dataToSave, position: tasksInColumn }).select();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateKanbanData();
      showSuccess("Tarefa salva!");
    },
    onError: (e: Error) => showError(e.message),
  });
  
  const updateTaskPositionMutation = useMutation({
    mutationFn: async (updatedTasks: Task[]) => {
      const updates = updatedTasks.map(task => supabase.from('tasks').update({ column_id: task.columnId, position: task.position }).eq('id', task.id));
      const results = await Promise.all(updates);
      results.forEach(({ error }) => { if (error) throw error; });
    },
    onSuccess: invalidateKanbanData,
    onError: (e: Error) => showError(e.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateKanbanData();
      showSuccess("Tarefa deletada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  // Handlers
  const handleOpenModalForEdit = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleOpenModalForCreate = (columnId: string) => {
    setSelectedTask(null);
    setNewCardColumn(columnId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  // Drag and Drop
  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);

    if (activeTask && overTask) {
        const activeIndex = tasks.indexOf(activeTask);
        const overIndex = tasks.indexOf(overTask);
        const newTasks = arrayMove(tasks, activeIndex, overIndex);
        updateTaskPositionMutation.mutate(newTasks.map((t, i) => ({...t, position: i})));
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isActiveATask = active.data.current?.type === "Task";
    if (!isActiveATask) return;

    const isOverAColumn = over.data.current?.type === "Column";
    if (isOverAColumn) {
        const activeTask = tasks.find(t => t.id === active.id);
        if (activeTask && activeTask.columnId !== over.id) {
            updateTaskPositionMutation.mutate([{...activeTask, columnId: over.id as string, position: 0}]);
        }
    }
  }

  if (isLoading) return <div className="p-8 text-center">Carregando quadro...</div>;

  return (
    <div>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <SortableContext items={columnsId}>
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasks.filter((task) => task.columnId === col.id)}
                onCardClick={handleOpenModalForEdit}
                onAddTask={handleOpenModalForCreate}
                onDeleteColumn={(id) => deleteColumnMutation.mutate(id)}
                onUpdateColumn={(id, title) => updateColumnMutation.mutate({ id, title })}
                onApproveTask={(id) => saveTaskMutation.mutate({ ...tasks.find(t=>t.id===id)!, columnId: 'approved' })}
                onEditRequestTask={(id) => saveTaskMutation.mutate({ ...tasks.find(t=>t.id===id)!, columnId: 'edit-request' })}
              />
            ))}
          </SortableContext>
          <Button onClick={() => createColumnMutation.mutate()} variant="outline" className="h-full min-h-[100px]">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Coluna
          </Button>
        </div>
        {createPortal(
          <DragOverlay>{activeTask && <KanbanCard task={activeTask} onClick={() => {}} />}</DragOverlay>,
          document.body
        )}
      </DndContext>
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={(task) => saveTaskMutation.mutate(task)}
        onDelete={(id) => deleteTaskMutation.mutate(id)}
        task={selectedTask}
        columnId={newCardColumn || undefined}
      />
    </div>
  );
}