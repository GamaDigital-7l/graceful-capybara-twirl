"use client";

import { useState, useEffect } from "react";
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
import { isPast } from "date-fns";
import * as chrono from 'chrono-node'; // Import chrono-node
import { Input } from "@/components/ui/input"; // Import Input for NLP field
import { Label } from "@/components/ui/label"; // Import Label
import { correctGrammar } from "@/utils/grammar"; // Import new grammar utility
import { formatSaoPauloTime, parseSaoPauloDateString } from "@/utils/date-utils"; // Importar utilitário de data e parseSaoPauloDateString

const fetchPersonalTasks = async (userId: string): Promise<PersonalTask[]> => {
  const { data, error } = await supabase
    .from("personal_tasks")
    .select("*, reminder_preferences, priority") // Select new columns
    .eq("user_id", userId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(task => ({
    ...task,
    due_date: parseSaoPauloDateString(task.due_date), // Convert string to Date object using parseSaoPauloDateString
  })) as PersonalTask[];
};

const PersonalTasksPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nlpInput, setNlpInput] = useState(""); // State for NLP input

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const { data: tasks, isLoading, error } = useQuery<PersonalTask[]>({
    queryKey: ["personalTasks", currentUserId],
    queryFn: () => fetchPersonalTasks(currentUserId!),
    enabled: !!currentUserId,
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (task: PersonalTask) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { id, due_date, reminder_preferences, priority, ...rest } = task; // Destructure reminder_preferences and priority
      const dataToSave = {
        ...rest,
        user_id: currentUserId,
        due_date: formatSaoPauloTime(due_date, 'yyyy-MM-dd'), // Format Date to string for Supabase
        reminder_preferences: reminder_preferences || [], // Save reminder preferences
        priority: priority || 'Medium', // Save priority
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
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId] });
      showSuccess("Tarefa pessoal salva com sucesso!");
      setNlpInput(""); // Clear NLP input after saving
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("personal_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId] });
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
      queryClient.invalidateQueries({ queryKey: ["personalTasks", currentUserId] });
      showSuccess("Status da tarefa atualizado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: PersonalTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleToggleComplete = (taskId: string, isCompleted: boolean) => {
    toggleCompleteMutation.mutate({ taskId, isCompleted });
  };

  const handleNlpInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && nlpInput.trim()) {
      // 1. Correção gramatical automática
      const correctedText = await correctGrammar(nlpInput);
      
      // 2. Processamento de linguagem natural
      const parsedResult = chrono.parse(correctedText, new Date(), { forwardDate: true });

      let newTask: Partial<PersonalTask> = {
        title: correctedText.trim(), // Usar o texto corrigido como título inicial
        due_date: parseSaoPauloDateString(formatSaoPauloTime(new Date(), 'yyyy-MM-dd')), // Default to today in SP timezone
        priority: 'Medium',
        reminder_preferences: [],
      };

      if (parsedResult.length > 0) {
        const firstResult = parsedResult[0];
        const startDate = firstResult.start.date();
        
        // Ensure startDate is treated as São Paulo local time
        newTask.due_date = parseSaoPauloDateString(formatSaoPauloTime(startDate, 'yyyy-MM-dd'));
        
        // Extract time if available
        if (firstResult.start.isCertain('hour') || firstResult.start.isCertain('minute')) {
          newTask.due_time = formatSaoPauloTime(startDate, 'HH:mm');
          // Set default reminder for 30 min before if time is certain
          newTask.reminder_preferences = ['30m_before'];
        } else {
          newTask.due_time = undefined;
        }

        // Attempt to extract title by removing the date/time part
        // Prioritize removing the *exact* matched text from chrono-node
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
  };

  const upcomingTasks = tasks?.filter(task => !task.is_completed && !isPast(task.due_date)) || [];
  const overdueTasks = tasks?.filter(task => !task.is_completed && isPast(task.due_date)) || [];
  const completedTasks = tasks?.filter(task => task.is_completed) || [];

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Todoist</h1>
        <Button onClick={handleAddTask}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Tarefa
        </Button>
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