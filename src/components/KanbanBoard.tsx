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

const initialColumns: Column[] = [
  { id: "todo", title: "A Fazer" },
  { id: "in-progress", title: "Em Progresso" },
  { id: "approved", title: "Aprovados" },
  { id: "edit-request", title: "Para Editar" },
  { id: "done", title: "Feito" },
];

const initialTasks: Task[] = [
  { id: "1", columnId: "todo", title: "Desenvolver a interface do usuário" },
  {
    id: "3",
    columnId: "in-progress",
    title: "Criar a lógica de autenticação",
    actionType: "approve",
  },
  {
    id: "4",
    columnId: "in-progress",
    title: "Revisar o código do backend",
    actionType: "edit",
  },
  { id: "5", columnId: "done", title: "Deploy da versão alpha" },
];

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null);

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // Column CRUD
  const addColumn = () => {
    const newColumn: Column = {
      id: `col-${new Date().getTime()}`,
      title: `Nova Coluna`,
    };
    setColumns([...columns, newColumn]);
  };

  const deleteColumn = (columnId: string) => {
    setColumns(columns.filter((col) => col.id !== columnId));
    // Move tasks from deleted column to the first column
    setTasks(
      tasks.map((task) =>
        task.columnId === columnId ? { ...task, columnId: columns[0].id } : task
      )
    );
  };

  const updateColumn = (columnId: string, title: string) => {
    setColumns(
      columns.map((col) => (col.id === columnId ? { ...col, title } : col))
    );
  };

  // Task Modal Handlers
  const handleOpenModalForEdit = (task: Task) => {
    setSelectedTask(task);
    setNewCardColumn(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForCreate = (columnId: string) => {
    setSelectedTask(null);
    setNewCardColumn(columnId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setNewCardColumn(null);
  };

  // Task CRUD
  const handleSaveTask = (savedTask: Task) => {
    const taskExists = tasks.some((t) => t.id === savedTask.id);
    if (taskExists) {
      setTasks(tasks.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else {
      setTasks([...tasks, savedTask]);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  // Task Actions
  const handleApproveTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, columnId: "approved" } : task
      )
    );
  };

  const handleEditRequestTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, columnId: "edit-request" } : task
      )
    );
  };

  // Drag and Drop Handlers
  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isActiveATask = active.data.current?.type === "Task";
    if (!isActiveATask) return;

    setTasks((tasks) => {
      const activeIndex = tasks.findIndex((t) => t.id === active.id);
      const overIndex = tasks.findIndex((t) => t.id === over.id);
      return arrayMove(tasks, activeIndex, overIndex);
    });
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isActiveATask = active.data.current?.type === "Task";
    if (!isActiveATask) return;

    const isOverAColumn = over.data.current?.type === "Column";
    if (isOverAColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === active.id);
        if (tasks[activeIndex].columnId !== over.id) {
          tasks[activeIndex].columnId = over.id as string;
          return arrayMove(tasks, activeIndex, activeIndex);
        }
        return tasks;
      });
    }
  }

  return (
    <div className="p-4 md:p-8">
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <SortableContext items={columnsId}>
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasks.filter((task) => task.columnId === col.id)}
                onCardClick={handleOpenModalForEdit}
                onAddTask={handleOpenModalForCreate}
                onDeleteColumn={deleteColumn}
                onUpdateColumn={updateColumn}
                onApproveTask={handleApproveTask}
                onEditRequestTask={handleEditRequestTask}
              />
            ))}
          </SortableContext>
          <Button onClick={addColumn} variant="outline" className="h-full min-h-[100px]">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Coluna
          </Button>
        </div>

        {createPortal(
          <DragOverlay>
            {activeTask && (
              <KanbanCard
                task={activeTask}
                onClick={() => {}}
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={selectedTask}
        columnId={newCardColumn || undefined}
      />
    </div>
  );
}