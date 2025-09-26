"use client";

import React from "react"; // Adicionado React
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase } from "lucide-react";
import { showError } from "@/utils/toast";

interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
}

const fetchClientWorkspaces = async (userId: string): Promise<Workspace[]> => {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspaces(id, name, logo_url)")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // Flatten the data structure
  return data.flatMap(member => member.workspaces).filter(Boolean) as Workspace[];
};

const WorkspaceCard = React.memo(({ workspace }: { workspace: Workspace }) => (
  <Card key={workspace.id} className="hover:shadow-lg transition-shadow flex flex-col">
    <Link to={`/workspace/${workspace.id}`} className="flex flex-col flex-grow">
      <CardHeader className="flex flex-col items-center justify-center pt-6 pb-4 flex-grow">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src={workspace.logo_url || undefined} alt={workspace.name} loading="lazy" /> {/* Adicionado loading="lazy" */}
          <AvatarFallback className="text-4xl">{workspace.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-lg font-medium text-center">{workspace.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Button variant="outline" className="w-full">Ver Projeto</Button>
      </CardContent>
    </Link>
  </Card>
));

const ClientDashboard = () => {
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = React.useState(true);

  React.useEffect(() => {
    const getUserId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        showError("Erro ao carregar informações do usuário.");
      }
      setCurrentUserId(user?.id || null);
      setIsUserLoading(false);
    };
    getUserId();
  }, []);

  const { data: workspaces, isLoading: isLoadingWorkspaces, error: workspacesError } = useQuery<Workspace[]>({
    queryKey: ["clientWorkspaces", currentUserId],
    queryFn: () => fetchClientWorkspaces(currentUserId!),
    enabled: !!currentUserId,
  });

  if (workspacesError) {
    showError(`Erro ao carregar seus projetos: ${workspacesError.message}`);
  }

  if (isUserLoading || isLoadingWorkspaces) {
    return (
      <div className="p-8 text-center">
        <Skeleton className="h-10 w-1/2 mx-auto mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Nenhum Projeto Encontrado</CardTitle></CardHeader>
          <CardContent><p>Você ainda não foi convidado para nenhum projeto. Por favor, entre em contato com a agência.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meus Projetos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {workspaces.map((ws) => (
          <WorkspaceCard key={ws.id} workspace={ws} />
        ))}
      </div>
    </div>
  );
};

export default ClientDashboard;