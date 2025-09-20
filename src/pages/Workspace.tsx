import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { GroupTabs, Group } from "@/components/GroupTabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarCheck, Send, BookOpen, BarChart, Share2 } from "lucide-react"; // Adicionado Share2
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PublicLinkModal } from "@/components/PublicLinkModal"; // Importar o componente renomeado

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

const fetchWorkspaceName = async (workspaceId: string): Promise<string> => {
    const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();
    if (error) throw new Error(error.message);
    return data.name;
};

interface WorkspacePageProps {
  initialWorkspaceId?: string;
}

const WorkspacePage = ({ initialWorkspaceId }: WorkspacePageProps) => {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = initialWorkspaceId || params.workspaceId;

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);
  
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [generatedApprovalLink, setGeneratedApprovalLink] = useState("");
  const [whatsappApprovalTemplate, setWhatsappApprovalTemplate] = useState("");

  const [isDashboardLinkModalOpen, setIsDashboardLinkModalOpen] = useState(false); // Novo estado
  const [generatedDashboardLink, setGeneratedDashboardLink] = useState(""); // Novo estado
  const [dashboardMessageTemplate, setDashboardMessageTemplate] = useState(""); // Novo estado

  const { data: groups, isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ["groups", workspaceId],
    queryFn: () => fetchGroups(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: workspaceName, isLoading: isLoadingName } = useQuery({
    queryKey: ["workspaceName", workspaceId],
    queryFn: () => fetchWorkspaceName(workspaceId!),
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
        { title: "Postado", position: 5, group_id: newGroup.id }, // Nova coluna "Postado"
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

      setWhatsappApprovalTemplate(settings.whatsapp_message_template || 'Olá! Seus posts estão prontos para aprovação. Por favor, acesse o link a seguir para revisar e aprovar:');

      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) {
        throw new Error("Usuário não autenticado.");
      }

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
      setGeneratedApprovalLink(link);
    },
    onError: (e: Error) => {
      dismissToast();
      showError(`Erro ao gerar link: ${e.message}`);
      setIsApprovalModalOpen(false);
    },
    onMutate: () => {
      showLoading("Gerando link...");
    },
  });

  const generateDashboardLinkMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { data: settings, error: settingsError } = await supabase.from("app_settings").select("site_url").eq("id", 1).single();
      if (settingsError || !settings?.site_url) throw new Error("URL do site não configurada. Por favor, adicione em Configurações.");

      setDashboardMessageTemplate(`Olá! Aqui está o dashboard de acompanhamento do seu projeto com a ${workspaceName || 'Gama Creative'}. Acesse para ver os insights do Instagram e o status das tarefas do Kanban:\n\n`);

      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data: tokenData, error: tokenError } = await supabase.from("public_client_dashboards").insert({ group_id: groupId, workspace_id: workspaceId, created_by: user.id }).select("token").single();
      if (tokenError) {
        console.error("Supabase insert error:", tokenError);
        throw new Error(`Falha ao criar o link do dashboard: ${tokenError.message}`);
      }
      
      const dashboardUrl = `${settings.site_url}/client-dashboard/${tokenData.token}`;
      return dashboardUrl;
    },
    onSuccess: (link) => {
      dismissToast();
      setGeneratedDashboardLink(link);
    },
    onError: (e: Error) => {
      dismissToast();
      showError(`Erro ao gerar link do dashboard: ${e.message}`);
      setIsDashboardLinkModalOpen(false);
    },
    onMutate: () => {
      showLoading("Gerando link do dashboard...");
    },
  });

  useEffect(() => {
    if (groups && groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    } else if (groups && groups.length === 0) {
      setActiveGroupId(null);
    }
  }, [groups, activeGroupId]);

  const handleOpenApprovalModal = (groupId: string) => {
    setGeneratedApprovalLink("");
    setIsApprovalModalOpen(true);
    generateApprovalLinkMutation.mutate(groupId);
  };

  const handleOpenDashboardLinkModal = (groupId: string) => {
    setGeneratedDashboardLink("");
    setIsDashboardLinkModalOpen(true);
    generateDashboardLinkMutation.mutate(groupId);
  };

  if (!workspaceId) {
    return <div className="p-8 text-center">Workspace não encontrado.</div>;
  }

  const renderActions = () => {
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

    const generateDashboardLinkButton = userRole === 'admin' && activeGroupId && (
      <Button
        variant="outline"
        onClick={() => handleOpenDashboardLinkModal(activeGroupId)}
        disabled={generateDashboardLinkMutation.isPending}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Link do Dashboard
      </Button>
    );

    return (
      <div className="flex items-center gap-2">
        {sendApprovalButton}
        {generateDashboardLinkButton}
        <Button asChild variant="outline"><Link to={`/workspace/${workspaceId}/playbook`}><BookOpen className="h-4 w-4 mr-2" /> Ver Playbook</Link></Button>
        {(userRole === 'admin' || userRole === 'equipe') && (
          <Button asChild variant="outline">
            <Link to={`/workspace/${workspaceId}/instagram-insights`}>
              <BarChart className="h-4 w-4 mr-2" /> Insights
            </Link>
          </Button>
        )}
        {userRole === 'admin' && activeGroupId && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="text-primary border-primary hover:bg-primary/10"><CalendarCheck className="h-4 w-4 mr-2" /> Finalizar Mês</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Finalizar Mês do Grupo?</AlertDialogTitle><AlertDialogDescription>Esta ação moverá todas as tarefas do grupo atual para a coluna 'Aprovado'. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => endMonthMutation.mutate(activeGroupId)}>Sim, Finalizar Mês</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link to={`/`}>
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">{isLoadingName ? <Skeleton className="h-6 w-32" /> : workspaceName}</h1>
            </div>
        </div>
        {renderActions()}
      </div>
      {isLoadingGroups || isProfileLoading ? (
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
      }
      <PublicLinkModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        link={generatedApprovalLink}
        isGenerating={generateApprovalLinkMutation.isPending}
        messageTemplate={whatsappApprovalTemplate}
        title="Link de Aprovação Gerado"
        description="Copie a mensagem abaixo e envie para o seu cliente via WhatsApp."
        buttonText="Copiar Mensagem para WhatsApp"
      />
      <PublicLinkModal
        isOpen={isDashboardLinkModalOpen}
        onClose={() => setIsDashboardLinkModalOpen(false)}
        link={generatedDashboardLink}
        isGenerating={generateDashboardLinkMutation.isPending}
        messageTemplate={dashboardMessageTemplate}
        title="Link do Dashboard do Cliente Gerado"
        description="Copie a mensagem abaixo e envie para o seu cliente."
        buttonText="Copiar Mensagem"
      />
    </div>
  );
};

export default WorkspacePage;