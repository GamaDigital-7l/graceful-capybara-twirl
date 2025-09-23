import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase,
  LayoutDashboard,
  Plus,
  Settings,
  Users,
  Calendar as CalendarIcon,
  DollarSign,
  ClipboardList,
  BarChart2,
  FileText,
  Megaphone,
  Bot,
  BookOpen,
  ListTodo,
  Clock, // Adicionado Clock icon para tarefas pessoais
  Trash2, // Adicionado Trash2 icon para tarefas pessoais
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSaoPauloDate } from "@/utils/date-utils";
import { TaskCard } from "@/components/TaskCard";
import { Task } from "@/components/KanbanCard"; // Importar a interface Task
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showError, showSuccess } from "@/utils/toast";

// Constante para o nome do workspace interno
const INTERNAL_WORKSPACE_NAME = "Frellas";

interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
}

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

interface PersonalTask {
  id: string;
  title: string;
  description: string | null;
  due_date: Date; // Alterado para Date
  due_time: string | null;
  is_completed: boolean;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low'; // Corrigido: adicionado 'Highest' e tornado opcional
}

const fetchWorkspaces = async (): Promise<Workspace[]> => {
  const { data, error } = await supabase.from("workspaces").select("*");
  if (error) throw error;
  return data;
};

const fetchUserTasks = async (): Promise<UserTask[]> => {
  const { data, error } = await supabase.rpc("get_user_tasks");
  if (error) throw error;
  return data;
};

const fetchPersonalTasks = async (userId: string): Promise<PersonalTask[]> => {
  const { data, error } = await supabase
    .from("personal_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });
  if (error) throw error;
  return data.map(task => ({
    ...task,
    due_date: new Date(task.due_date), // Converte string para Date
  })) as PersonalTask[];
};

const Dashboard = () => {
  const { workspaceId: currentWorkspaceId } = useParams<{
    workspaceId?: string;
  }>();
  const [internalWorkspaceId, setInternalWorkspaceId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("my-tasks");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  const {
    data: workspaces,
    isLoading: isLoadingWorkspaces,
    error: workspacesError,
  } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const {
    data: userTasks,
    isLoading: isLoadingUserTasks,
    error: userTasksError,
  } = useQuery<UserTask[]>({
    queryKey: ["userTasks"],
    queryFn: fetchUserTasks,
  });

  const {
    data: personalTasks,
    isLoading: isLoadingPersonalTasks,
    error: personalTasksError,
    refetch: refetchPersonalTasks,
  } = useQuery<PersonalTask[]>({
    queryKey: ["personalTasks", userId],
    queryFn: () => fetchPersonalTasks(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (workspaces) {
      const internalWs = workspaces.find(
        (ws) => ws.name === INTERNAL_WORKSPACE_NAME
      );
      if (internalWs) {
        setInternalWorkspaceId(internalWs.id);
      }
    }
  }, [workspaces]);

  const handleTogglePersonalTask = async (taskId: string, isCompleted: boolean) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("personal_tasks")
        .update({ is_completed: isCompleted })
        .eq("id", taskId)
        .eq("user_id", userId);

      if (error) throw error;
      showSuccess("Status da tarefa pessoal atualizado!");
      refetchPersonalTasks();
    } catch (error: any) {
      showError("Erro ao atualizar tarefa pessoal: " + error.message);
    }
  };

  const handleDeletePersonalTask = async (taskId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("personal_tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", userId);

      if (error) throw error;
      showSuccess("Tarefa pessoal excluída!");
      refetchPersonalTasks();
    } catch (error: any) {
      showError("Erro ao excluir tarefa pessoal: " + error.message);
    }
  };

  if (isLoadingWorkspaces || isLoadingUserTasks || isLoadingPersonalTasks) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (workspacesError || userTasksError || personalTasksError) {
    return (
      <div className="p-4 text-red-500">
        <p>Erro ao carregar dados:</p>
        {workspacesError && <p>{workspacesError.message}</p>}
        {userTasksError && <p>{userTasksError.message}</p>}
        {personalTasksError && <p>{personalTasksError.message}</p>}
      </div>
    );
  }

  const filteredUserTasks = userTasks?.filter(
    (task) =>
      task.workspace_id === currentWorkspaceId ||
      (activeTab === "internal-tasks" &&
        task.workspace_id === internalWorkspaceId) ||
      (activeTab === "my-tasks" && task.assigned_to === userId)
  );

  const menuItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      link: `/dashboard`,
      key: "dashboard",
    },
    {
      label: "Minhas Tarefas",
      icon: ListTodo,
      link: `/dashboard`,
      key: "my-tasks",
    },
    {
      label: "Financeiro",
      icon: DollarSign,
      link: `/financial-control`,
      key: "financial-control",
    },
    {
      label: "Briefings",
      icon: FileText,
      link: `/briefing-forms`,
      key: "briefing-forms",
    },
    {
      label: "Onboarding",
      icon: BookOpen,
      link: `/onboarding-templates`,
      key: "onboarding-templates",
    },
    {
      label: "Second Brain",
      icon: Bot,
      link: `/second-brain`,
      key: "second-brain",
    },
    {
      label: "Instagram",
      icon: Megaphone,
      link: `/instagram-reports`,
      key: "instagram-reports",
    },
    {
      label: "Configurações",
      icon: Settings,
      link: `/settings`,
      key: "settings",
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Criar Novo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/create-workspace">
                <Briefcase className="mr-2 h-4 w-4" /> Workspace
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/create-personal-task">
                <ListTodo className="mr-2 h-4 w-4" /> Tarefa Pessoal
              </Link>
            </DropdownMenuItem>
            {/* Adicionar mais opções de criação aqui */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces?.map((workspace) => (
          <Link to={`/workspace/${workspace.id}`} key={workspace.id}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {workspace.name}
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    userTasks?.filter((task) => task.workspace_id === workspace.id)
                      .length
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Tarefas ativas neste workspace
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {workspaces?.length === 0 && (
          <Card className="col-span-full text-center py-8">
            <CardTitle className="text-lg text-muted-foreground">
              Nenhum workspace encontrado.
            </CardTitle>
            <CardDescription>
              Crie seu primeiro workspace para começar!
            </CardDescription>
            <Button asChild className="mt-4">
              <Link to="/create-workspace">Criar Workspace</Link>
            </Button>
          </Card>
        )}
      </div>

      <Tabs
        defaultValue="my-tasks"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3 md:w-fit">
          <TabsTrigger value="my-tasks" className="flex-shrink-0">
            <ListTodo className="h-4 w-4 mr-2" /> Minhas Tarefas
          </TabsTrigger>
          {internalWorkspaceId && (
            <TabsTrigger value="internal-tasks" className="flex-shrink-0">
              <Briefcase className="h-4 w-4 mr-2" /> {INTERNAL_WORKSPACE_NAME}
            </TabsTrigger>
          )}
          <TabsTrigger value="personal-tasks" className="flex-shrink-0">
            <ListTodo className="h-4 w-4 mr-2" /> Tarefas Pessoais
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-tasks" className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Tarefas Atribuídas a Mim</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUserTasks && filteredUserTasks.length > 0 ? (
              filteredUserTasks
                .filter((task) => task.assigned_to === userId)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task as unknown as Task} // Cast para Task
                    workspaceName={task.workspace_name}
                    workspaceLogoUrl={task.workspace_logo_url}
                    columnTitle={task.column_title}
                  />
                ))
            ) : (
              <p className="col-span-full text-muted-foreground">
                Nenhuma tarefa atribuída a você.
              </p>
            )}
          </div>
        </TabsContent>
        {internalWorkspaceId && (
          <TabsContent value="internal-tasks" className="mt-4">
            <h2 className="text-2xl font-bold mb-4">
              Tarefas do Workspace {INTERNAL_WORKSPACE_NAME}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUserTasks && filteredUserTasks.length > 0 ? (
                filteredUserTasks
                  .filter((task) => task.workspace_id === internalWorkspaceId)
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task as unknown as Task} // Cast para Task
                      workspaceName={task.workspace_name}
                      workspaceLogoUrl={task.workspace_logo_url}
                      columnTitle={task.column_title}
                    />
                  ))
              ) : (
                <p className="col-span-full text-muted-foreground">
                  Nenhuma tarefa encontrada para o workspace{" "}
                  {INTERNAL_WORKSPACE_NAME}.
                </p>
              )}
            </div>
          </TabsContent>
        )}
        <TabsContent value="personal-tasks" className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Minhas Tarefas Pessoais</h2>
          <div className="space-y-3">
            {personalTasks && personalTasks.length > 0 ? (
              personalTasks.map((task) => (
                <Card key={task.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={(e) => handleTogglePersonalTask(task.id, e.target.checked)}
                      className="form-checkbox h-5 w-5 text-primary rounded"
                    />
                    <div>
                      <p className={`font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> {formatSaoPauloDate(task.due_date)}
                        {task.due_time && (
                          <>
                            <Clock className="h-3 w-3 ml-2" /> {task.due_time}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá
                          permanentemente sua tarefa personal.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePersonalTask(task.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">
                Nenhuma tarefa pessoal adicionada.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;