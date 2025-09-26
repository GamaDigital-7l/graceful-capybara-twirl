"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, Eye, Share2, Briefcase, MessageSquare, MoreVertical } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BriefingForm } from "@/types/briefing";
import { PublicLinkModal } from "@/components/PublicLinkModal";
import { useSettings } from "@/contexts/SettingsContext";
import { Badge } from "@/components/ui/badge";

const fetchBriefingForms = async (): Promise<BriefingForm[]> => {
  const { data, error } = await supabase
    .rpc("get_briefing_forms_with_response_count");
  if (error) throw new Error(error.message);
  return data.map(form => ({
    ...form,
    workspace_name: form.workspace_name || 'Agência (Global)'
  })) as BriefingForm[];
};

const BriefingsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const settings = useSettings();

  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [isPublicLinkModalOpen, setIsPublicLinkModalOpen] = useState(false);
  const [generatedPublicLink, setGeneratedPublicLink] = useState("");
  const [selectedFormTitle, setSelectedFormTitle] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [clientPhoneNumberForApproval, setClientPhoneNumberForApproval] = useState<string | null>(null);
  const [whatsappGroupIdForApproval, setWhatsappGroupIdForApproval] = useState<string | null>(null);

  const { data: forms, isLoading: isLoadingForms } = useQuery<BriefingForm[]>({
    queryKey: ["briefingForms"],
    queryFn: fetchBriefingForms,
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

  useEffect(() => {
    if (!isProfileLoading && userRole !== 'admin' && userRole !== 'equipe') {
      navigate("/");
    }
  }, [isProfileLoading, userRole, navigate]);

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase.from("briefing_forms").delete().eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefingForms"] });
      showSuccess("Formulário de briefing deletado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleGeneratePublicLink = useCallback(async (formId: string, formTitle: string, workspaceId: string | null) => {
    if (!settings?.site_url) {
      showError("URL do site não configurada. Por favor, adicione em Configurações.");
      return;
    }
    setIsGeneratingLink(true);
    try {
      const longUrl = `${settings.site_url}/briefings/public/${formId}`;
      setGeneratedPublicLink(longUrl);
      setSelectedFormTitle(formTitle);

      if (workspaceId) {
        const { data: workspaceDetails, error: wsError } = await supabase
          .from("workspaces")
          .select("client_phone_number, whatsapp_group_id")
          .eq("id", workspaceId)
          .single();
        if (wsError) {
          console.error("Error fetching workspace details:", wsError);
        } else {
          setClientPhoneNumberForApproval(workspaceDetails?.client_phone_number || null);
          setWhatsappGroupIdForApproval(workspaceDetails?.whatsapp_group_id || null);
        }
      } else {
        setClientPhoneNumberForApproval(null);
        setWhatsappGroupIdForApproval(null);
      }

      setIsPublicLinkModalOpen(true);
    } catch (error: any) {
      showError(`Erro ao gerar link público: ${error.message}`);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [settings?.site_url, settings?.whatsapp_message_template]);

  if (isProfileLoading || userRole === undefined) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (userRole !== 'admin' && userRole !== 'equipe') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
          <CardContent><p>Você não tem permissão para acessar esta página.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Gerenciar Briefings</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/briefings/new">
            <span>
              <PlusCircle className="h-4 w-4 mr-2" />
              Criar Novo Formulário
            </span>
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Meus Formulários de Briefing</CardTitle>
          <CardDescription>Crie e gerencie formulários para coletar informações de clientes.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoadingForms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : forms && forms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <Card key={form.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg font-medium flex-grow pr-2">{form.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Briefcase className="h-3 w-3" /> {form.workspace_name}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/briefings/${form.id}/edit`}>
                            <span>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Formulário
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/briefings/${form.id}/responses`}>
                            <span>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Respostas
                              {form.response_count !== undefined && form.response_count > 0 && (
                                <Badge variant="secondary" className="ml-2">{form.response_count}</Badge>
                              )}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePublicLink(form.id, form.title, form.workspace_id)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Gerar Link Público
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar Formulário
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar o formulário "{form.title}" e todas as suas respostas? Esta ação é irreversível.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteFormMutation.mutate(form.id)} className="bg-destructive hover:bg-destructive/90">
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-3">{form.description || "Nenhuma descrição."}</p>
                    {form.response_count !== undefined && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                        <MessageSquare className="h-3 w-3" /> {form.response_count} Respostas
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum formulário de briefing cadastrado ainda. Clique em "Criar Novo Formulário" para começar.</p>
          )}
        </CardContent>
      </Card>
      <PublicLinkModal
        isOpen={isPublicLinkModalOpen}
        onClose={() => setIsPublicLinkModalOpen(false)}
        link={generatedPublicLink}
        isGenerating={isGeneratingLink}
        title={`Link Público para: ${selectedFormTitle}`}
        description="Copie o link abaixo para compartilhar o formulário publicamente."
        buttonText="Copiar Link"
        clientPhoneNumber={clientPhoneNumberForApproval}
        whatsappGroupId={whatsappGroupIdForApproval}
      />
    </div>
  );
};

export default BriefingsPage;