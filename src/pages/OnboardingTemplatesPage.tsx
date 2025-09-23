"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, MoreVertical, Copy, Link as LinkIcon, FileText, Users, Video, GripVertical, Eye } from "lucide-react"; // Adicionado GripVertical e Eye
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
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface OnboardingTemplate {
  id: string;
  name: string;
  welcome_message: string | null;
  processes_content: { title: string; content: string }[]; // Alterado para array de objetos
  apps_access_info: { title: string; content: string }[]; // Alterado para array de objetos
  tutorial_videos: { name: string; url: string }[];
  briefing_links: { name: string; url: string }[];
  main_content: string | null;
  section_order: string[]; // Novo campo para a ordem das seções
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const fetchOnboardingTemplates = async (): Promise<OnboardingTemplate[]> => {
  const { data, error } = await supabase.from("onboarding_page_templates").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

// Componente Sortable para reordenar seções
interface SortableSectionItemProps {
  id: string;
  label: string;
}

const SortableSectionItem = ({ id, label }: SortableSectionItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border rounded-md bg-background shadow-sm cursor-grab"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
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
  const [processesContent, setProcessesContent] = useState<{ title: string; content: string }[]>([]); // Alterado
  const [appsAccessInfo, setAppsAccessInfo] = useState<{ title: string; content: string }[]>([]); // Alterado
  const [tutorialVideos, setTutorialVideos] = useState<{ name: string; url: string }[]>([]);
  const [briefingLinks, setBriefingLinks] = useState<{ name: string; url: string }[]>([]);
  const [mainContent, setMainContent] = useState("");
  const [sectionOrder, setSectionOrder] = useState<string[]>([]); // Novo estado
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
      setProcessesContent(selectedTemplate.processes_content || []); // Inicializar como array
      setAppsAccessInfo(selectedTemplate.apps_access_info || []); // Inicializar como array
      setTutorialVideos(selectedTemplate.tutorial_videos || []);
      setBriefingLinks(selectedTemplate.briefing_links || []);
      setMainContent(selectedTemplate.main_content || "");
      setSectionOrder(selectedTemplate.section_order || ['welcome_message', 'main_content', 'briefing_links', 'processes_content', 'apps_access_info', 'tutorial_videos']); // Default order
    } else {
      setTemplateName("");
      setWelcomeMessage("");
      setProcessesContent([]);
      setAppsAccessInfo([]);
      setTutorialVideos([]);
      setBriefingLinks([]);
      setMainContent("");
      setSectionOrder(['welcome_message', 'main_content', 'briefing_links', 'processes_content', 'apps_access_info', 'tutorial_videos']); // Default order for new
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
      processes_content: processesContent, // Salvar como array
      apps_access_info: appsAccessInfo, // Salvar como array
      tutorial_videos: tutorialVideos,
      briefing_links: briefingLinks,
      main_content: mainContent.trim() || null,
      section_order: sectionOrder, // Salvar a ordem das seções
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

  // Funções para Processes Content
  const addProcessItem = () => setProcessesContent([...processesContent, { title: "", content: "" }]);
  const updateProcessItem = (index: number, field: 'title' | 'content', value: string) => {
    const newItems = [...processesContent];
    newItems[index][field] = value;
    setProcessesContent(newItems);
  };
  const removeProcessItem = (index: number) => setProcessesContent(processesContent.filter((_, i) => i !== index));

  // Funções para Apps Access Info
  const addAppAccessItem = () => setAppsAccessInfo([...appsAccessInfo, { title: "", content: "" }]);
  const updateAppAccessItem = (index: number, field: 'title' | 'content', value: string) => {
    const newItems = [...appsAccessInfo];
    newItems[index][field] = value;
    setAppsAccessInfo(newItems);
  };
  const removeAppAccessItem = (index: number) => setAppsAccessInfo(appsAccessInfo.filter((_, i) => i !== index));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      setSectionOrder((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const sectionLabels: { [key: string]: string } = {
    'welcome_message': 'Mensagem de Boas-Vindas',
    'main_content': 'Conteúdo Principal',
    'briefing_links': 'Links de Briefings',
    'processes_content': 'Nossos Processos',
    'apps_access_info': 'Acesso aos Nossos Apps',
    'tutorial_videos': 'Vídeos Tutoriais',
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handlePreview = () => {
    if (!selectedTemplate) {
      showError("Por favor, selecione ou crie um template para pré-visualizar.");
      return;
    }
    // Salvar o estado atual no localStorage para a página de preview ler
    const previewData = {
      client_name: "Cliente de Teste",
      company_name: "Empresa de Teste",
      template: {
        ...selectedTemplate,
        name: templateName,
        welcome_message: welcomeMessage,
        processes_content: processesContent,
        apps_access_info: appsAccessInfo,
        tutorial_videos: tutorialVideos,
        briefing_links: briefingLinks,
        main_content: mainContent,
        section_order: sectionOrder,
      }
    };
    localStorage.setItem('onboardingPreviewData', JSON.stringify(previewData));
    window.open('/onboarding/preview', '_blank'); // Abrir em nova aba com token especial
  };

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
            <TabsList className="grid w-full grid-cols-6"> {/* Adicionada nova coluna para 'Layout' */}
              <TabsTrigger value="welcome">Boas-Vindas</TabsTrigger>
              <TabsTrigger value="main-content">Conteúdo Principal</TabsTrigger>
              <TabsTrigger value="briefings">Briefings</TabsTrigger>
              <TabsTrigger value="processes">Processos</TabsTrigger>
              <TabsTrigger value="apps">Apps & Vídeos</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger> {/* Nova aba */}
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
            <TabsContent value="main-content" className="pt-4">
              <Label htmlFor="main-content">Conteúdo Principal (suporta Markdown)</Label>
              <Textarea id="main-content" value={mainContent} onChange={(e) => setMainContent(e.target.value)} rows={15} placeholder="Descreva os serviços contratados, prazos, o que está incluído no pacote, etc. Use Markdown para formatar o texto, adicionar imagens e vídeos." />
              <p className="text-xs text-muted-foreground">
                Use **negrito**, *itálico*, `código`, [links](url), listas (`- item`), imagens `![alt](url)` e vídeos `![alt](https://www.youtube.com/watch?v=VIDEO_ID)`.
              </p>
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
            <TabsContent value="processes" className="pt-4 space-y-4">
              <Label className="text-lg font-semibold">Nossos Processos</Label>
              {processesContent.map((item, index) => (
                <div key={index} className="space-y-2 border p-3 rounded-md bg-muted/50">
                  <Input placeholder="Título do Processo" value={item.title} onChange={(e) => updateProcessItem(index, 'title', e.target.value)} />
                  <Textarea placeholder="Conteúdo do Processo (suporta Markdown)" value={item.content} onChange={(e) => updateProcessItem(index, 'content', e.target.value)} rows={3} />
                  <Button variant="destructive" size="sm" onClick={() => removeProcessItem(index)}><Trash2 className="h-4 w-4 mr-2" /> Remover Processo</Button>
                </div>
              ))}
              <Button variant="outline" onClick={addProcessItem} className="mt-2">Adicionar Item de Processo</Button>
              <p className="text-xs text-muted-foreground mt-2">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)` no conteúdo.</p>
            </TabsContent>
            <TabsContent value="apps" className="pt-4 space-y-4">
              <div>
                <Label className="text-lg font-semibold">Informações de Acesso aos Apps</Label>
                {appsAccessInfo.map((item, index) => (
                  <div key={index} className="space-y-2 border p-3 rounded-md bg-muted/50">
                    <Input placeholder="Título do App/Acesso" value={item.title} onChange={(e) => updateAppAccessItem(index, 'title', e.target.value)} />
                    <Textarea placeholder="Conteúdo de Acesso (suporta Markdown)" value={item.content} onChange={(e) => updateAppAccessItem(index, 'content', e.target.value)} rows={3} />
                    <Button variant="destructive" size="sm" onClick={() => removeAppAccessItem(index)}><Trash2 className="h-4 w-4 mr-2" /> Remover Acesso</Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addAppAccessItem} className="mt-2">Adicionar Item de Acesso</Button>
                <p className="text-xs text-muted-foreground mt-2">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)` no conteúdo.</p>
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
            <TabsContent value="layout" className="pt-4 space-y-4"> {/* Nova aba de Layout */}
              <Label className="text-lg font-semibold">Reorganizar Seções da Página</Label>
              <p className="text-sm text-muted-foreground mb-4">Arraste e solte para mudar a ordem de exibição das seções na página de boas-vindas do cliente.</p>
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sectionOrder.map((id) => (
                      <SortableSectionItem key={id} id={id} label={sectionLabels[id] || id} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>
          </Tabs>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-4">
            <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
              <Eye className="h-4 w-4 mr-2" /> Pré-visualizar Página
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <DialogClose asChild><Button type="button" variant="secondary" className="w-full sm:w-auto">Cancelar</Button></DialogClose>
              <Button type="button" onClick={handleSaveTemplate} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? "Salvando..." : "Salvar Template"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingTemplatesPage;