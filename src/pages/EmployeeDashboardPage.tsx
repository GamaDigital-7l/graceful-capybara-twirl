"use client";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Briefcase, CheckCircle, ListTodo } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { showError } from "@/utils/toast";

interface EmployeeProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface RawSupabaseTask {
  id: string;
  title: string;
  due_date: string | null;
  column_id: string;
  columns: { title: string } | null; // Expecting a single object or null
  assigned_to: string | null;
}

interface EmployeeTask {
  id: string;
  title: string;
  due_date: string | null;
  column_title: string;
  assigned_to: string | null;
}

const fetchStaffUsers = async (): Promise<EmployeeProfile[]> => {
  const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url, role").in('role', ['admin', 'equipe']);
  if (error) throw new Error(error.message);
  return data || [];
};

const fetchAllStaffTasks = async (): Promise<EmployeeTask[]> => {
  const { data, error } = await supabase.from("tasks").select("id, title, due_date, column_id, columns(title), assigned_to");
  if (error) throw new Error(error.message);
  
  // Flatten the data to include column_title directly
  const rawTasks: RawSupabaseTask[] = data as RawSupabaseTask[];
  return rawTasks.map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    // Corrigido: Acessar diretamente a propriedade 'title' do objeto 'columns'
    column_title: task.columns?.title || 'Unknown', 
    assigned_to: task.assigned_to,
  })) || [];
};

const EmployeeCard = React.memo(({ employee, progress }: { employee: EmployeeProfile; progress: { total: number; completed: number; pending: number } }) => {
  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <Card key={employee.id} className="hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-12 w-12">
          <AvatarImage src={employee.avatar_url || undefined} loading="lazy" />
          <AvatarFallback>{employee.full_name?.charAt(0) || <User className="h-6 w-6" />}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{employee.full_name}</CardTitle>
          <CardDescription className="capitalize">{employee.role}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between pt-4">
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><ListTodo className="h-4 w-4" /> Pendentes:</span>
            <span>{progress.pending}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Concluídas:</span>
            <span>{progress.completed}</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Progresso Geral</p>
          <Progress value={percentage} className="w-full" />
          <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(0)}%</p>
        </div>
        <Link to={`/employees/${employee.id}`} className="mt-4">
          <Button variant="outline" className="w-full">Ver Detalhes</Button>
        </Link>
      </CardContent>
    </Card>
  );
});

const EmployeeDashboardPage = () => {
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<EmployeeProfile[]>({
    queryKey: ["staffUsers"],
    queryFn: fetchStaffUsers,
  });

  const { data: allTasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<EmployeeTask[]>({
    queryKey: ["allStaffTasks"],
    queryFn: fetchAllStaffTasks,
  });

  const employeeProgress = useMemo(() => {
    if (!employees || !allTasks) return {};

    const progressMap: Record<string, { total: number; completed: number; pending: number }> = {};

    employees.forEach(emp => {
      progressMap[emp.id] = { total: 0, completed: 0, pending: 0 };
    });

    allTasks.forEach(task => {
      if (task.assigned_to && progressMap[task.assigned_to]) {
        progressMap[task.assigned_to].total++;
        // Contabiliza como concluída se estiver em "Aprovado" OU "Para aprovação"
        if (task.column_title === "Aprovado" || task.column_title === "Para aprovação") {
          progressMap[task.assigned_to].completed++;
        } 
        // Contabiliza como pendente se estiver em "Em Produção" OU "Editar"
        else if (task.column_title === "Em Produção" || task.column_title === "Editar") {
          progressMap[task.assigned_to].pending++;
        }
      }
    });

    return progressMap;
  }, [employees, allTasks]);

  if (employeesError) showError(`Erro ao carregar funcionários: ${employeesError.message}`);
  if (tasksError) showError(`Erro ao carregar tarefas: ${tasksError.message}`);

  if (isLoadingEmployees || isLoadingTasks) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Visão Geral da Equipe</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {employees?.map((employee) => (
          <EmployeeCard key={employee.id} employee={employee} progress={employeeProgress[employee.id]} />
        ))}
      </div>
    </div>
  );
}

export default EmployeeDashboardPage;