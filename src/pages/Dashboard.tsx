"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Settings, LogOut, UserCog, BookOpen, Palette, MoreVertical, Banknote, Brain, Briefcase, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceSettingsModal } from "@/components/WorkspaceSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTasks } from "@/components/MyTasks";
import { ThemeToggle } from "@/components/ThemeToggle";
import AgencyPlaybookPage from "./AgencyPlaybookPage";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import WorkspacePage from "./Workspace"; // Importar o componente WorkspacePage
import { EmployeeDashboardPage } from "./EmployeeDashboardPage"; // Importar a nova página de funcionários
import { AppLogo } from "@/components/AppLogo"; // Importar AppLogo

export interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
}

const INTERNAL_WORKSPACE_NAME = "Tarefas"; // Renomeado de "Tarefas Internas" para "Tarefas"

// Modificado para aceitar userRole e userId
const fetchWorkspaces = async (userRole: string | null, userId: string | undefined): Promise<Workspace[]> => {
  if (!userId) {
    return []; // Não há usuário, não há workspaces para buscar
  }

  let query;
  if (userRole === 'user') {
    // Para o papel 'user', explicitamente faz um join com workspace_members
    // para obter apenas os workspaces aos quais o usuário pertence.
    query = supabase
      .from("workspace_members")
      .select("workspaces(id, name, logo_url)")
      .eq("user_id", userId);
  } else {
    // Para 'admin' ou 'equipe', busca todos os workspaces.
    // As políticas de RLS ainda se aplicarão, mas eles geralmente têm acesso mais amplo.
    query = supabase.from("workspaces").select("id, name, logo_url");
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchWorkspaces Error:", error.message);
    throw new Error(error.message);
  }

  if (userRole === 'user' && data) {
    // A estrutura de dados retornada por um join é aninhada, então precisamos achatá-la.
    return data.map((item: any) => item.workspaces);
  }
  return data || [];
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined); // Novo estado para o ID do usuário
  const [isProfileLoading, setProfileLoading] = useState(true);
  const isMobile = useIsMobile();
  const [internalWorkspaceId, setInternalWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const ensureUserProfile = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id); // Define o ID do usuário aqui
        let { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile) {
          const { data: newProfile, error } = await supabase.from('profiles').insert({ id: user.id, role: 'user' }).select('role').single();
          if (error) {
            showError("Não foi possível criar o perfil de usuário.");
          } else {
            profile = newProfile;
          }
        }
        setUserRole(profile?.role || null);
      } else {
        setCurrentUserId(undefined); // Limpa o ID se não houver usuário
        setUserRole(null);
      }
      setProfileLoading(false);
    };
    ensureUserProfile();
  }, []);

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces", userRole, currentUserId], // Adicionar userRole e currentUserId à queryKey
    queryFn: () => fetchWorkspaces(userRole, currentUserId), // Passar argumentos
    enabled: !!userRole && !!currentUserId, // Só executa quando userRole e currentUserId estão disponíveis
  });

  useEffect(() => {
    const ensureInternalWorkspace = async () => {
      if ((userRole === 'admin' || userRole === 'equipe') && !isLoadingWorkspaces && workspaces) {
        let internalWs = workspaces.find(ws => ws.name === INTERNAL_WORKSPACE_NAME);

        if (!internalWs) {
          const { data: newWs, error } = await supabase.from("workspaces").insert({ name: INTERNAL_WORKSPACE_NAME }).select().single();
          if (error) {
            console.error("Error creating internal workspace:", error);
            showError(`Erro ao criar workspace interno: ${error.message}`);
            return;
          }
          internalWs = newWs;
          queryClient.invalidateQueries({ queryKey: ["workspaces"] });

          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { error: memberError } = await supabase.from("workspace_members").insert({
              workspace_id: internalWs.id,
              user_id: currentUser.id,
              role: 'owner'
            });
            if (memberError) console.error("Error adding owner to internal workspace:", memberError);

            const { data: staffUsers, error: staffError } = await supabase.from('profiles').select('id').in('role', ['admin', 'equipe']);
            if (staffError) console.error("Error fetching staff users:", staffError);
            
            if (staffUsers && currentUser) { // Adicionado verificação para currentUser aqui
              const otherStaffMembers = staffUsers.filter(sUser => sUser.id !== currentUser.id);
              const memberInserts = otherStaffMembers.map(sUser => ({
                workspace_id: internalWs.id,
                user_id: sUser.id,
                role: 'editor'
              }));
              if (memberInserts.length > 0) {
                const { error: bulkMemberError } = await supabase.from("workspace_members").insert(memberInserts);
                if (bulkMemberError) console.error("Error adding other staff to internal workspace:", bulkMemberError);
              }
            }
          }
        }
        setInternalWorkspaceId(internalWs.id);
      }
    };
    ensureInternalWorkspace();
  }, [userRole, isLoadingWorkspaces, workspaces, queryClient]);

  const createWorkspaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("workspaces").insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setSelectedWorkspace(newWorkspace);
      setIsSettingsModalOpen(true);
      showSuccess("Workspace criado! Adicione uma logo.");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleOpenSettings = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setIsSettingsModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderHeaderActions = () => {
    const isAdmin = userRole === 'admin';
    const isStaff = userRole === 'admin' || userRole === 'equipe';

    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAdmin && (
              <>
                <DropdownMenuItem asChild><Link to="/financial" className="flex items-center"><Banknote className="h-4 w-4 mr-2" />Financeiro</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/settings" className="flex items-center"><Palette className="h-4 w-4 mr-2" />Configurações</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/admin" className="flex items-center"><UserCog className="h-4 w-4 mr-2" />Admin</Link></DropdownMenuItem>
              </>
            )}
            {isStaff && (
              <DropdownMenuItem asChild><Link to="/second-brain" className="flex items-center"><Brain className="h-4 w-4 mr-2" />Segundo Cérebro</Link></DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <ThemeToggle />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive flex items-center">
              <LogOut className="h-4 w-4 mr-2" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Button asChild variant="outline">
              <Link to="/financial">
                <Banknote className="h-4 w-4 mr-2" />
                Financeiro
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/settings">
                <Palette className="h-4 w-4 mr-2" />
                Configurações
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin">
                <UserCog className="h-4 w-4 mr-2" />
                Admin
              </Link>
            </Button>
          </>
        )}
        {isStaff && (
          <Button asChild variant="outline">
            <Link to="/second-brain">
              <Brain className="h-4 w-4 mr-2" />
              Segundo Cérebro
            </Link>
          </Button>
        )}
        <ThemeToggle />
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    );
  };

  const renderStaffDashboard = () => {
    const isStaff = userRole === 'admin' || userRole === 'equipe';
    return (
      <Tabs defaultValue="tasks">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <TabsList>
            <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            {internalWorkspaceId && (
              <TabsTrigger value="internal-tasks">
                <Briefcase className="h-4 w-4 mr-2" /> {INTERNAL_WORKSPACE_NAME}
              </TabsTrigger>
            )}
            {(userRole === 'admin') && ( // Menu 'Equipe' visível apenas para admin
              <TabsTrigger value="employees">
                <Users className="h-4 w-4 mr-2" /> Equipe
              </TabsTrigger>
            )}
            <TabsTrigger value="agency-playbook">
              <BookOpen className="h-4 w-4 mr-2" />
              Playbook da Agência
            </TabsTrigger>
          </TabsList>
          {isStaff && (
            <Button onClick={() => createWorkspaceMutation.mutate("Novo Workspace")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Cliente (Workspace)
            </Button>
          )}
        </div>
        <TabsContent value="tasks">
          <MyTasks /> {/* MyTasks agora inclui TaskStats e ClientProgress */}
        </TabsContent>
        <TabsContent value="clients">
          {isLoadingWorkspaces ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {workspaces?.filter(ws => ws.name !== INTERNAL_WORKSPACE_NAME).map((ws) => ( // Filtrar workspace interno
                <Card key={ws.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium flex-grow truncate pr-2">{ws.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenSettings(ws)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configurações
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <Link to={`/workspace/${ws.id}`} className="flex flex-col flex-grow">
                    <CardContent className="flex flex-col items-center justify-center pt-4 flex-grow">
                      <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={ws.logo_url || undefined} alt={ws.name} />
                        <AvatarFallback>{ws.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <Button variant="outline" className="w-full mt-auto">Ver Quadro</Button>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="internal-tasks">
          {internalWorkspaceId ? (
            <WorkspacePage initialWorkspaceId={internalWorkspaceId} />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </TabsContent>
        <TabsContent value="employees">
          <EmployeeDashboardPage />
        </TabsContent>
        <TabsContent value="agency-playbook">
          <AgencyPlaybookPage />
        </TabsContent>
      </Tabs>
    );
  };

  const renderContent = () => {
    if (isProfileLoading || isLoadingWorkspaces) {
      return <Skeleton className="h-64 w-full" />;
    }
    if (userRole === 'admin' || userRole === 'equipe') {
      return renderStaffDashboard();
    }
    if (userRole === 'user') {
      if (workspaces && workspaces.length > 0) {
        // Redirecionar para o primeiro workspace do cliente
        navigate(`/workspace/${workspaces[0].id}`);
        return null; // Retorna null enquanto redireciona
      } else {
        return (
          <div className="text-center p-8">
            <Card className="w-full max-w-md mx-auto text-center">
              <CardHeader><CardTitle>Nenhum Projeto Encontrado</CardTitle></CardHeader>
              <CardContent><p>Você ainda não foi convidado para nenhum projeto. Por favor, entre em contato com a agência.</p></CardContent>
            </Card>
          </div>
        );
      }
    }
    return <div className="text-center p-8">Carregando seus projetos...</div>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <AppLogo className="h-8 w-auto" /> {/* Usando AppLogo aqui */}
          <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Dashboard</h1>
        </div>
        {renderHeaderActions()}
      </header>
      <main className="p-4 md:p-8">
        {renderContent()}
      </main>
      <Footer />
      <WorkspaceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workspace={selectedWorkspace}
      />
    </div>
  );
};

export default Dashboard;