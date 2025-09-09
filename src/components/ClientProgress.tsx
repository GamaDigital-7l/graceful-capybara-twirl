"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  workspace_id: string;
  workspace_name: string;
  column_title: string;
}

interface ClientProgressProps {
  tasks: Task[];
}

interface WorkspaceProgress {
  id: string;
  name: string;
  pending: number;
  completed: number;
  total: number;
  progress: number;
}

export function ClientProgress({ tasks }: ClientProgressProps) {
  const progressByWorkspace = useMemo(() => {
    const workspaces: Record<string, WorkspaceProgress> = {};

    tasks.forEach((task) => {
      if (!workspaces[task.workspace_id]) {
        workspaces[task.workspace_id] = {
          id: task.workspace_id,
          name: task.workspace_name,
          pending: 0,
          completed: 0,
          total: 0,
          progress: 0,
        };
      }

      if (task.column_title === "Em Produção" || task.column_title === "Editar") {
        workspaces[task.workspace_id].pending++;
      } else if (task.column_title === "Para aprovação") {
        workspaces[task.workspace_id].completed++;
      }
    });

    return Object.values(workspaces).map((ws) => {
      ws.total = ws.pending + ws.completed;
      ws.progress = ws.total > 0 ? (ws.completed / ws.total) * 100 : 0;
      return ws;
    }).sort((a, b) => b.total - a.total);

  }, [tasks]);

  if (progressByWorkspace.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Progresso por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Nenhuma tarefa ativa para exibir o progresso dos clientes.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso por Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {progressByWorkspace.map((ws) => (
          <div key={ws.id}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{ws.name}</h3>
              <Badge variant="secondary">{`${ws.completed}/${ws.total} concluídas`}</Badge>
            </div>
            <Progress value={ws.progress} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}