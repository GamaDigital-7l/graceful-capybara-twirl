import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: string;
  title: string;
  workspace_id: string;
  workspace_name: string;
  workspace_logo_url: string | null;
  column_title: string;
}

interface WorkspaceProgress {
  id: string;
  name: string;
  logo_url: string | null;
  pending: number;
  completed: number;
  total: number;
  progress: number;
}

const fetchAllWorkspaceTasksForProgress = async (): Promise<Task[]> => {
  const { data, error } = await supabase.rpc("get_all_workspace_tasks_for_progress");
  if (error) throw new Error(error.message);
  return data || [];
};

export function ClientProgress() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["all_workspace_tasks_for_progress"],
    queryFn: fetchAllWorkspaceTasksForProgress,
  });

  const progressByWorkspace = useMemo(() => {
    if (!tasks) return {};

    const grouped: Record<string, WorkspaceProgress> = {};

    tasks.forEach((task) => {
      if (!grouped[task.workspace_id]) {
        grouped[task.workspace_id] = {
          id: task.workspace_id,
          name: task.workspace_name,
          logo_url: task.workspace_logo_url,
          pending: 0,
          completed: 0,
          total: 0,
          progress: 0,
        };
      }

      if (task.column_title === "Em Produção" || task.column_title === "Editar" || task.column_title === "Solicitações") {
        grouped[task.workspace_id].pending++;
      } else if (task.column_title === "Para aprovação" || task.column_title === "Aprovado") {
        grouped[task.workspace_id].completed++;
      }
    });

    Object.values(grouped).forEach((ws) => {
      ws.total = ws.pending + ws.completed;
      ws.progress = ws.total > 0 ? (ws.completed / ws.total) * 100 : 0;
    });

    return grouped;
  }, [tasks]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const sortedWorkspaces = Object.values(progressByWorkspace).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso por Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedWorkspaces.length > 0 ? (
          sortedWorkspaces.map((ws) => (
            <div key={ws.id}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {ws.logo_url ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={ws.logo_url} alt={ws.name} loading="lazy" /> {/* Adicionado loading="lazy" */}
                      <AvatarFallback>{ws.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Briefcase className="h-5 w-5 text-primary" />
                  )}
                  <h3 className="font-semibold">{ws.name}</h3>
                </div>
                <Badge variant="secondary">{`${ws.completed}/${ws.total} concluídas`}</Badge>
              </div>
              <Progress value={ws.progress} />
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">Nenhum progresso de cliente para exibir.</p>
        )}
      </CardContent>
    </Card>
  );
}