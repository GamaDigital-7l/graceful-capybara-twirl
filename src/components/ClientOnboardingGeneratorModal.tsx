"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importar Select
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { AgencyPlaybook } from "./AgencyPlaybookEditor";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query"; // Importar useQuery
import { OnboardingTemplate } from "@/pages/OnboardingTemplatesPage"; // Importar OnboardingTemplate

interface ClientOnboardingGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyPlaybook: AgencyPlaybook | null; // Mantido para compatibilidade, mas o conteúdo virá do template
}

const fetchOnboardingTemplates = async (): Promise<OnboardingTemplate[]> => {
  const { data, error } = await supabase.from("onboarding_page_templates").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

export function ClientOnboardingGeneratorModal({
  isOpen,
  onClose,
  agencyPlaybook, // Não será mais a fonte principal do conteúdo
}: ClientOnboardingGeneratorModalProps) {
  const settings = useSettings();
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null); // Novo estado para o template selecionado
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: templates, isLoading: isLoadingTemplates } = useQuery<OnboardingTemplate[]>({
    queryKey: ["onboardingTemplates"],
    queryFn: fetchOnboardingTemplates,
    enabled: isOpen, // Carregar templates apenas quando o modal estiver aberto
  });

  useEffect(() => {
    if (!isOpen) {
      setClientName("");
      setCompanyName("");
      setSelectedTemplateId(null);
      setGeneratedLink("");
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handleGeneratePage = async () => {
    if (!clientName.trim()) {
      showError("O nome do cliente é obrigatório.");
      return;
    }
    if (!selectedTemplateId) {
      showError("Por favor, selecione um template de onboarding.");
      return;
    }
    if (!settings?.site_url) {
      showError("URL do site não configurada. Por favor, adicione em Configurações.");
      return;
    }

    setIsGenerating(true);
    const loadingToastId = showLoading("Gerando página de boas-vindas...");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Usuário não autenticado.");
      }

      // O conteúdo virá do template referenciado pelo onboarding_template_id
      const { data, error } = await supabase
        .from("client_onboarding_pages")
        .insert({
          client_name: clientName.trim(),
          company_name: companyName.trim() || null,
          onboarding_template_id: selectedTemplateId, // Referenciar o template
          created_by: user.id,
        })
        .select("public_token")
        .single();

      if (error) throw error;

      const publicUrl = `${settings.site_url}/onboarding/${data.public_token}`;
      setGeneratedLink(publicUrl);
      showSuccess("Página de boas-vindas gerada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar página de onboarding:", error);
      showError(`Erro ao gerar página: ${error.message}`);
    } finally {
      setIsGenerating(false);
      dismissToast(loadingToastId);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      showSuccess("Link copiado para a área de transferência!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Página de Boas-Vindas para Cliente</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome do Cliente</Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João da Silva"
              disabled={isGenerating || !!generatedLink}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa (Opcional)</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Empresa XYZ"
              disabled={isGenerating || !!generatedLink}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onboarding-template">Template de Onboarding</Label>
            <Select
              value={selectedTemplateId || ""}
              onValueChange={setSelectedTemplateId}
              disabled={isGenerating || !!generatedLink || isLoadingTemplates}
            >
              <SelectTrigger id="onboarding-template">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTemplates ? (
                  <SelectItem value="loading" disabled>Carregando templates...</SelectItem>
                ) : templates && templates.length > 0 ? (
                  templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-templates" disabled>Nenhum template disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {!generatedLink ? (
            <Button
              onClick={handleGeneratePage}
              className="w-full"
              disabled={isGenerating || !clientName.trim() || !selectedTemplateId}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Gerar Página
            </Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="generated-link">Link da Página de Boas-Vindas</Label>
              <div className="flex items-center gap-2">
                <Input id="generated-link" value={generatedLink} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Envie este link para o seu novo cliente.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}