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
  briefings: { name: string; url: string }[];
  ai_agents: { name: string; url: string }[];
  useful_links: { name: string; url: string }[];
  commercial_proposal_link: string | null;
  agency_processes: string | null;
  drive_link: string | null;
  logins: { platform: string; username: string; password?: string }[];
  culture_and_values: string | null;
  // Novos campos para onboarding
  onboarding_welcome_message: string | null;
  onboarding_briefing_links: { name: string; url: string }[];
  onboarding_apps_access_info: string | null;
  onboarding_tutorial_videos: { name: string; url: string }[];
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
  // Novos estados para onboarding
  const [onboardingWelcomeMessage, setOnboardingWelcomeMessage] = useState("");
  const [onboardingBriefingLinks, setOnboardingBriefingLinks] = useState<{ name: string; url: string }[]>([]);
  const [onboardingAppsAccessInfo, setOnboardingAppsAccessInfo] = useState("");
  const [onboardingTutorialVideos, setOnboardingTutorialVideos] = useState<{ name: string; url: string }[]>([]);


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
      // Inicializar novos estados de onboarding
      setOnboardingWelcomeMessage(playbook.onboarding_welcome_message || "");
      setOnboardingBriefingLinks(playbook.onboarding_briefing_links || []);
      setOnboardingAppsAccessInfo(playbook.onboarding_apps_access_info || "");
      setOnboardingTutorialVideos(playbook.onboarding_tutorial_videos || []);
    }
  }, [playbook, isOpen]);

  const handleSave = () => {
    onSave({
      briefings,
      ai_agents: aiAgents,
      useful_links: usefulLinks,
      commercial_proposal_link: commercialProposalLink,
      agency_processes: agencyProcesses,
      drive_link: driveLink,
      logins: logins,
      culture_and_values: cultureAndValues,
      // Salvar novos campos de onboarding
      onboarding_welcome_message: onboardingWelcomeMessage,
      onboarding_briefing_links: onboardingBriefingLinks,
      onboarding_apps_access_info: onboardingAppsAccessInfo,
      onboarding_tutorial_videos: onboardingTutorialVideos,
    });
  };

  const addBriefing = () => setBriefings([...briefings, { name: "", url: "" }]);
  const updateBriefing = (index: number, field: 'name' | 'url', value: string) => {
    const newBriefings = [...briefings];
    newBriefings[index][field] = value;
    setBriefings(newBriefings);
  };
  const removeBriefing = (index: number) => setBriefings(briefings.filter((_, i) => i !== index));

  const addAiAgent = () => setAiAgents([...aiAgents, { name: "", url: "" }]);
  const updateAiAgent = (index: number, field: 'name' | 'url', value: string) => {
    const newAgents = [...aiAgents];
    newAgents[index][field] = value;
    setAiAgents(newAgents);
  };
  const removeAiAgent = (index: number) => setAiAgents(aiAgents.filter((_, i) => i !== index));

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

  // Novas funções para onboarding briefing links
  const addOnboardingBriefingLink = () => setOnboardingBriefingLinks([...onboardingBriefingLinks, { name: "", url: "" }]);
  const updateOnboardingBriefingLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...onboardingBriefingLinks];
    newLinks[index][field] = value;
    setOnboardingBriefingLinks(newLinks);
  };
  const removeOnboardingBriefingLink = (index: number) => setOnboardingBriefingLinks(onboardingBriefingLinks.filter((_, i) => i !== index));

  // Novas funções para onboarding tutorial videos
  const addOnboardingTutorialVideo = () => setOnboardingTutorialVideos([...onboardingTutorialVideos, { name: "", url: "" }]);
  const updateOnboardingTutorialVideo = (index: number, field: 'name' | 'url', value: string) => {
    const newVideos = [...onboardingTutorialVideos];
    newVideos[index][field] = value;
    setOnboardingTutorialVideos(newVideos);
  };
  const removeOnboardingTutorialVideo = (index: number) => setOnboardingTutorialVideos(onboardingTutorialVideos.filter((_, i) => i !== index));


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Playbook da Agência</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="links" className="py-4">
          <TabsList className="grid w-full grid-cols-5"> {/* Atualizado para 5 colunas */}
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="processes">Processos</TabsTrigger>
            <TabsTrigger value="logins">Logins</TabsTrigger>
            <TabsTrigger value="culture">Cultura</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger> {/* Nova aba */}
          </TabsList>
          <TabsContent value="links" className="pt-4 space-y-6">
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
          {/* Nova aba de Onboarding */}
          <TabsContent value="onboarding" className="pt-4 space-y-6">
            <div>
              <Label className="text-lg font-semibold">Mensagem de Boas-Vindas</Label>
              <Textarea id="onboarding-welcome-message" value={onboardingWelcomeMessage} onChange={(e) => setOnboardingWelcomeMessage(e.target.value)} rows={5} placeholder="Ex: Olá [Nome do Cliente], seja bem-vindo(a) à Gama Creative..." />
            </div>
            <div>
              <Label className="text-lg font-semibold">Links de Briefings para Onboarding</Label>
              {onboardingBriefingLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input placeholder="Nome do Briefing" value={link.name} onChange={(e) => updateOnboardingBriefingLink(index, 'name', e.target.value)} />
                  <Input placeholder="URL" value={link.url} onChange={(e) => updateOnboardingBriefingLink(index, 'url', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeOnboardingBriefingLink(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addOnboardingBriefingLink} className="mt-2">Adicionar Link de Briefing</Button>
            </div>
            <div>
              <Label className="text-lg font-semibold">Informações de Acesso aos Apps</Label>
              <Textarea id="onboarding-apps-access-info" value={onboardingAppsAccessInfo} onChange={(e) => setOnboardingAppsAccessInfo(e.target.value)} rows={5} placeholder="Ex: Para acessar nosso Kanban, use o link..." />
            </div>
            <div>
              <Label className="text-lg font-semibold">Vídeos Tutoriais</Label>
              {onboardingTutorialVideos.map((video, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <Input placeholder="Título do Vídeo" value={video.name} onChange={(e) => updateOnboardingTutorialVideo(index, 'name', e.target.value)} />
                  <Input placeholder="URL do YouTube/Vimeo" value={video.url} onChange={(e) => updateOnboardingTutorialVideo(index, 'url', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeOnboardingTutorialVideo(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addOnboardingTutorialVideo} className="mt-2">Adicionar Vídeo Tutorial</Button>
            </div>
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