"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Link as LinkIcon, FileText, KeyRound, Cloud, Lightbulb, Users, Eye, EyeOff, Copy, PlusCircle, Video } from "lucide-react";
import { AgencyPlaybookEditor } from "@/components/AgencyPlaybookEditor";
import type { AgencyPlaybook } from "@/components/AgencyPlaybookEditor";
import { toast } from "sonner";
import { ClientOnboardingGeneratorModal } from "@/components/ClientOnboardingGeneratorModal"; // Importar o novo modal

const fetchAgencyPlaybook = async (): Promise<AgencyPlaybook | null> => {
  const { data, error } = await supabase
    .from("agency_playbook")
    .select("*, briefings:briefings, ai_agents:ai_agents")
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data;
};

const AgencyPlaybookPage = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [isGenerateOnboardingModalOpen, setIsGenerateOnboardingModalOpen] = useState(false); // Novo estado para o modal
  const queryClient = useQueryClient();

  const { data: playbook, isLoading: isLoadingPlaybook } = useQuery({
    queryKey: ["agencyPlaybook"],
    queryFn: fetchAgencyPlaybook,
  });

  const updatePlaybookMutation = useMutation({
    mutationFn: async (updatedData: Partial<AgencyPlaybook>) => {
      if (!playbook) throw new Error("Playbook da agência não encontrado.");
      const { error } = await supabase
        .from("agency_playbook")
        .update(updatedData)
        .eq("id", playbook.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencyPlaybook"] });
      showSuccess("Playbook da agência atualizado com sucesso!");
      setIsEditorOpen(false);
    },
    onError: (e: Error) => showError(e.message),
  });

  const togglePasswordVisibility = useCallback((platform: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  }, []);

  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  }, []);

  const renderSkeletons = useCallback(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full col-span-1 lg:col-span-2" />
    </div>
  ), []);

  return (
    <React.Fragment>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-end gap-2"> {/* Ajustado para responsividade */}
          <Button onClick={() => setIsGenerateOnboardingModalOpen(true)} className="w-full sm:w-auto"> {/* Ajustado para responsividade */}
            <PlusCircle className="h-4 w-4 mr-2" />
            Gerar Página de Boas-Vindas
          </Button>
          <Button onClick={() => setIsEditorOpen(true)} className="w-full sm:w-auto"> {/* Ajustado para responsividade */}
            <Pencil className="h-4 w-4 mr-2" />
            Editar Playbook da Agência
          </Button>
        </div>

        {isLoadingPlaybook ? renderSkeletons() : (
          playbook ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><LinkIcon /> Links Essenciais</CardTitle>
                  <CardDescription>Acessos rápidos para ferramentas e documentos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Briefings</h4>
                    {playbook.briefings?.length > 0 ? (
                      <ul className="space-y-1 list-disc list-inside">
                        {playbook.briefings.map((link, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.name}</a>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyText(link.url)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">Nenhum link de briefing.</p>}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Agentes de IA</h4>
                    {playbook.ai_agents?.length > 0 ? (
                      <ul className="space-y-1 list-disc list-inside">
                        {playbook.ai_agents.map((link, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.name}</a>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyText(link.url)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">Nenhum link de agente de IA.</p>}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Links Úteis</h4>
                    {playbook.useful_links?.length > 0 ? (
                      <ul className="space-y-1 list-disc list-inside">
                          {playbook.useful_links.map((link, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.name}</a>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyText(link.url)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-muted-foreground">Nenhum link útil.</p>}
                    </div>
                    {playbook.drive_link && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Cloud className="h-4 w-4" /> Drive (Nextcloud)</h4>
                        <a href={playbook.drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Acessar Drive</a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Proposta Comercial</CardTitle>
                    <CardDescription>Link para o modelo de proposta comercial.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                    {playbook.commercial_proposal_link ? (
                      <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <a href={playbook.commercial_proposal_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                          Acessar Proposta Comercial
                        </a>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyText(playbook.commercial_proposal_link!)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum link de proposta comercial configurado.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Processos da Agência</CardTitle>
                    <CardDescription>Passo a passo para as operações internas.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                      {playbook.agency_processes || <p className="text-muted-foreground">Nenhum processo da agência preenchido.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound /> Logins de Plataformas</CardTitle>
                    <CardDescription>Credenciais para ferramentas e IAs da agência.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                    <ul className="space-y-2">
                      {playbook.logins?.map((login, index) => (
                        <li key={index} className="p-2 border rounded-md bg-muted/50">
                          <p className="font-bold">{login.platform}</p>
                          <p className="text-sm">Usuário: {login.username}</p>
                          {login.password && (
                            <div className="flex items-center gap-2 text-sm">
                              <span>Senha: {visiblePasswords.has(login.platform) ? login.password : '********'}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => togglePasswordVisibility(login.platform)}
                              >
                                {visiblePasswords.has(login.platform) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {playbook.logins?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum login adicionado.</p>}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Cultura e Valores</CardTitle>
                    <CardDescription>Informações sobre a empresa, o que fazer, prazos, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                      {playbook.culture_and_values || <p className="text-muted-foreground">Nenhuma informação de cultura e valores preenchida.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : <p className="text-center text-muted-foreground">Nenhum playbook da agência encontrado. Por favor, edite para adicionar conteúdo.</p>
          )}
          {playbook && (
            <AgencyPlaybookEditor
              isOpen={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              playbook={playbook}
              onSave={(data) => updatePlaybookMutation.mutate(data)}
            />
          )}
        </div>
        {/* Modal para gerar página de onboarding (será criado no próximo passo) */}
        <ClientOnboardingGeneratorModal
          isOpen={isGenerateOnboardingModalOpen}
          onClose={() => setIsGenerateOnboardingModalOpen(false)}
          agencyPlaybook={playbook}
        />
    </React.Fragment>
  );
}

export default AgencyPlaybookPage;