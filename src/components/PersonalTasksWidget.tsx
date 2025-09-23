"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ListTodo, CheckCircle, AlertCircle } from "lucide-react";
import { PersonalTaskCard } from "./PersonalTaskCard";
import { PersonalTaskModal, PersonalTask } from "./PersonalTaskModal";
import { isPast } from "date-fns";
import { formatSaoPauloTime } from "@/utils/date-utils"; // Importar utilitário de data

// Reusing fetchPersonalTasks from PersonalTasksPage
const fetchPersonalTasks = async (userId: string): Promise<PersonalTask[]> => {
  const { data, error } = await supabase
    .from("personal_tasks")
    .select("*, reminder_preferences, priority") // Select new columns
    .eq("user_id", userId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(task => ({
    ...task,
    due_date: new Date(task.due_date), // Convert string to Date object
  })) as PersonalTask[];
};

export function PersonalTasksWidget() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const { data: tasks, isLoading, error } = useQuery<PersonalTask[]>({
    queryKey: ["personalTasks", currentUserId],
    queryFn: () => fetchPersonalTasks(currentUserId!),
    enabled: !!currentUserId,
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: PersonalTask) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { id, due_date, reminder_preferences, priority, ...rest } = task; // Destructure reminder_preferences and priority
      const dataToSave = {
        ...rest,
        user_id: currentUserId,
        due_date: await formatSaoPauloTime(due_date, 'yyyy-MM-dd'), // Format Date to string for Supabase
        reminder_preferences: reminder_preferences || [], // Save reminder preferences
        priority: priority || 'Medium', // Save priority
      };

      if (id) {
        const { error } = await supabase.from("personal_tasks").update(dataToSave).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("personal_tasks").insert(dataToSave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId] });
      showSuccess("Tarefa pessoal salva com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("personal_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId] });
      showSuccess("Tarefa pessoal deletada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      const { error } = await supabase.from("personal_tasks").update({ is_completed: isCompleted }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId] });
      showSuccess("Status da tarefa atualizado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: PersonalTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleToggleComplete = (taskId: string, isCompleted: boolean) => {
    toggleCompleteMutation.mutate({ taskId, isCompleted });
  };

  const { upcomingTasks, overdueTasks } = useMemo(() => {
    if (!tasks) return { upcomingTasks: [], overdueTasks: [] };
    const pending = tasks.filter(task => !task.is_completed);
    const upcoming = pending.filter(task => !isPast(task.due_date));
    const overdue = pending.filter(task => isPast(task.due_date));
    return { upcomingTasks: upcoming, overdueTasks: overdue };
  }, [tasks]);

  const urgentTasks = useMemo(() => {
    const allPending = [...overdueTasks, ...upcomingTasks];
    return allPending.slice(0, 3); // Show up to 3 most urgent tasks
  }, [overdueTasks, upcomingTasks]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Minhas Tarefas Pessoais</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Erro ao carregar tarefas</CardTitle></CardHeader>
        <CardContent><p className="text-destructive text-sm">{error.message}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Minhas Tarefas Pessoais</CardTitle>
        <ListTodo className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><ListTodo className="h-4 w-4" /> Próximas:</span>
            <span>{upcomingTasks.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Atrasadas:</span>
            <span>{overdueTasks.length}</span>
          </div>
        </div>
        <div className="space-y-3 mb-4">
          {urgentTasks.length > 0 ? (
            urgentTasks.map(task => (
              <PersonalTaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma tarefa urgente. Bom trabalho!</p>
          )}
        </div>
        <div className="flex flex-col gap-2 mt-auto">
          <Button onClick={handleAddTask} size="sm" className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Tarefa
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/personal-tasks">Ver Todas</Link>
          </Button>
        </div>
      </CardContent>
      <PersonalTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={saveTaskMutation.mutate}
        existingTask={selectedTask}
      />
    </Card>
  );
}