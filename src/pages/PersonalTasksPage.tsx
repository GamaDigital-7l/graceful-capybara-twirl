"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ListTodo, CheckCircle, AlertCircle } from "lucide-react";
import { PersonalTaskCard } from "@/components/PersonalTaskCard";
import { PersonalTaskModal, PersonalTask } from "@/components/PersonalTaskModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isPast, startOfMonth, subMonths, addMonths } from "date-fns";
import * as chrono from 'chrono-node';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { correctGrammar } from "@/utils/grammar";
import { formatSaoPauloTime, formatSaoPauloDate } from "@/utils/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ptBR } from "date-fns/locale";

const fetchPersonalTasks = async (userId: string, month: Date): Promise<PersonalTask[]> => {
  const startOfMonthISO = formatSaoPauloTime(startOfMonth(month), 'yyyy-MM-dd');
  const endOfMonthISO = formatSaoPauloTime(addMonths(startOfMonth(month), 1), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from("personal_tasks")
    .select("*, reminder_preferences, priority")
    .eq("user_id", userId)
    .gte("due_date", startOfMonthISO)
    .lt("due_date", endOfMonthISO)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(task => ({
    ...task,
    due_date: new Date(task.due_date),
  })) as PersonalTask[];
};

const PersonalTasksPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nlpInput, setNlpInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const { data: tasks, isLoading, error } = useQuery<PersonalTask[]>({
    queryKey: ["personalTasks", currentUserId, selectedMonth.toISOString()],
    queryFn: () => fetchPersonalTasks(currentUserId!, selectedMonth),
    enabled: !!currentUserId,
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: PersonalTask) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { id, due_date, reminder_preferences, priority, ...rest } = task;
      const dataToSave = {
        ...rest,
        user_id: currentUserId,
        due_date: formatSaoPauloTime(due_date, 'yyyy-MM-dd'),
        reminder_preferences: reminder_preferences || [],
        priority: priority || 'Medium',
      };

      if (id) {
        const { error } = await supabase.from("personal_tasks").update(dataToSave).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("personal_tasks").insert(dataToSave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId, selectedMonth.toISOString()] });
      showSuccess("Tarefa pessoal salva com sucesso!");
      setNlpInput("");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("personal_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId, selectedMonth.toISOString()] });
      showSuccess("Tarefa pessoal deletada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      const { error } = await supabase.from("personal_tasks").update({ is_completed: isCompleted }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId, selectedMonth.toISOString()] });
      showSuccess("Status da tarefa atualizado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleAddTask = useCallback(() => {
    setSelectedTask(null);
    setIsModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: PersonalTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  }, [deleteTaskMutation]);

  const handleToggleComplete = useCallback((taskId: string, isCompleted: boolean) => {
    toggleCompleteMutation.mutate({ taskId, isCompleted });
  }, [toggleCompleteMutation]);

  const handleNlpInput = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && nlpInput.trim()) {
      // 1. Correção gramatical automática
      const correctedText = await correctGrammar(nlpInput);
      
      // 2. Processamento de linguagem natural
      const parsedResult = chrono.parse(correctedText, new Date(), { forwardDate: true });

      let newTask: Partial<PersonalTask> = {
        title: correctedText.trim(),
        due_date: new Date(),
        priority: 'Medium',
        reminder_preferences: [],
      };

      if (parsedResult.length > 0) {
        const firstResult = parsedResult[0];
        const startDate = firstResult.start.date();
        
        newTask.due_date = startDate;
        
        if (firstResult.start.isCertain('hour') || firstResult.start.isCertain('minute')) {
          newTask.due_time = formatSaoPauloTime(startDate, 'HH:mm');
          newTask.reminder_preferences = ['30m_before'];
        } else {
          newTask.due_time = undefined;
        }

        const titleCandidate = correctedText.replace(firstResult.text, '').trim();
        if (titleCandidate) {
          newTask.title = titleCandidate;
        }
      }

      // 3. Inferir prioridade com base em palavras-chave
      const lowerCaseTitle = newTask.title.toLowerCase();
      if (lowerCaseTitle.includes("urgente") || lowerCaseTitle.includes("agora") || lowerCaseTitle.includes("imediatamente")) {
        newTask.priority = 'Highest';
      } else if (lowerCaseTitle.includes("importante") || lowerCaseTitle.includes("alta prioridade")) {
        newTask.priority = 'High';
      } else if (lowerCaseTitle.includes("baixa prioridade") || lowerCaseTitle.includes("quando puder")) {
        newTask.priority = 'Low';
      }

      setSelectedTask(newTask as PersonalTask);
      setIsModalOpen(true);
    }
  }, [nlpInput, saveTaskMutation]);

  const upcomingTasks = tasks?.filter(task => !task.is_completed && !isPast(task.due_date)) || [];
  const overdueTasks = tasks?.filter(task => !task.is_completed && isPast(task.due_date)) || [];
  const completedTasks = tasks?.filter(task => task.is_completed) || [];

  const monthOptions = useMemo(() => {
    const options = [];
    let current = startOfMonth(new Date());
    for (let i = 0; i < 12; i++) { // Last 12 months including current
      options.push({
        value: current.toISOString(),
        label: formatSaoPauloTime(current, "MMMM yyyy"),
      });
      current = subMonths(current, 1);
    }
    return options.reverse();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Erro ao carregar tarefas: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Todoist</h1>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedMonth.toISOString()}
            onValueChange={(value) => setSelectedMonth(new Date(value))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Selecione o Mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddTask} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nlp-task-input">Adicionar Tarefa Rápida (Linguagem Natural)</Label>
        <Input
          id="nlp-task-input"
          value={nlpInput}
          onChange={(e) => setNlpInput(e.target.value)}
          onKeyDown={handleNlpInput}
          placeholder="Ex: Reunião com a equipe amanhã às 10h urgente"
        />
        <p className="text-sm text-muted-foreground">Pressione Enter para criar a tarefa. Tente "Pagar contas na sexta", "Comprar presente para mãe dia 25", "Enviar relatório hoje 17h importante".</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            <ListTodo className="h-4 w-4 mr-2" /> Próximas ({upcomingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            <AlertCircle className="h-4 w-4 mr-2" /> Atrasadas ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4 mr-2" /> Concluídas ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map(task => (
              <PersonalTaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))
          ) : (
            <p className="text-muted-foreground">Nenhuma tarefa próxima. Bom trabalho!</p>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-4 space-y-4">
          {overdueTasks.length > 0 ? (
            overdueTasks.map(task => (
              <PersonalTaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))
          ) : (
            <p className="text-muted-foreground">Nenhuma tarefa atrasada. Mantenha o ritmo!</p>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-4">
          {completedTasks.length > 0 ? (
            completedTasks.map(task => (
              <PersonalTaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))
          ) : (
            <p className="text-muted-foreground">Nenhuma tarefa concluída ainda.</p>
          )}
        </TabsContent>
      </Tabs>

      <PersonalTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={saveTaskMutation.mutate}
        existingTask={selectedTask}
      />
    </div>
  );
};

export default PersonalTasksPage;