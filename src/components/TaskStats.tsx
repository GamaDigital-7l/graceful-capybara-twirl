import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ListTodo, Target } from "lucide-react";
// Removido o import de React, pois React.Fragment não será mais usado diretamente.

interface TaskStatsProps {
  pendingCount: number;
  completedCount: number;
}

export function TaskStats({ pendingCount, completedCount }: TaskStatsProps) {
  const totalTasks = pendingCount + completedCount;
  const progressPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return (
    // Envolvendo os três Cards em uma única div para garantir um único elemento raiz.
    // Adicionei um layout de grid interno para os cards dentro desta div.
    <div className="grid gap-6"> 
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas a Fazer</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">
            Tarefas em "Produção" ou "Editar"
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas Finalizadas</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedCount}</div>
          <p className="text-xs text-muted-foreground">
            Tarefas movidas para "Para aprovação"
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTasks}</div>
          <p className="text-xs text-muted-foreground mb-2">
            Total de tarefas no funil
          </p>
          <Progress value={progressPercentage} className="w-full" />
        </CardContent>
      </Card>
    </div>
  );
}