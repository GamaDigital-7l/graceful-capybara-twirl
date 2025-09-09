"use client";

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PlusCircle, Edit, Trash2, Copy, Brain } from "lucide-react";
import { PromptModal, Prompt } from "@/components/PromptModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const fetchClientDetails = async (clientId: string) => {
  const { data, error } = await supabase.from("second_brain_clients").select("name").eq("id", clientId).single();
  if (error) throw new Error(error.message);
  return data;
};

const fetchClientPrompts = async (clientId: string): Promise<Prompt[]> => {
  const { data, error } = await supabase.from("second_brain_prompts").select("*").eq("second_brain_client_id", clientId).order("title");
  if (error) throw new Error(error.message);
  return data;
};

const ClientPromptsPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);

  const { data: clientDetails, isLoading: isLoadingClientDetails } = useQuery({
    queryKey: ["secondBrainClientDetails", clientId],
    queryFn: () => fetchClientDetails(clientId!),
    enabled: !!clientId,
  });

  const { data: prompts, isLoading: isLoadingPrompts } = useQuery<Prompt[]>({
    queryKey: ["secondBrainPrompts", clientId],
    queryFn: () => fetchClientPrompts(clientId!),
    enabled: !!clientId,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || null);
      }
      setProfileLoading(false);
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!isProfileLoading && userRole !== 'admin') {
      navigate("/"); // Redirect non-admins
    }
  }, [isProfileLoading, userRole, navigate]);

  const createPromptMutation = useMutation({
    mutationFn: async (prompt: Partial<Prompt>) => {
      const { error } = await supabase.from("second_brain_prompts").insert(prompt);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainPrompts", clientId] });
      showSuccess("Prompt adicionado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const updatePromptMutation = useMutation({
    mutationFn: async (prompt: Partial<Prompt>) => {
      if (!prompt.id) throw new Error("ID do prompt é necessário para atualização.");
      const { error } = await supabase.from("second_brain_prompts").update(prompt).eq("id", prompt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainPrompts", clientId] });
      showSuccess("Prompt atualizado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase.from("second_brain_prompts").delete().eq("id", promptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainPrompts", clientId] });
      showSuccess("Prompt deletado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleSavePrompt = (prompt: Partial<Prompt>) => {
    if (prompt.id) {
      updatePromptMutation.mutate(prompt);
    } else {
      createPromptMutation.mutate(prompt);
    }
  };

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Prompt copiado para a área de transferência!");
  };

  if (isProfileLoading || userRole === null) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (userRole !== 'admin') {
    return null; // Should be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/second-brain">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Clientes
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prompts do Cliente</h1>
            <p className="text-sm text-muted-foreground">{isLoadingClientDetails ? <Skeleton className="h-4 w-32 mt-1" /> : clientDetails?.name}</p>
          </div>
        </div>
        <Button onClick={() => { setSelectedPrompt(null); setIsPromptModalOpen(true); }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Prompt
        </Button>
      </header>
      <main className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Prompts Personalizados</CardTitle>
            <CardDescription>Gerencie os prompts de IA e notas importantes para este cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPrompts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : prompts && prompts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium flex-grow pr-2">{prompt.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                            <Brain className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyPrompt(prompt.content)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Prompt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedPrompt(prompt); setIsPromptModalOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Prompt
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar Prompt
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja deletar o prompt "{prompt.title}"? Esta ação é irreversível.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => prompt.id && deletePromptMutation.mutate(prompt.id)} className="bg-destructive hover:bg-destructive/90">
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-5">{prompt.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum prompt cadastrado para este cliente ainda. Clique em "Adicionar Prompt" para começar.</p>
            )}
          </CardContent>
        </Card>
      </main>
      {clientId && (
        <PromptModal
          isOpen={isPromptModalOpen}
          onClose={() => setIsPromptModalOpen(false)}
          onSave={handleSavePrompt}
          existingPrompt={selectedPrompt}
          clientId={clientId}
        />
      )}
    </div>
  );
};

export default ClientPromptsPage;