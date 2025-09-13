import { useState, useEffect } from "react";
import { Playbook } from "@/pages/Playbook";
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
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface PlaybookEditorProps {
  isOpen: boolean;
  onClose: () => void;
  playbook: Playbook;
  onSave: (data: Partial<Playbook>) => void;
}

export function PlaybookEditor({ isOpen, onClose, playbook, onSave }: PlaybookEditorProps) {
  const [briefing, setBriefing] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [assetLinks, setAssetLinks] = useState<{ name: string; url: string }[]>([]);
  const [socialLogins, setSocialLogins] = useState<{ platform: string; username: string; password?: string }[]>([]);
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (playbook) {
      setBriefing(playbook.briefing || "");
      setContractUrl(playbook.contract_url || "");
      setAssetLinks(playbook.asset_links || []);
      setSocialLogins(playbook.social_media_logins || []);
      setDocuments(playbook.documents || []);
    }
  }, [playbook, isOpen]);

  const handleSave = () => {
    onSave({
      briefing,
      contract_url: contractUrl,
      asset_links: assetLinks,
      social_media_logins: socialLogins,
      documents: documents,
    });
  };

  const addAssetLink = () => setAssetLinks([...assetLinks, { name: "", url: "" }]);
  const updateAssetLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...assetLinks];
    newLinks[index][field] = value;
    setAssetLinks(newLinks);
  };
  const removeAssetLink = (index: number) => setAssetLinks(assetLinks.filter((_, i) => i !== index));

  const addSocialLogin = () => setSocialLogins([...socialLogins, { platform: "", username: "", password: "" }]);
  const updateSocialLogin = (index: number, field: 'platform' | 'username' | 'password', value: string) => {
    const newLogins = [...socialLogins];
    newLogins[index][field] = value;
    setSocialLogins(newLogins);
  };
  const removeSocialLogin = (index: number) => setSocialLogins(socialLogins.filter((_, i) => i !== index));

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const filePath = `${playbook.workspace_id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("playbook-documents")
      .upload(filePath, file);

    if (error) {
      showError("Erro ao enviar o documento.");
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("playbook-documents")
      .getPublicUrl(data.path);
    
    setDocuments([...documents, { name: file.name, url: publicUrlData.publicUrl }]);
    showSuccess("Documento enviado!");
    setIsUploading(false);
  };

  const removeDocument = (index: number) => setDocuments(documents.filter((_, i) => i !== index));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Playbook</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="assets" className="py-4">
          <TabsList>
            <TabsTrigger value="assets">Ativos e Links</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="logins">Logins</TabsTrigger>
            <TabsTrigger value="briefing">Briefing</TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="pt-4 space-y-4">
            <div>
              <Label htmlFor="contract">URL do Contrato</Label>
              <Input id="contract" value={contractUrl} onChange={(e) => setContractUrl(e.target.value)} placeholder="https://..." />
            </div>
            <Label>Links de Materiais</Label>
            {assetLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input placeholder="Nome (Ex: Logo)" value={link.name} onChange={(e) => updateAssetLink(index, 'name', e.target.value)} />
                <Input placeholder="URL" value={link.url} onChange={(e) => updateAssetLink(index, 'url', e.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => removeAssetLink(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={addAssetLink}>Adicionar Link</Button>
          </TabsContent>
          <TabsContent value="documents" className="pt-4 space-y-4">
            <Label>Documentos Anexados</Label>
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">{doc.name}</a>
                <Button variant="ghost" size="icon" onClick={() => removeDocument(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button asChild variant="outline">
              <Label className="cursor-pointer">
                {isUploading ? "Enviando..." : "Adicionar Documento"}
                <Input type="file" className="sr-only" onChange={handleFileUpload} disabled={isUploading} />
              </Label>
            </Button>
          </TabsContent>
          <TabsContent value="logins" className="pt-4 space-y-4">
            <Label>Logins de Redes Sociais</Label>
            {socialLogins.map((login, index) => (
              <div key={index} className="grid grid-cols-3 items-center gap-2">
                <Input placeholder="Plataforma (Ex: Instagram)" value={login.platform} onChange={(e) => updateSocialLogin(index, 'platform', e.target.value)} />
                <Input placeholder="Usuário" value={login.username} onChange={(e) => updateSocialLogin(index, 'username', e.target.value)} />
                <div className="flex items-center gap-2">
                  <Input placeholder="Senha" type="password" value={login.password} onChange={(e) => updateSocialLogin(index, 'password', e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeSocialLogin(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addSocialLogin}>Adicionar Login</Button>
          </TabsContent>
          <TabsContent value="briefing" className="pt-4">
            <Label htmlFor="briefing">Conteúdo do Briefing</Label>
            <Textarea id="briefing" value={briefing} onChange={(e) => setBriefing(e.target.value)} rows={15} />
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