import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskSummaryCard } from "./TaskSummaryCard";
import { TaskStats } from "./TaskStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ClientProgress } from "./ClientProgress";
import { PersonalTasksWidget } from "./PersonalTasksWidget"; // Importar o novo widget

interface UserTask {
  id: string;
  title: string;
  column_id: string;
  column_title: string;
  workspace_id: string;
  workspace_name: string;
  workspace_logo_url: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
}

const fetchUserTasks = async () => {
  const { data, error } = await supabase.rpc("get_user_tasks");
  if (error) throw new Error(error.message);
  return data;
};

export const MyTasks = React.memo(function MyTasks() {
  const { data: tasks, isLoading } = useQuery<UserTask[]>({
    queryKey: ["user_tasks"],
    queryFn: fetchUserTasks,
  });

  const { pendingTasks, completedTasks } = useMemo(() => {
    if (!tasks) return { pendingTasks: [], completedTasks: [] };
    const pending = tasks.filter(
      (task) => task.column_title === "Em Produção" || task.column_title === "Editar" || task.column_title === "Solicitações"
    );
    const completed = tasks.filter(
      (task) => task.column_title === "Para aprovação" || task.column_title === "Aprovado"
    );
    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    if (!pendingTasks) return {};
    return pendingTasks.reduce((acc: Record<string, { name: string; logo_url: string | null; tasks: UserTask[] }>, task) => {
      if (!acc[task.workspace_id]) {
        acc[task.workspace_id] = { name: task.workspace_name, logo_url: task.workspace_logo_url, tasks: [] };
      }
      acc[task.workspace_id].tasks.push(task);
      return acc;
    }, {});
  }, [pendingTasks]);

  if (isLoading) {
    return (
      <div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <div className="mb-8">
            <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Seção para os 3 cards de TaskStats, ClientProgress e PersonalTasksWidget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div>
          <TaskStats pendingCount={pendingTasks.length} completedCount={completedTasks.length} />
        </div>
        <ClientProgress />
        <PersonalTasksWidget />
      </div>

      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4">Caixa de Entrada de Tarefas</h2>
        {pendingTasks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(groupedTasks).map(([workspaceId, { name, logo_url, tasks }]) => (
              <Card key={workspaceId} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3 pb-4 mb-4 border-b">
                  {logo_url ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={logo_url} alt={name} loading="lazy" />
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Briefcase className="h-5 w-5 text-primary" />
                  )}
                  <CardTitle className="text-lg font-medium flex-grow pr-2">{name}</CardTitle>
                  <Badge variant="secondary" className="h-5">{tasks.length}</Badge>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
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
    </div>
  );
});