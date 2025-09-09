"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  id: string;
  title: string;
  workspace_id: string;
  workspace_name: string;
  column_title: string;
}

interface ClientProgressProps {
  groupId: string;
  workspaceId: string;
}

interface WorkspaceProgress {
  id: string;
  name: string;
  pending: number;
  completed: number;
  total: number;
  progress: number;
}

const fetchTasksByGroup = async (groupId: string): Promise<Task[]> => {
  const { data, error } = await supabase.rpc("get_tasks_by_group", { p_group_id: groupId });
  if (error) throw new Error(error.message);
  return data || [];
};

export function ClientProgress({ groupId, workspaceId }: ClientProgressProps) {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["tasksByGroup", groupId],
    queryFn: () => fetchTasksByGroup(groupId),
    enabled: !!groupId,
  });

  const progressByWorkspace = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const workspaceData: WorkspaceProgress = {
      id: workspaceId,
      name: tasks[0]?.workspace_name || "Carregando...", // Use name from first task or placeholder
      pending: 0,
      completed: 0,
      total: 0,
      progress: 0,
    };

    tasks.forEach((task) => {
      if (task.column_title === "Em Produção" || task.column_title === "Editar") {
        workspaceData.pending++;
      } else if (task.column_title === "Para aprovação" || task.column_title === "Aprovado") {
        workspaceData.completed++;
      }
    });

    workspaceData.total = workspaceData.pending + workspaceData.completed;
    workspaceData.progress = workspaceData.total > 0 ? (workspaceData.completed / workspaceData.total) * 100 : 0;

    return [workspaceData]; // Always return an array with one workspace's progress
  }, [tasks, workspaceId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentWorkspaceProgress = progressByWorkspace[0];

  if (!currentWorkspaceProgress || currentWorkspaceProgress.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma tarefa ativa neste grupo para exibir o progresso.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">{currentWorkspaceProgress.name}</h3>
            <Badge variant="secondary">{`${currentWorkspaceProgress.completed}/${currentWorkspaceProgress.total} concluídas`}</Badge>
          </div>
          <Progress value={currentWorkspaceProgress.progress} />
        </div>
      </CardContent>
    </Card>
  );
}