import { useState, useCallback } from "react"; // Adicionado useCallback
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, FileText, KeyRound, Link as LinkIcon, Pencil, Paperclip, Eye, EyeOff } from "lucide-react";
import { PlaybookEditor } from "@/components/PlaybookEditor";

export interface Playbook {
  id: string;
  workspace_id: string;
  briefing: string | null;
  contract_url: string | null;
  asset_links: { name: string; url: string }[];
  social_media_logins: { platform: string; username: string; password?: string }[];
  documents: { name: string; url: string }[];
}

const fetchPlaybook = async (workspaceId: string): Promise<Playbook | null> => {
  const { data, error } = await supabase
    .from("playbooks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
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

const PlaybookPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set()); // Corrigido: removido 'new'
  const queryClient = useQueryClient();

  const { data: playbook, isLoading: isLoadingPlaybook } = useQuery({
    queryKey: ["playbook", workspaceId],
    queryFn: () => fetchPlaybook(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: workspaceName, isLoading: isLoadingName } = useQuery({
    queryKey: ["workspaceName", workspaceId],
    queryFn: () => fetchWorkspaceName(workspaceId!),
    enabled: !!workspaceId,
  });

  const updatePlaybookMutation = useMutation({
    mutationFn: async (updatedData: Partial<Playbook>) => {
      if (!playbook) throw new Error("Playbook não encontrado.");
      const { error } = await supabase
        .from("playbooks")
        .update(updatedData)
        .eq("id", playbook.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook", workspaceId] });
      showSuccess("Playbook atualizado com sucesso!");
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

  const renderSkeletons = useCallback(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full col-span-1 lg:col-span-2" />
    </div>
  ), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> {/* Ajustado para responsividade */}
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link to={`/workspace/${workspaceId}`}>
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Playbook</h1>
                <p className="text-sm text-muted-foreground">{isLoadingName ? <Skeleton className="h-4 w-32 mt-1" /> : workspaceName}</p>
            </div>
        </div>
        <Button onClick={() => setIsEditorOpen(true)} className="w-full sm:w-auto"> {/* Ajustado para responsividade */}
          <Pencil className="h-4 w-4 mr-2" />
          Editar Playbook
        </Button>
      </div>
      {isLoadingPlaybook ? renderSkeletons() : (
        playbook ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LinkIcon /> Ativos e Links</CardTitle>
                <CardDescription>Links para contrato, logos, fontes, etc.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:p-6">
                {playbook.contract_url ? (
                  <a href={playbook.contract_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                    <BookOpen className="h-4 w-4" /> Ver Contrato
                  </a>
                ) : <p className="text-sm text-muted-foreground">Nenhum link de contrato.</p>}
                <ul className="space-y-1">
                  {playbook.asset_links?.map((link, index) => (
                    <li key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.name}</a>
                    </li>
                  ))}
                </ul>
                {playbook.asset_links?.length === 0 && !playbook.contract_url && <p className="text-sm text-muted-foreground">Nenhum link de material adicionado.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Paperclip /> Documentos</CardTitle>
                <CardDescription>Anexos e documentos importantes.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ul className="space-y-1">
                  {playbook.documents?.map((doc, index) => (
                    <li key={index}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{doc.name}</a>
                    </li>
                  ))}
                </ul>
                {playbook.documents?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento adicionado.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound /> Logins de Redes Sociais</CardTitle>
                <CardDescription>Credenciais para as plataformas do cliente.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ul className="space-y-2">
                  {playbook.social_media_logins?.map((login, index) => (
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
                {playbook.social_media_logins?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum login adicionado.</p>}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> Briefing</CardTitle>
                <CardDescription>Respostas e informações chave do projeto.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {playbook.briefing || <p className="text-muted-foreground">Nenhum briefing preenchido.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : <p className="text-center text-muted-foreground">Nenhum playbook encontrado para este workspace.</p>
      )}
      {playbook && (
        <PlaybookEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          playbook={playbook}
          onSave={(data) => updatePlaybookMutation.mutate(data)}
        />
      )}
    </div>
  );
};

export default PlaybookPage;