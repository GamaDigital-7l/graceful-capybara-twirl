"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskSummaryCard } from "./TaskSummaryCard";
import { TaskStats } from "./TaskStats";
import { useMemo } from "react";

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28 md:col-span-2" />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="space-y-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                </div>
            </div>
            <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="space-y-4">
                    <Skeleton className="h-20" />
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TaskStats pendingCount={pendingTasks.length} completedCount={completedTasks.length} />
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Tarefas a Fazer</h2>
          <div className="space-y-4">
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => <TaskSummaryCard key={task.id} task={task} />)
            ) : (
              <p className="text-muted-foreground">Nenhuma tarefa pendente. Bom trabalho!</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Tarefas Finalizadas</h2>
          <div className="space-y-4">
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => <TaskSummaryCard key={task.id} task={task} />)
            ) : (
              <p className="text-muted-foreground">Nenhuma tarefa finalizada recentemente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}