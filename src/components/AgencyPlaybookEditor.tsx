import { useState, useEffect, useCallback } from "react"; // Adicionado useCallback
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";

export interface AgencyPlaybook {
  id: string;
  briefings: { name: string; url: string }[];
  ai_agents: { name: string; url: string }[];
  useful_links: { name: string; url: string }[];
  commercial_proposal_link: string | null;
  agency_processes: string | null;
  drive_link: string | null;
  logins: { platform: string; username: string; password?: string }[];
  culture_and_values: string | null;
  // Campos de onboarding removidos daqui, agora gerenciados via templates
}

interface AgencyPlaybookEditorProps {
  isOpen: boolean;
  onClose: () => void;
  playbook: AgencyPlaybook;
  onSave: (data: Partial<AgencyPlaybook>) => void;
}

export function AgencyPlaybookEditor({ isOpen, onClose, playbook, onSave }: AgencyPlaybookEditorProps) {
  const [briefings, setBriefings] = useState<{ name: string; url: string }[]>([]);
  const [aiAgents, setAiAgents] = useState<{ name: string; url: string }[]>([]);
  const [usefulLinks, setUsefulLinks] = useState<{ name: string; url: string }[]>([]);
  const [commercialProposalLink, setCommercialProposalLink] = useState("");
  const [agencyProcesses, setAgencyProcesses] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [logins, setLogins] = useState<{ platform: string; username: string; password?: string }[]>([]);
  const [cultureAndValues, setCultureAndValues] = useState("");
  // Estados de onboarding removidos

  useEffect(() => {
    if (playbook) {
      setBriefings(playbook.briefings || []);
      setAiAgents(playbook.ai_agents || []);
      setUsefulLinks(playbook.useful_links || []);
      setCommercialProposalLink(playbook.commercial_proposal_link || "");
      setAgencyProcesses(playbook.agency_processes || "");
      setDriveLink(playbook.drive_link || "");
      setLogins(playbook.logins || []);
      setCultureAndValues(playbook.culture_and_values || "");
      // Inicialização de estados de onboarding removida
    }
  }, [playbook, isOpen]);

  const handleSave = useCallback(() => {
    onSave({
      briefings,
      ai_agents: aiAgents,
      useful_links: usefulLinks,
      commercial_proposal_link: commercialProposalLink,
      agency_processes: agencyProcesses,
      drive_link: driveLink,
      logins: logins,
      culture_and_values: cultureAndValues,
      // Salvamento de campos de onboarding removido
    });
  }, [briefings, aiAgents, usefulLinks, commercialProposalLink, agencyProcesses, driveLink, logins, cultureAndValues, onSave]);

  const addBriefing = useCallback(() => setBriefings(prev => [...prev, { name: "", url: "" }]), []);
  const updateBriefing = useCallback((index: number, field: 'name' | 'url', value: string) => {
    setBriefings(prev => {
      const newBriefings = [...prev];
      newBriefings[index][field] = value;
      return newBriefings;
    });
  }, []);
  const removeBriefing = useCallback((index: number) => setBriefings(prev => prev.filter((_, i) => i !== index)), []);

  const addAiAgent = useCallback(() => setAiAgents(prev => [...prev, { name: "", url: "" }]), []);
  const updateAiAgent = useCallback((index: number, field: 'name' | 'url', value: string) => {
    setAiAgents(prev => {
      const newAgents = [...prev];
      newAgents[index][field] = value;
      return newAgents;
    });
  }, []);
  const removeAiAgent = useCallback((index: number) => setAiAgents(prev => prev.filter((_, i) => i !== index)), []);

  const addUsefulLink = useCallback(() => setUsefulLinks(prev => [...prev, { name: "", url: "" }]), []);
  const updateUsefulLink = useCallback((index: number, field: 'name' | 'url', value: string) => {
    setUsefulLinks(prev => {
      const newLinks = [...prev];
      newLinks[index][field] = value;
      return newLinks;
    });
  }, []);
  const removeUsefulLink = useCallback((index: number) => setUsefulLinks(prev => prev.filter((_, i) => i !== index)), []);

  const addLogin = useCallback(() => setLogins(prev => [...prev, { platform: "", username: "", password: "" }]), []);
  const updateLogin = useCallback((index: number, field: 'platform' | 'username' | 'password', value: string) => {
    setLogins(prev => {
      const newLogins = [...prev];
      newLogins[index][field] = value;
      return newLogins;
    });
  }, []);
  const removeLogin = useCallback((index: number) => setLogins(prev => prev.filter((_, i) => i !== index)), []);

  // Funções para onboarding briefing links removidas
  // Funções para onboarding tutorial videos removidas

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Playbook da Agência</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="links" className="py-4">
          <TabsList className="grid w-full grid-cols-4"> {/* Atualizado para 4 colunas */}
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="processes">Processos</TabsTrigger>
            <TabsTrigger value="logins">Logins</TabsTrigger>
            <TabsTrigger value="culture">Cultura</TabsTrigger>
          </TabsList>
          <TabsContent value="links" className="pt-4 space-y-6 p-4 sm:p-6"> {/* Ajustado padding */}
            <div>
              <Label className="text-lg font-semibold">Briefings</Label>
              {briefings.map((link, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input placeholder="Nome do Briefing" value={link.name} onChange={(e) => updateBriefing(index, 'name', e.target.value)} />
                  <Input placeholder="URL" value={link.url} onChange={(e) => updateBriefing(index, 'url', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeBriefing(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addBriefing} className="mt-2">Adicionar Link de Briefing</Button>
            </div>
            <div>
              <Label className="text-lg font-semibold">Agentes de IA</Label>
              {aiAgents.map((link, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input placeholder="Nome do Agente" value={link.name} onChange={(e) => updateAiAgent(index, 'name', e.target.value)} />
                  <Input placeholder="URL" value={link.url} onChange={(e) => updateAiAgent(index, 'url', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeAiAgent(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addAiAgent} className="mt-2">Adicionar Link de Agente</Button>
            </div>
            <div>
              <Label className="text-lg font-semibold">Links Úteis</Label>
              {usefulLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input placeholder="Nome (Ex: Modelo de Contrato)" value={link.name} onChange={(e) => updateUsefulLink(index, 'name', e.target.value)} />
                  <Input placeholder="URL" value={link.url} onChange={(e) => updateUsefulLink(index, 'url', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeUsefulLink(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addUsefulLink} className="mt-2">Adicionar Link Útil</Button>
            </div>
            <div className="border-t pt-6">
              <Label htmlFor="commercial-proposal-link">Link da Proposta Comercial</Label>
              <Input id="commercial-proposal-link" value={commercialProposalLink} onChange={(e) => setCommercialProposalLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="drive-link">Link para o Drive (Nextcloud)</Label>
              <Input id="drive-link" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://..." />
            </div>
          </TabsContent>
          <TabsContent value="processes" className="pt-4 p-4 sm:p-6"> {/* Ajustado padding */}
            <Label htmlFor="agency-processes">Processos da Agência (Passo a passo) (suporta Markdown)</Label>
            <Textarea id="agency-processes" value={agencyProcesses} onChange={(e) => setAgencyProcesses(e.target.value)} rows={15} />
            <p className="text-xs text-muted-foreground">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)`.</p>
          </TabsContent>
          <TabsContent value="logins" className="pt-4 space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
            <Label>Logins de IAs e Plataformas</Label>
            {logins.map((login, index) => (
              <div key={index} className="grid grid-cols-3 items-center gap-2">
                <Input placeholder="Plataforma (Ex: ChatGPT)" value={login.platform} onChange={(e) => updateLogin(index, 'platform', e.target.value)} />
                <Input placeholder="Usuário" value={login.username} onChange={(e) => updateLogin(index, 'username', e.target.value)} />
                <div className="flex items-center gap-2">
                  <Input placeholder="Senha" type="password" value={login.password} onChange={(e) => updateLogin(index, 'password', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeLogin(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addLogin}>Adicionar Login</Button>
          </TabsContent>
          <TabsContent value="culture" className="pt-4 p-4 sm:p-6"> {/* Ajustado padding */}
            <Label htmlFor="culture-and-values">Cultura e Valores da Agência (suporta Markdown)</Label>
            <Textarea id="culture-and-values" value={cultureAndValues} onChange={(e) => setCultureAndValues(e.target.value)} rows={15} />
            <p className="text-xs text-muted-foreground">Use **negrito**, *itálico*, [links](url) e imagens `![alt](url)`.</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
          <Button type="button" onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}