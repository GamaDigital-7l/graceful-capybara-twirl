"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Link as LinkIcon, FileText, KeyRound, Cloud, Lightbulb, Users } from "lucide-react";
import { AgencyPlaybookEditor, AgencyPlaybook } from "@/components/AgencyPlaybookEditor";

const fetchAgencyPlaybook = async (): Promise<AgencyPlaybook | null> => {
  const { data, error } = await supabase
    .from("agency_playbook")
    .select("*")
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found is not an error here
    throw new Error(error.message);
  }
  return data;
};

const AgencyPlaybookPage = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full col-span-1 lg:col-span-2" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditorOpen(true)}>
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
              <CardContent className="space-y-2">
                {playbook.briefings_link && (
                  <a href={playbook.briefings_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                    <FileText className="h-4 w-4" /> Link dos Briefings
                  </a>
                )}
                {playbook.ai_agents_link && (
                  <a href={playbook.ai_agents_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                    <Lightbulb className="h-4 w-4" /> Link dos Agentes de IA
                  </a>
                )}
                {playbook.commercial_proposal_link && (
                  <a href={playbook.commercial_proposal_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                    <FileText className="h-4 w-4" /> Proposta Comercial
                  </a>
                )}
                {playbook.drive_link && (
                  <a href={playbook.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                    <Cloud className="h-4 w-4" /> Link para o Drive (Nextcloud)
                  </a>
                )}
                {playbook.useful_links?.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-semibold text-sm mb-1">Links Úteis:</h4>
                    <ul className="space-y-1">
                      {playbook.useful_links.map((link, index) => (
                        <li key={index}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.name}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!playbook.briefings_link && !playbook.ai_agents_link && !playbook.commercial_proposal_link && !playbook.drive_link && playbook.useful_links?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum link essencial configurado.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Processos da Agência</CardTitle>
                <CardDescription>Passo a passo para as operações internas.</CardDescription>
              </CardHeader>
              <CardContent>
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
              <CardContent>
                <ul className="space-y-2">
                  {playbook.logins?.map((login, index) => (
                    <li key={index} className="p-2 border rounded-md bg-muted/50">
                      <p className="font-bold">{login.platform}</p>
                      <p className="text-sm">Usuário: {login.username}</p>
                      {login.password && <p className="text-sm">Senha: ********</p>}
                    </li>
                  ))}
                </ul>
                {playbook.logins?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum login adicionado.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Cultura e Valores</CardTitle>
                <CardDescription>Informações sobre a empresa, o que fazer, prazos, etc.</CardDescription>
              </CardHeader>
              <CardContent>
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
  );
};

export default AgencyPlaybookPage;