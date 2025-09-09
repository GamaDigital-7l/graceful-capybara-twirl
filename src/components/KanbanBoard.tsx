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
import { EditRequestModal } from "./EditRequestModal";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface KanbanBoardProps {
  groupId: string;
}

const fetchKanbanData = async (groupId: string) => {
  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, title, position")
    .eq("group_id", groupId)
    .order("position");
  if (columnsError) throw new Error(columnsError.message);
  if (!columns) return { columns: [], tasks: [] };

  const columnIds = columns.map((c) => c.id);
  if (columnIds.length === 0) return { columns, tasks: [] };

  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .in("column_id", columnIds)
    .order("position");
  if (tasksError) throw new Error(tasksError.message);

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
  }));

  return { columns, tasks };
};

export function KanbanBoard({ groupId }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null);
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [taskForEditRequest, setTaskForEditRequest] = useState<(Task & { columnId: string }) | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kanbanData", groupId],
    queryFn: () => fetchKanbanData(groupId),
  });

  const columns = data?.columns || [];
  const tasks = data?.tasks || [];
  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  const invalidateKanbanData = () => queryClient.invalidateQueries({ queryKey: ["kanbanData", groupId] });

  const createColumnMutation = useMutation({
    mutationFn: async () => supabase.from("columns").insert({ group_id: groupId, title: "Nova Coluna", position: columns.length }),
    onSuccess: () => { invalidateKanbanData(); showSuccess("Coluna criada!"); },
    onError: (e: Error) => showError(e.message),
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => supabase.from("columns").update({ title }).eq("id", id),
    onSuccess: invalidateKanbanData,
    onError: (e: Error) => showError(e.message),
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (id: string) => supabase.from("columns").delete().eq("id", id),
    onSuccess: () => { invalidateKanbanData(); showSuccess("Coluna deletada!"); },
    onError: (e: Error) => showError(e.message),
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { id, columnId, dueDate, actionType, ...rest } = task;
      const dataToSave = { ...rest, column_id: columnId, due_date: dueDate, action_type: actionType };
      Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);
      if (id) {
        const { error } = await supabase.from("tasks").update(dataToSave).eq("id", id);
        if (error) throw error;
      } else {
        const position = tasks.filter(t => t.columnId === columnId).length;
        const { error } = await supabase.from("tasks").insert({ ...dataToSave, position });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateKanbanData(); showSuccess("Tarefa salva!"); },
    onError: (e: Error) => showError(e.message),
  });

  const requestEditMutation = useMutation({
    mutationFn: async ({ taskId, comment, targetColumnId }: { taskId: string, comment: string, targetColumnId: string }) => {
      const { data: currentTask, error: fetchError } = await supabase.from("tasks").select("comments").eq("id", taskId).single();
      if (fetchError) throw fetchError;

      const newComment = { id: Date.now().toString(), text: comment, author: "Usuário", createdAt: new Date().toISOString() };
      const updatedComments = [...(currentTask.comments || []), newComment];

      const { error } = await supabase.from("tasks").update({ comments: updatedComments, column_id: targetColumnId }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => { invalidateKanbanData(); showSuccess("Solicitação de edição enviada!"); },
    onError: (e: Error) => showError(e.message),
  });

  const updateTaskPositionMutation = useMutation({
    mutationFn: async (updatedTasks: Task[]) => {
      const updates = updatedTasks.map(task => supabase.from('tasks').update({ column_id: task.columnId, position: task.position }).eq('id', task.id));
      await Promise.all(updates);
    },
    onSuccess: invalidateKanbanData,
    onError: (e: Error) => showError(e.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => supabase.from("tasks").delete().eq("id", id),
    onSuccess: () => { invalidateKanbanData(); showSuccess("Tarefa deletada!"); },
    onError: (e: Error) => showError(e.message),
  });

  const handleApproveTask = (taskId: string) => {
    const approvedColumn = columns.find(c => c.title === "Aprovado");
    if (approvedColumn) {
      saveTaskMutation.mutate({ id: taskId, columnId: approvedColumn.id });
    } else {
      showError("A coluna 'Aprovado' não foi encontrada.");
    }
  };

  const handleEditRequestTask = (taskId: string) => {
    const editColumn = columns.find(c => c.title === "Editar");
    const task = tasks.find(t => t.id === taskId);
    if (editColumn && task) {
      setTaskForEditRequest({ ...task, columnId: editColumn.id });
      setIsEditRequestModalOpen(true);
    } else {
      showError("A coluna 'Editar' ou a tarefa não foi encontrada.");
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    if (activeTask && overTask) {
      const activeIndex = tasks.indexOf(activeTask);
      const overIndex = tasks.indexOf(overTask);
      updateTaskPositionMutation.mutate(arrayMove(tasks, activeIndex, overIndex).map((t, i) => ({ ...t, position: i })));
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || active.data.current?.type !== "Task") return;
    if (over.data.current?.type === "Column") {
      const activeTask = tasks.find(t => t.id === active.id);
      if (activeTask && activeTask.columnId !== over.id) {
        const newTasks = tasks.filter(t => t.id !== active.id);
        newTasks.splice(0, 0, { ...activeTask, columnId: over.id as string });
        updateTaskPositionMutation.mutate(newTasks.map((t, i) => ({ ...t, position: i })));
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando quadro...</div>;

  return (
    <div>
      <DndContext sensors={sensors} onDragStart={(e) => e.active.data.current?.type === "Task" && setActiveTask(e.active.data.current.task)} onDragEnd={onDragEnd} onDragOver={onDragOver}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <SortableContext items={columnsId}>
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasks.filter((task) => task.columnId === col.id)}
                onCardClick={(task) => { setSelectedTask(task); setIsModalOpen(true); }}
                onAddTask={(colId) => { setSelectedTask(null); setNewCardColumn(colId); setIsModalOpen(true); }}
                onDeleteColumn={(id) => deleteColumnMutation.mutate(id)}
                onUpdateColumn={(id, title) => updateColumnMutation.mutate({ id, title })}
                onApproveTask={handleApproveTask}
                onEditRequestTask={handleEditRequestTask}
              />
            ))}
          </SortableContext>
          <Button onClick={() => createColumnMutation.mutate()} variant="outline" className="h-full min-h-[100px]">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Coluna
          </Button>
        </div>
        {createPortal(<DragOverlay>{activeTask && <KanbanCard task={activeTask} onClick={() => {}} />}</DragOverlay>, document.body)}
      </DndContext>
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(task) => saveTaskMutation.mutate(task)} onDelete={(id) => deleteTaskMutation.mutate(id)} task={selectedTask} columnId={newCardColumn || undefined} />
      <EditRequestModal isOpen={isEditRequestModalOpen} onClose={() => setIsEditRequestModalOpen(false)} onConfirm={(taskId, comment, targetColumnId) => requestEditMutation.mutate({ taskId, comment, targetColumnId })} task={taskForEditRequest} />
    </div>
  );
}