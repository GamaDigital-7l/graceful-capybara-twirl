"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, MoreVertical, Copy, Link as LinkIcon, FileText, Users, Video } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export interface OnboardingTemplate {
  id: string;
  name: string;
  welcome_message: string | null;
  processes_content: string | null;
  apps_access_info: string | null;
  tutorial_videos: { name: string; url: string }[];
  briefing_links: { name: string; url: string }[];
  main_content: string | null; // Novo campo
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const fetchOnboardingTemplates = async (): Promise<OnboardingTemplate[]> => {
  const { data, error } = await supabase.from("onboarding_page_templates").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const OnboardingTemplatesPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);

  const [templateName, setTemplateName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [processesContent, setProcessesContent] = useState("");
  const [appsAccessInfo, setAppsAccessInfo] = useState("");
  const [tutorialVideos, setTutorialVideos] = useState<{ name: string; url: string }[]>([]);
  const [briefingLinks, setBriefingLinks] = useState<{ name: string; url: string }[]>([]);
  const [mainContent, setMainContent] = useState(""); // Novo estado
  const [isSaving, setIsSaving] = useState(false);

  const { data: templates, isLoading: isLoadingTemplates } = useQuery<OnboardingTemplate[]>({
    queryKey: ["onboardingTemplates"],
    queryFn: fetchOnboardingTemplates,
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

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name);
      setWelcomeMessage(selectedTemplate.welcome_message || "");
      setProcessesContent(selectedTemplate.processes_content || "");
      setAppsAccessInfo(selectedTemplate.apps_access_info || "");
      setTutorialVideos(selectedTemplate.tutorial_videos || []);
      setBriefingLinks(selectedTemplate.briefing_links || []);
      setMainContent(selectedTemplate.main_content || ""); // Inicializar novo estado
    } else {
      setTemplateName("");
      setWelcomeMessage("");
      setProcessesContent("");
      setAppsAccessInfo("");
      setTutorialVideos([]);
      setBriefingLinks([]);
      setMainContent(""); // Resetar novo estado
    }
  }, [selectedTemplate, isModalOpen]);

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<OnboardingTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from("onboarding_page_templates").insert({ ...templateData, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingTemplates"] });
      showSuccess("Template criado com sucesso!");
      setIsModalOpen(false);
    },
    onError: (e: Error) => showError(e.message),
    onSettled: () => setIsSaving(false),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<OnboardingTemplate>) => {
      if (!templateData.id) throw new Error("ID do template é necessário para atualização.");
      const { error } = await supabase.from("onboarding_page_templates").update(templateData).eq("id", templateData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingTemplates"] });
      showSuccess("Template atualizado com sucesso!");
      setIsModalOpen(false);
    },
    onError: (e: Error) => showError(e.message),
    onSettled: () => setIsSaving(false),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from("onboarding_page_templates").delete().eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingTemplates"] });
      showSuccess("Template deletado com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      showError("O nome do template é obrigatório.");
      return;
    }
    setIsSaving(true);
    const dataToSave = {
      name: templateName.trim(),
      welcome_message: welcomeMessage.trim() || null,
      processes_content: processesContent.trim() || null,
      apps_access_info: appsAccessInfo.trim() || null,
      tutorial_videos: tutorialVideos,
      briefing_links: briefingLinks,
      main_content: mainContent.trim() || null, // Salvar novo campo
    };

    if (selectedTemplate) {
      updateTemplateMutation.mutate({ ...dataToSave, id: selectedTemplate.id });
    } else {
      createTemplateMutation.mutate(dataToSave);
    }
  };

  const addBriefingLink = () => setBriefingLinks([...briefingLinks, { name: "", url: "" }]);
  const updateBriefingLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...briefingLinks];
    newLinks[index][field] = value;
    setBriefingLinks(newLinks);
  };
  const removeBriefingLink = (index: number) => setBriefingLinks(briefingLinks.filter((_, i) => i !== index));

  const addTutorialVideo = () => setTutorialVideos([...tutorialVideos, { name: "", url: "" }]);
  const updateTutorialVideo = (index: number, field: 'name' | 'url', value: string) => {
    const newVideos = [...tutorialVideos];
    newVideos[index][field] = value;
    setTutorialVideos(newVideos);
  };
  const removeTutorialVideo = (index: number) => setTutorialVideos(tutorialVideos.filter((_, i) => i !== index));

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gerenciar Templates de Onboarding</h1>
        <Button onClick={() => { setSelectedTemplate(null); setIsModalOpen(true); }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Templates Existentes</CardTitle>
          <CardDescription>Crie modelos de páginas de boas-vindas para diferentes serviços ou clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium flex-grow pr-2">{template.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setIsModalOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Template
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar Template
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar o template "{template.name}"? Esta ação é irreversível e pode afetar páginas de onboarding existentes que o utilizam.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTemplateMutation.mutate(template.id)} className="bg-destructive hover:bg-destructive/90">
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">{template.welcome_message || "Nenhuma mensagem de boas-vindas."}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      {template.briefing_links?.length > 0 && <><FileText className="h-3 w-3" /> {template.briefing_links.length} Briefings</>}
                      {template.tutorial_videos?.length > 0 && <><Video className="h-3 w-3" /> {template.tutorial_videos.length} Vídeos</>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum template de onboarding cadastrado ainda. Clique em "Novo Template" para começar.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição de Template */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Editar Template de Onboarding" : "Criar Novo Template de Onboarding"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="welcome" className="py-4">
            <TabsList className="grid w-full grid-cols-5"> {/* Adicionada nova coluna para 'Conteúdo Principal' */}
              <TabsTrigger value="welcome">Boas-Vindas</TabsTrigger>
              <TabsTrigger value="briefings">Briefings</TabsTrigger>
              <TabsTrigger value="processes">Processos</TabsTrigger>
              <TabsTrigger value="apps">Apps & Vídeos</TabsTrigger>
              <TabsTrigger value="main-content">Conteúdo Principal</TabsTrigger> {/* Nova aba */}
            </TabsList>
            <TabsContent value="welcome" className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Template</Label>
                <Input id="template-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex: Onboarding Social Media" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome-message">Mensagem de Boas-Vindas (suporta Markdown)</Label>
                <Textarea id="welcome-message" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={5} placeholder="Ex: Olá [Nome do Cliente], seja bem-vindo(a) à Gama Creative..." />
                <p className="text-xs text-muted-foreground">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)`.</p>
              </div>
            </TabsContent>
            <TabsContent value="briefings" className="pt-4 space-y-4">
              <Label className="text-lg font-semibold">Links de Briefings</Label>
              {briefingLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input placeholder="Nome do Briefing" value={link.name} onChange={(e) => updateBriefingLink(index, 'name', e.target.value)} />
                  <Input placeholder="URL" value={link.url} onChange={(e) => updateBriefingLink(index, 'url', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeBriefingLink(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addBriefingLink} className="mt-2">Adicionar Link de Briefing</Button>
            </TabsContent>
            <TabsContent value="processes" className="pt-4">
              <Label htmlFor="processes-content">Conteúdo dos Processos da Agência (suporta Markdown)</Label>
              <Textarea id="processes-content" value={processesContent} onChange={(e) => setProcessesContent(e.target.value)} rows={10} placeholder="Descreva aqui como funcionam os processos da sua agência..." />
              <p className="text-xs text-muted-foreground">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)`.</p>
            </TabsContent>
            <TabsContent value="apps" className="pt-4 space-y-4">
              <div>
                <Label htmlFor="apps-access-info">Informações de Acesso aos Apps (suporta Markdown)</Label>
                <Textarea id="apps-access-info" value={appsAccessInfo} onChange={(e) => setAppsAccessInfo(e.target.value)} rows={5} placeholder="Ex: Para acessar nosso Kanban, use o link..." />
                <p className="text-xs text-muted-foreground">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)`.</p>
              </div>
              <div>
                <Label className="text-lg font-semibold">Vídeos Tutoriais</Label>
                {tutorialVideos.map((video, index) => (
                  <div key={index} className="flex items-center gap-2 mt-2">
                    <Input placeholder="Título do Vídeo" value={video.name} onChange={(e) => updateTutorialVideo(index, 'name', e.target.value)} />
                    <Input placeholder="URL do YouTube/Vimeo" value={video.url} onChange={(e) => updateTutorialVideo(index, 'url', e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => removeTutorialVideo(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addTutorialVideo} className="mt-2">Adicionar Vídeo Tutorial</Button>
              </div>
            </TabsContent>
            <TabsContent value="main-content" className="pt-4"> {/* Nova aba para o conteúdo principal */}
              <Label htmlFor="main-content">Conteúdo Principal (suporta Markdown)</Label>
              <Textarea id="main-content" value={mainContent} onChange={(e) => setMainContent(e.target.value)} rows={15} placeholder="Descreva os serviços contratados, prazos, o que está incluído no pacote, etc. Use Markdown para formatar o texto, adicionar imagens e vídeos." />
              <p className="text-xs text-muted-foreground">
                Use **negrito**, *itálico*, `código`, [links](url), listas (`- item`), imagens `![alt](url)` e vídeos `![alt](https://www.youtube.com/watch?v=VIDEO_ID)`.
              </p>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingTemplatesPage;