"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskSummaryCard } from "./TaskSummaryCard";
import { TaskStats } from "./TaskStats";
import { useMemo } from "react";
import { ClientProgress } from "./ClientProgress";

const fetchUserTasks = async () => {
  const { data, error } = await supabase.rpc("get_user_tasks");
  if (error) throw new Error(error.message);
  return data;
};

export function MyTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["user_tasks"],
    queryFn: fetchUserTasks,
  });

  const { pendingTasks, completedTasks } = useMemo(() => {
    if (!tasks) return { pendingTasks: [], completedTasks: [] };
    const pending = tasks.filter(
      (task) => task.column_title === "Em Produção" || task.column_title === "Editar"
    );
    const completed = tasks.filter(
      (task) => task.column_title === "Para aprovação"
    );
    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks]);

  if (isLoading) {
    return (
      <div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
            </div>
            <div>
                <Skeleton className="h-64" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TaskStats pendingCount={pendingTasks.length} completedCount={completedTasks.length} />
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Caixa de Entrada de Tarefas</h2>
          <div className="space-y-4">
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => <TaskSummaryCard key={task.id} task={task} />)
            ) : (
              <p className="text-muted-foreground">Nenhuma tarefa pendente. Bom trabalho!</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-1">
            <ClientProgress tasks={tasks || []} />
        </div>
      </div>
    </div>
  );
}