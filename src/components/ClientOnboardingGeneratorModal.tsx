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
import { Textarea } from "@/components/ui/textarea";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { AgencyPlaybook } from "./AgencyPlaybookEditor";
import { useSettings } from "@/contexts/SettingsContext";

interface ClientOnboardingGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyPlaybook: AgencyPlaybook | null;
}

export function ClientOnboardingGeneratorModal({
  isOpen,
  onClose,
  agencyPlaybook,
}: ClientOnboardingGeneratorModalProps) {
  const settings = useSettings();
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setClientName("");
      setCompanyName("");
      setGeneratedLink("");
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handleGeneratePage = async () => {
    if (!clientName.trim()) {
      showError("O nome do cliente é obrigatório.");
      return;
    }
    if (!agencyPlaybook) {
      showError("Playbook da agência não carregado. Não é possível gerar a página.");
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

      const { data, error } = await supabase
        .from("client_onboarding_pages")
        .insert({
          client_name: clientName.trim(),
          company_name: companyName.trim() || null,
          agency_welcome_message: agencyPlaybook.onboarding_welcome_message,
          agency_processes_content: agencyPlaybook.agency_processes,
          agency_apps_access_info: agencyPlaybook.onboarding_apps_access_info,
          agency_tutorial_videos: agencyPlaybook.onboarding_tutorial_videos,
          agency_briefing_links: agencyPlaybook.onboarding_briefing_links,
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
        <div className="py-4 space-y-4">
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

          {!generatedLink ? (
            <Button
              onClick={handleGeneratePage}
              className="w-full"
              disabled={isGenerating || !clientName.trim()}
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