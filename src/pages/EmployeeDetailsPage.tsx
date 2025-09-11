"use client";

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, ListTodo, CheckCircle, AlertCircle, CalendarDays, Briefcase } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { showError } from "@/utils/toast";
import { useMemo } from "react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EmployeeProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  column_id: string;
  column_title: string;
  workspace_id: string;
  workspace_name: string;
  workspace_logo_url: string | null;
}

const fetchEmployeeProfile = async (employeeId: string): Promise<EmployeeProfile> => {
  const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url, role").eq("id", employeeId).single();
  if (error) throw new Error(error.message);
  return data;
};

const fetchAssignedTasks = async (employeeId: string): Promise<AssignedTask[]> => {
  const { data, error } = await supabase.rpc("get_tasks_assigned_to_user", { p_assigned_to_user_id: employeeId });
  if (error) throw new Error(error.message);
  return data || [];
};

export function EmployeeDetailsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();

  const { data: employee, isLoading: isLoadingEmployee, error: employeeError } = useQuery<EmployeeProfile>({
    queryKey: ["employeeProfile", employeeId],
    queryFn: () => fetchEmployeeProfile(employeeId!),
    enabled: !!employeeId,
  });

  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<AssignedTask[]>({
    queryKey: ["assignedTasks", employeeId],
    queryFn: () => fetchAssignedTasks(employeeId!),
    enabled: !!employeeId,
  });

  const { totalTasks, completedTasks, pendingTasks, overdueTasks } = useMemo(() => {
    if (!tasks) return { totalTasks: 0, completedTasks: 0, pendingTasks: [], overdueTasks: [] };

    const completed = tasks.filter(task => task.column_title === "Aprovado").length;
    const pending = tasks.filter(task => task.column_title !== "Aprovado");
    const overdue = pending.filter(task => task.due_date && isPast(new Date(task.due_date), new Date()));

    return {
      totalTasks: tasks.length,
      completedTasks: completed,
      pendingTasks: pending,
      overdueTasks: overdue,
    };
  }, [tasks]);

  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (employeeError) showError(`Erro ao carregar perfil do funcionário: ${employeeError.message}`);
  if (tasksError) showError(`Erro ao carregar tarefas do funcionário: ${tasksError.message}`);

  if (isLoadingEmployee || isLoadingTasks) {
    return (
      <div className="p-4 md:p-8">
        <Skeleton className="h-24 w-full mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 col-span-1" />
          <Skeleton className="h-96 col-span-2" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return <div className="p-8 text-center">Funcionário não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8 flex items-center gap-4">
        <Button asChild variant="outline">
          <Link to="/employees">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Equipe
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">{employee.full_name?.charAt(0) || <User className="h-8 w-8" />}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{employee.full_name}</h1>
            <p className="text-muted-foreground capitalize">{employee.role}</p>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Tarefas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground"><ListTodo className="h-5 w-5" /> Total de Tarefas:</span>
                <span className="font-semibold text-lg">{totalTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-green-600"><CheckCircle className="h-5 w-5" /> Concluídas:</span>
                <span className="font-semibold text-lg">{completedTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-yellow-600"><AlertCircle className="h-5 w-5" /> Atrasadas:</span>
                <span className="font-semibold text-lg">{overdueTasks.length}</span>
              </div>
              <div className="pt-4 space-y-2">
                <p className="font-medium">Progresso Geral</p>
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-sm text-muted-foreground text-right">{progressPercentage.toFixed(0)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas Atribuídas</CardTitle>
              <CardDescription>Todas as tarefas atribuídas a {employee.full_name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks && tasks.length > 0 ? (
                tasks.map(task => (
                  <Link to={`/workspace/${task.workspace_id}`} key={task.id}>
                    <Card className={cn(
                      "hover:shadow-md transition-shadow",
                      task.due_date && isPast(new Date(task.due_date), new Date()) && task.column_title !== "Aprovado" && "border-destructive/50 ring-1 ring-destructive/50"
                    )}>
                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{task.workspace_name}</span>
                            <Badge variant="secondary">{task.column_title}</Badge>
                          </div>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span className={cn(
                              task.due_date && isPast(new Date(task.due_date), new Date()) && task.column_title !== "Aprovado" && "text-destructive font-semibold"
                            )}>
                              {format(new Date(task.due_date), "dd MMM, yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhuma tarefa atribuída a este funcionário.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}