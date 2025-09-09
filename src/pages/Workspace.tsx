import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { GroupTabs, Group } from "@/components/GroupTabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, BookOpen } from "lucide-react";

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

const Workspace = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["groups", workspaceId],
    queryFn: () => fetchGroups(workspaceId!),
    enabled: !!workspaceId,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: newGroup, error: groupError } = await supabase.from("groups").insert({
        name,
        workspace_id: workspaceId,
        position: groups?.length || 0,
      }).select().single();
      if (groupError) throw groupError;

      const defaultColumns = [
        { title: "Solicitações", position: 0, group_id: newGroup.id },
        { title: "Em Produção", position: 1, group_id: newGroup.id },
        { title: "Para aprovação", position: 2, group_id: newGroup.id },
        { title: "Aprovado", position: 3, group_id: newGroup.id },
        { title: "Editar", position: 4, group_id: newGroup.id },
      ];
      const { error: columnsError } = await supabase.from("columns").insert(defaultColumns);
      if (columnsError) throw columnsError;
      
      return newGroup;
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] });
      setActiveGroupId(newGroup.id);
      showSuccess("Grupo criado com colunas padrão!");
    },
    onError: (e: Error) => showError(`Erro ao criar grupo: ${e.message}`),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveGroupId(null);
      queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] });
      showSuccess("Grupo deletado com sucesso!");
    },
    onError: (e: Error) => showError(`Erro ao deletar grupo: ${e.message}`),
  });

  const reorderGroupsMutation = useMutation({
    mutationFn: async (reorderedGroups: Group[]) => {
      const updates = reorderedGroups.map((group, index) => 
        supabase.from("groups").update({ position: index }).eq("id", group.id)
      );
      const results = await Promise.all(updates);
      const errorResult = results.find(r => r.error);
      if (errorResult) throw errorResult.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] });
    },
    onError: (e: Error) => showError(`Erro ao reordenar grupos: ${e.message}`),
  });

  useEffect(() => {
    if (groups && groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    } else if (groups && groups.length === 0) {
      setActiveGroupId(null);
    }
  }, [groups, activeGroupId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/workspace/${workspaceId}/playbook`}>
              <BookOpen className="h-4 w-4 mr-2" />
              Ver Playbook
            </Link>
          </Button>
        </div>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </header>
      <main>
        {workspaceId ? (
          isLoadingGroups ? (
            <div className="p-8 text-center">
              <Skeleton className="h-10 w-1/2 mx-auto" />
            </div>
          ) : (
            <GroupTabs
              groups={groups || []}
              activeGroupId={activeGroupId}
              onGroupChange={setActiveGroupId}
              onCreateGroup={(name) => createGroupMutation.mutate(name)}
              onDeleteGroup={(groupId) => deleteGroupMutation.mutate(groupId)}
              onReorderGroups={(reordered) => reorderGroupsMutation.mutate(reordered)}
            />
          )
        ) : (
          <div className="p-8 text-center">
            Workspace não encontrado.
          </div>
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Workspace;