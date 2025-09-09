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
import { PlusCircle, Settings, LogOut, UserCog, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceSettingsModal } from "@/components/WorkspaceSettingsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTasks } from "@/components/MyTasks";
import ClientDashboard from "./ClientDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import AgencyPlaybookPage from "./AgencyPlaybookPage"; // Import the new page

export interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
}

const fetchWorkspaces = async (): Promise<Workspace[]> => {
  const { data, error } = await supabase.from("workspaces").select("*");
  if (error) throw new Error(error.message);
  return data;
};

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  useEffect(() => {
    const ensureUserProfile = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile) {
          const { data: newProfile, error } = await supabase.from('profiles').insert({ id: user.id, role: 'admin' }).select('role').single();
          if (error) {
            showError("Não foi possível criar o perfil de usuário.");
          } else {
            profile = newProfile;
          }
        }
        setUserRole(profile?.role || null);
      }
      setProfileLoading(false);
    };
    ensureUserProfile();
  }, []);

  useEffect(() => {
    if (!isLoadingWorkspaces && userRole === 'user' && workspaces && workspaces.length === 1) {
      navigate(`/workspace/${workspaces[0].id}`);
    }
  }, [workspaces, isLoadingWorkspaces, userRole, navigate]);

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

  const renderAdminDashboard = () => (
    <Tabs defaultValue="tasks">
      <div className="flex justify-between items-center mb-6">
        <TabsList>
          <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="agency-playbook">
            <BookOpen className="h-4 w-4 mr-2" />
            Playbook da Agência
          </TabsTrigger>
        </TabsList>
        <Button onClick={() => createWorkspaceMutation.mutate("Novo Workspace")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Cliente (Workspace)
        </Button>
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
            {workspaces?.map((ws) => (
              <Card key={ws.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium flex-grow truncate pr-2">{ws.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenSettings(ws)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <Link to={`/workspace/${ws.id}`}>
                  <CardContent className="flex flex-col items-center justify-center pt-4">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={ws.logo_url || undefined} alt={ws.name} />
                      <AvatarFallback>{ws.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" className="w-full">Ver Quadro</Button>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="agency-playbook">
        <AgencyPlaybookPage />
      </TabsContent>
    </Tabs>
  );

  const renderContent = () => {
    if (isProfileLoading || isLoadingWorkspaces) {
      return <Skeleton className="h-64 w-full" />;
    }
    if (userRole === 'admin') {
      return renderAdminDashboard();
    }
    if (userRole === 'user' && workspaces && workspaces.length > 1) {
      return <ClientDashboard workspaces={workspaces} />;
    }
    // Para clientes com 0 workspaces ou 1 (antes do redirect), mostra um loader ou mensagem
    return <div className="text-center p-8">Carregando seus projetos...</div>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <Button asChild variant="outline">
              <Link to="/admin">
                <UserCog className="h-4 w-4 mr-2" />
                Admin
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
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