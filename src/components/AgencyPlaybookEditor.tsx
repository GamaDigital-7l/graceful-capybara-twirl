"use client";

import { useState, useEffect } from "react";
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
  briefings_link: string | null;
  ai_agents_link: string | null;
  useful_links: { name: string; url: string }[];
  commercial_proposal_link: string | null;
  agency_processes: string | null;
  drive_link: string | null;
  logins: { platform: string; username: string; password?: string }[];
  culture_and_values: string | null;
}

interface AgencyPlaybookEditorProps {
  isOpen: boolean;
  onClose: () => void;
  playbook: AgencyPlaybook;
  onSave: (data: Partial<AgencyPlaybook>) => void;
}

export function AgencyPlaybookEditor({ isOpen, onClose, playbook, onSave }: AgencyPlaybookEditorProps) {
  const [briefingsLink, setBriefingsLink] = useState("");
  const [aiAgentsLink, setAiAgentsLink] = useState("");
  const [usefulLinks, setUsefulLinks] = useState<{ name: string; url: string }[]>([]);
  const [commercialProposalLink, setCommercialProposalLink] = useState("");
  const [agencyProcesses, setAgencyProcesses] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [logins, setLogins] = useState<{ platform: string; username: string; password?: string }[]>([]);
  const [cultureAndValues, setCultureAndValues] = useState("");

  useEffect(() => {
    if (playbook) {
      setBriefingsLink(playbook.briefings_link || "");
      setAiAgentsLink(playbook.ai_agents_link || "");
      setUsefulLinks(playbook.useful_links || []);
      setCommercialProposalLink(playbook.commercial_proposal_link || "");
      setAgencyProcesses(playbook.agency_processes || "");
      setDriveLink(playbook.drive_link || "");
      setLogins(playbook.logins || []);
      setCultureAndValues(playbook.culture_and_values || "");
    }
  }, [playbook, isOpen]);

  const handleSave = () => {
    onSave({
      briefings_link: briefingsLink,
      ai_agents_link: aiAgentsLink,
      useful_links: usefulLinks,
      commercial_proposal_link: commercialProposalLink,
      agency_processes: agencyProcesses,
      drive_link: driveLink,
      logins: logins,
      culture_and_values: cultureAndValues,
    });
  };

  const addUsefulLink = () => setUsefulLinks([...usefulLinks, { name: "", url: "" }]);
  const updateUsefulLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...usefulLinks];
    newLinks[index][field] = value;
    setUsefulLinks(newLinks);
  };
  const removeUsefulLink = (index: number) => setUsefulLinks(usefulLinks.filter((_, i) => i !== index));

  const addLogin = () => setLogins([...logins, { platform: "", username: "", password: "" }]);
  const updateLogin = (index: number, field: 'platform' | 'username' | 'password', value: string) => {
    const newLogins = [...logins];
    newLogins[index][field] = value;
    setLogins(newLogins);
  };
  const removeLogin = (index: number) => setLogins(logins.filter((_, i) => i !== index));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Playbook da Agência</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="briefings" className="py-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="briefings">Links</TabsTrigger>
            <TabsTrigger value="processes">Processos</TabsTrigger>
            <TabsTrigger value="logins">Logins</TabsTrigger>
            <TabsTrigger value="culture">Cultura</TabsTrigger>
          </TabsList>
          <TabsContent value="briefings" className="pt-4 space-y-4">
            <div>
              <Label htmlFor="briefings-link">Link dos Briefings</Label>
              <Input id="briefings-link" value={briefingsLink} onChange={(e) => setBriefingsLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="ai-agents-link">Link dos Agentes de IA</Label>
              <Input id="ai-agents-link" value={aiAgentsLink} onChange={(e) => setAiAgentsLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="commercial-proposal-link">Link da Proposta Comercial</Label>
              <Input id="commercial-proposal-link" value={commercialProposalLink} onChange={(e) => setCommercialProposalLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="drive-link">Link para o Drive (Nextcloud)</Label>
              <Input id="drive-link" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://..." />
            </div>
            <Label>Links Úteis (Documentos, Contratos)</Label>
            {usefulLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input placeholder="Nome (Ex: Modelo de Contrato)" value={link.name} onChange={(e) => updateUsefulLink(index, 'name', e.target.value)} />
                <Input placeholder="URL" value={link.url} onChange={(e) => updateUsefulLink(index, 'url', e.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => removeUsefulLink(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={addUsefulLink}>Adicionar Link Útil</Button>
          </TabsContent>
          <TabsContent value="processes" className="pt-4">
            <Label htmlFor="agency-processes">Processos da Agência (Passo a passo)</Label>
            <Textarea id="agency-processes" value={agencyProcesses} onChange={(e) => setAgencyProcesses(e.target.value)} rows={15} />
          </TabsContent>
          <TabsContent value="logins" className="pt-4 space-y-4">
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
          <TabsContent value="culture" className="pt-4">
            <Label htmlFor="culture-and-values">Cultura e Valores da Agência</Label>
            <Textarea id="culture-and-values" value={cultureAndValues} onChange={(e) => setCultureAndValues(e.target.value)} rows={15} />
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