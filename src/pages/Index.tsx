import { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { GroupTabs, Group } from "@/components/GroupTabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Workspace {
  id: string;
  name: string;
}

const fetchWorkspaces = async () => {
  const { data, error } = await supabase.from("workspaces").select("id, name");
  if (error) throw new Error(error.message);
  return data;
};

const fetchGroups = async (workspaceId: string) => {
  if (!workspaceId) return [];
  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("position");
  if (error) throw new Error(error.message);
  return data;
};

const Index = () => {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    localStorage.getItem("activeWorkspaceId")
  );
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["groups", activeWorkspaceId],
    queryFn: () => fetchGroups(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("workspaces").insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(newWorkspace.id);
      showSuccess("Workspace criado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      // 1. Create the group
      const { data: newGroup, error: groupError } = await supabase.from("groups").insert({
        name,
        workspace_id: activeWorkspaceId,
        position: groups?.length || 0,
      }).select().single();
      if (groupError) throw groupError;

      // 2. Create default columns for the new group
      const defaultColumns = [
        { title: "Para aprovação", position: 0, group_id: newGroup.id },
        { title: "Em Produção", position: 1, group_id: newGroup.id },
        { title: "Aprovado", position: 2, group_id: newGroup.id },
        { title: "Editar", position: 3, group_id: newGroup.id },
      ];
      const { error: columnsError } = await supabase.from("columns").insert(defaultColumns);
      if (columnsError) {
        // If columns fail, maybe delete the group for consistency? For now, just throw.
        throw columnsError;
      }
      
      return newGroup;
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ["groups", activeWorkspaceId] });
      setActiveGroupId(newGroup.id);
      showSuccess("Grupo criado com colunas padrão!");
    },
    onError: (e: Error) => showError(`Erro ao criar grupo: ${e.message}`),
  });

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("activeWorkspaceId", activeWorkspaceId);
      setActiveGroupId(null); // Reset group when workspace changes
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (groups && groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quadro Kanban</h1>
        <div className="flex items-center gap-4">
          {isLoadingWorkspaces ? (
            <Skeleton className="h-10 w-[380px]" />
          ) : (
            <WorkspaceSwitcher
              workspaces={workspaces || []}
              activeWorkspaceId={activeWorkspaceId}
              onWorkspaceChange={setActiveWorkspaceId}
              onCreateWorkspace={(name) => createWorkspaceMutation.mutate(name)}
            />
          )}
          <Button onClick={handleLogout} variant="outline">Sair</Button>
        </div>
      </header>
      <main>
        {activeWorkspaceId ? (
          isLoadingGroups ? (
            <div className="p-8 text-center">Carregando grupos...</div>
          ) : (
            <GroupTabs
              groups={groups || []}
              activeGroupId={activeGroupId}
              onGroupChange={setActiveGroupId}
              onCreateGroup={(name) => createGroupMutation.mutate(name)}
            />
          )
        ) : (
          <div className="p-8 text-center">
            {isLoadingWorkspaces ? "Carregando..." : "Crie ou selecione um workspace para começar."}
          </div>
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Index;