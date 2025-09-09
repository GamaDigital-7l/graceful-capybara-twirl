import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Workspace {
  id: string;
  name: string;
}

const fetchWorkspaces = async () => {
  const { data, error } = await supabase.from("workspaces").select("id, name");
  if (error) throw new Error(error.message);
  return data;
};

const createWorkspace = async (name: string) => {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const Index = () => {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    localStorage.getItem("activeWorkspaceId")
  );
  const queryClient = useQueryClient();

  const {
    data: workspaces,
    isLoading,
    isError,
  } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(newWorkspace.id);
      showSuccess("Workspace criado com sucesso!");
    },
    onError: (error) => {
      showError(`Erro ao criar workspace: ${error.message}`);
    },
  });

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("activeWorkspaceId", activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quadro Kanban</h1>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[160px]" />
          </div>
        ) : (
          <WorkspaceSwitcher
            workspaces={workspaces || []}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceChange={setActiveWorkspaceId}
            onCreateWorkspace={(name) => createWorkspaceMutation.mutate(name)}
          />
        )}
      </header>
      <main>
        {activeWorkspaceId ? (
          <KanbanBoard key={activeWorkspaceId} workspaceId={activeWorkspaceId} />
        ) : (
          <div className="p-8 text-center">
            {isLoading ? (
              <p>Carregando workspaces...</p>
            ) : isError ? (
              <p className="text-red-500">Erro ao carregar workspaces.</p>
            ) : (
              <p>Crie seu primeiro workspace para começar.</p>
            )}
          </div>
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Index;