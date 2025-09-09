"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskSummaryCard } from "./TaskSummaryCard";
import { TaskStats } from "./TaskStats";
import { useMemo } from "react";
import { ClientProgress } from "./ClientProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

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

  const groupedTasks = useMemo(() => {
    if (!pendingTasks) return {};
    return pendingTasks.reduce((acc, task) => {
      if (!acc[task.workspace_id]) {
        acc[task.workspace_id] = { name: task.workspace_name, logo_url: task.workspace_logo_url, tasks: [] };
      }
      acc[task.workspace_id].tasks.push(task);
      return acc;
    }, {} as Record<string, { name: string; logo_url: string | null; tasks: typeof pendingTasks }>);
  }, [pendingTasks]);

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
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
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
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Caixa de Entrada de Tarefas</h2>
          {pendingTasks.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([workspaceId, { name, logo_url, tasks }]) => (
                <Card key={workspaceId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      {logo_url ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={logo_url} alt={name} />
                          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Briefcase className="h-5 w-5 text-primary" />
                      )}
                      {name}
                      <Badge variant="secondary">{tasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tasks.map((task) => (
                      <TaskSummaryCard key={task.id} task={task} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mt-4">Nenhuma tarefa pendente. Bom trabalho!</p>
          )}
        </div>
        <div className="lg:col-span-1 w-full">
            <ClientProgress tasks={tasks || []} />
        </div>
      </div>
    </div>
  );
}