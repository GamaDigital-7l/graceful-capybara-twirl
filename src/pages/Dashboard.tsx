import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Settings, MoreVertical, Briefcase, Users, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceSettingsModal } from "@/components/WorkspaceSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTasks } from "@/components/MyTasks";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import WorkspacePage from "./Workspace";
import EmployeeDashboardPage from "./EmployeeDashboardPage";
import AgencyPlaybookPage from "./AgencyPlaybookPage";

export interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
}

const INTERNAL_WORKSPACE_NAME = "Tarefas";

const fetchWorkspaces = async (userRole: string | null, userId: string | undefined): Promise<Workspace[]> => {
  if (!userId) {
    return [];
  }

  let query;
  if (userRole === 'user') {
    // Clientes não precisam de todos os workspaces aqui, eles serão redirecionados
    // para o ClientDashboard que fará a busca específica.
    return []; 
  } else {
    query = supabase.from("workspaces").select("id, name, logo_url");
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSettingsModalOpen, setIsSettingsModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [internalWorkspaceId, setInternalWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const ensureUserProfile = async () => {
      setProfileLoading(true);
      const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
      if (userAuthError) {
        console.error("Dashboard: Error getting auth user:", userAuthError.message);
      }

      if (user) {
        setCurrentUserId(user.id);
        let { data: profile, error: profileFetchError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profileFetchError && profileFetchError.code !== 'PGRST116') {
          console.error("Dashboard: Error fetching profile:", profileFetchError.message);
        }

        if (!profile) {
          const { data: newProfile, error: profileInsertError } = await supabase.from('profiles').insert({ id: user.id, role: 'user' }).select('role').single();
          if (profileInsertError) {
            showError("Não foi possível criar o perfil de usuário.");
            console.error("Dashboard: Error creating profile:", profileInsertError.message);
          } else {
            profile = newProfile;
          }
        }
        setUserRole(profile?.role || null);
      } else {
        setCurrentUserId(undefined);
        setUserRole(null);
      }
      setProfileLoading(false);
    };
    ensureUserProfile();
  }, []);

  const { data: workspaces, isLoading: isLoadingWorkspaces, error: workspacesError } = useQuery<Workspace[]>({
    queryKey: ["workspaces", userRole, currentUserId],
    queryFn: () => fetchWorkspaces(userRole, currentUserId),
    enabled: !!userRole && !!currentUserId && (userRole !== 'user'), // Desabilitar para 'user' aqui
  });

  if (workspacesError) {
    showError(`Erro ao carregar workspaces: ${workspacesError.message}`);
  }

  useEffect(() => {
    const ensureInternalWorkspace = async () => {
      if ((userRole === 'admin' || userRole === 'equipe') && !isLoadingWorkspaces && workspaces) {
        let internalWs = workspaces.find(ws => ws.name === INTERNAL_WORKSPACE_NAME);

        if (!internalWs) {
          const { data: newWs, error } = await supabase.from("workspaces").insert({ name: INTERNAL_WORKSPACE_NAME }).select().single();
          if (error) {
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
            
            if (staffUsers && currentUser) {
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
      setIsSettingsModal(true);
      showSuccess("Workspace criado! Adicione uma logo.");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleOpenSettings = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setIsSettingsModal(true);
  };

  const renderStaffDashboard = () => {
    const isStaff = userRole === 'admin' || userRole === 'equipe';
    return (
      <Tabs defaultValue="tasks">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex h-auto p-1">
              <TabsTrigger value="tasks" className="flex-shrink-0">Minhas Tarefas</TabsTrigger>
              <TabsTrigger value="clients" className="flex-shrink-0">Clientes</TabsTrigger>
              {internalWorkspaceId && (
                <TabsTrigger value="internal-tasks" className="flex-shrink-0">
                  <Briefcase className="h-4 w-4 mr-2" /> {INTERNAL_WORKSPACE_NAME}
                </TabsTrigger>
              )}
              {(userRole === 'admin') && (
                <TabsTrigger value="employees" className="flex-shrink-0">
                  <Users className="h-4 w-4 mr-2" /> Equipe
                </TabsTrigger>
              )}
              <TabsTrigger value="agency-playbook" className="flex-shrink-0">
                <BookOpen className="h-4 w-4 mr-2" />
                Playbook da Agência
              </TabsTrigger>
            </TabsList>
          </div>
          {isStaff && (
            <Button onClick={() => createWorkspaceMutation.mutate("Novo Workspace")} className="w-full sm:w-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Cliente (Workspace)
            </Button>
          )}
        </div>
        <TabsContent value="tasks">
          <MyTasks />
        </TabsContent>
        <TabsContent value="clients">
          {isLoadingWorkspaces ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {workspaces?.filter(ws => ws.name !== INTERNAL_WORKSPACE_NAME).map((ws) => (
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
                        <AvatarImage src={ws.logo_url || undefined} alt={ws.name} loading="lazy" /> {/* Adicionado loading="lazy" */}
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
    if (isProfileLoading) {
      return <Skeleton className="h-64 w-full" />;
    }
    if (userRole === 'admin' || userRole === 'equipe') {
      return renderStaffDashboard();
    }
    if (userRole === 'user') {
      // Redirecionar para o ClientDashboard
      navigate("/client-dashboard");
      return null; // Retorna null para não renderizar nada enquanto redireciona
    }
    return <div className="text-center p-8">Carregando seus projetos...</div>;
  };

  return (
    <>
      {renderContent()}
      <WorkspaceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModal(false)}
        workspace={selectedWorkspace}
      />
    </>
  );
};

export default Dashboard;