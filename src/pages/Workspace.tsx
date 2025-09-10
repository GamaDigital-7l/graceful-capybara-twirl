import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { GroupTabs, Group } from "@/components/GroupTabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, BookOpen, MoreVertical, CalendarCheck, Send } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ApprovalLinkModal } from "@/components/ApprovalLinkModal";

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
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");

  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["groups", workspaceId],
    queryFn: () => fetchGroups(workspaceId!),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      setProfileLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profileError) throw profileError;
          setUserRole(profile?.role || null);
        } else {
          setUserRole(null);
        }
      } catch (error: any) {
        console.error("Error fetching user role:", error.message);
        showError(`Erro ao carregar perfil: ${error.message}`);
        setUserRole(null);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: newGroup, error: groupError } = await supabase.from("groups").insert({
        name,
        workspace_id: workspaceId,
        position: groups?.length || 0,
      }).select().single();
      if (groupError) throw groupError;

      const defaultColumns = [
        { title: "Em Produção", position: 0, group_id: newGroup.id },
        { title: "Para aprovação", position: 1, group_id: newGroup.id },
        { title: "Aprovado", position: 2, group_id: newGroup.id },
        { title: "Editar", position: 3, group_id: newGroup.id },
        { title: "Solicitações", position: 4, group_id: newGroup.id },
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

  const endMonthMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase.rpc('end_kanban_month_for_group', { p_group_id: groupId });
      if (error) throw error;
      return data;
    },
    onSuccess: (processedGroupId) => {
      queryClient.invalidateQueries({ queryKey: ["groups", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["kanbanData", processedGroupId] });
      showSuccess("Mês finalizado! Todas as tarefas foram movidas para 'Aprovado'.");
    },
    onError: (e: Error) => showError(`Erro ao finalizar o mês: ${e.message}`),
  });

  const generateApprovalLinkMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { data: settings, error: settingsError } = await supabase.from("app_settings").select("site_url, whatsapp_message_template").eq("id", 1).single();
      if (settingsError || !settings?.site_url) throw new Error("URL do site não configurada. Por favor, adicione em Configurações.");

      setWhatsappTemplate(settings.whatsapp_message_template || 'Olá! Seus posts estão prontos para aprovação. Por favor, acesse o link a seguir para revisar e aprovar:');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: tokenData, error: tokenError } = await supabase.from("public_approval_tokens").insert({ group_id: groupId, workspace_id: workspaceId, user_id: user.id }).select("token").single();
      if (tokenError) {
        console.error("Supabase insert error:", tokenError);
        throw new Error(`Falha ao criar o link: ${tokenError.message}`);
      }
      
      const approvalUrl = `${settings.site_url}/approve/${tokenData.token}`;
      return approvalUrl;
    },
    onSuccess: (link) => {
      dismissToast();
      setGeneratedLink(link);
    },
    onError: (e: Error) => {
      dismissToast();
      showError(e.message);
      setIsApprovalModalOpen(false);
    },
    onMutate: () => {
      showLoading("Gerando link...");
    },
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

  const handleOpenApprovalModal = (groupId: string) => {
    setGeneratedLink("");
    setIsApprovalModalOpen(true);
    generateApprovalLinkMutation.mutate(groupId);
  };

  const renderHeaderActions = () => {
    const sendApprovalButton = userRole === 'admin' && activeGroupId && (
      <Button
        variant="default"
        onClick={() => handleOpenApprovalModal(activeGroupId)}
        disabled={generateApprovalLinkMutation.isPending}
      >
        <Send className="h-4 w-4 mr-2" />
        Enviar para Aprovação
      </Button>
    );

    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userRole === 'admin' && activeGroupId && (
              <DropdownMenuItem onClick={() => handleOpenApprovalModal(activeGroupId)} disabled={generateApprovalLinkMutation.isPending}>
                <Send className="h-4 w-4 mr-2" /> Enviar p/ Aprovação
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild><Link to={`/workspace/${workspaceId}/playbook`} className="flex items-center"><BookOpen className="h-4 w-4 mr-2" /> Ver Playbook</Link></DropdownMenuItem>
            {userRole === 'admin' && activeGroupId && (
              <AlertDialog>
                <AlertDialogTrigger asChild><DropdownMenuItem className="flex items-center text-primary"><CalendarCheck className="h-4 w-4 mr-2" /> Finalizar Mês</DropdownMenuItem></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Finalizar Mês do Grupo?</AlertDialogTitle><AlertDialogDescription>Esta ação moverá todas as tarefas do grupo atual para a coluna 'Aprovado'. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => endMonthMutation.mutate(activeGroupId)}>Sim, Finalizar Mês</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <DropdownMenuItem><ThemeToggle /></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive flex items-center"><LogOut className="h-4 w-4 mr-2" /> Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {sendApprovalButton}
        <Button asChild variant="outline"><Link to={`/workspace/${workspaceId}/playbook`}><BookOpen className="h-4 w-4 mr-2" /> Ver Playbook</Link></Button>
        {userRole === 'admin' && activeGroupId && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="text-primary border-primary hover:bg-primary/10"><CalendarCheck className="h-4 w-4 mr-2" /> Finalizar Mês</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Finalizar Mês do Grupo?</AlertDialogTitle><AlertDialogDescription>Esta ação moverá todas as tarefas do grupo atual para a coluna 'Aprovado'. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => endMonthMutation.mutate(activeGroupId)}>Sim, Finalizar Mês</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <ThemeToggle />
        <Button onClick={handleLogout} variant="outline"><LogOut className="h-4 w-4 mr-2" /> Sair</Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline"><Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Dashboard</Link></Button>
        </div>
        {renderHeaderActions()}
      </header>
      <main>
        {workspaceId ? (
          isLoadingGroups || isProfileLoading ? (
            <div className="p-8 text-center"><Skeleton className="h-10 w-1/2 mx-auto" /></div>
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
          <div className="p-8 text-center">Workspace não encontrado.</div>
        )}
      </main>
      <Footer />
      <ApprovalLinkModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        link={generatedLink}
        isGenerating={generateApprovalLinkMutation.isPending}
        whatsappMessageTemplate={whatsappTemplate}
      />
    </div>
  );
};

export default Workspace;