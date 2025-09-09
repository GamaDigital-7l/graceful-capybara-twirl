"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, UserPlus } from "lucide-react";
import { Workspace } from "@/pages/Dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
}

const fetchUsers = async () => {
  const { data, error } = await supabase.functions.invoke("list-users");
  if (error) throw error;
  return data;
};

export function WorkspaceSettingsModal({ isOpen, onClose, workspace }: WorkspaceSettingsModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: allUsers } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["workspaceMembers", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspace.id);
      if (error) throw error;
      return data.map(m => m.user_id);
    },
    enabled: !!workspace,
  });

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      refetchMembers();
    }
    setSelectedFile(null);
    setSelectedUserId(null);
  }, [workspace, isOpen, refetchMembers]);

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (updatedData: Partial<Workspace>) => {
      if (!workspace) throw new Error("Workspace não selecionado.");
      const { error } = await supabase.from("workspaces").update(updatedData).eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      showSuccess("Workspace atualizado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace não selecionado.");
      const { error } = await supabase.from("workspaces").delete().eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      showSuccess("Workspace deletado com sucesso!");
      onClose();
    },
    onError: (e: Error) => showError(e.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!workspace) throw new Error("Workspace não selecionado.");
      const { error } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: userId, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Membro adicionado!");
      refetchMembers();
      setSelectedUserId(null);
    },
    onError: (e: Error) => showError(`Erro ao adicionar membro: ${e.message}`),
  });

  const handleSave = async () => {
    if (!workspace) return;
    let logoUrl = workspace.logo_url;
    if (selectedFile) {
      setIsUploading(true);
      const filePath = `${workspace.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("workspace-logos").upload(filePath, selectedFile);
      if (uploadError) {
        showError("Erro ao enviar a logo.");
        setIsUploading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("workspace-logos").getPublicUrl(filePath);
      logoUrl = publicUrlData.publicUrl;
      setIsUploading(false);
    }
    updateWorkspaceMutation.mutate({ name, logo_url: logoUrl });
  };

  const availableUsers = allUsers?.filter((user: any) => !members?.includes(user.id)) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações do Workspace</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="danger">Zona de Perigo</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nome do Cliente</Label>
              <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Logo do Cliente</Label>
              <div className="flex items-center gap-2">
                <div className="flex-grow p-2 border rounded-md h-10 text-sm truncate">
                  {selectedFile ? selectedFile.name : "Nenhum arquivo selecionado"}
                </div>
                <Button asChild variant="outline">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar
                    <Input id="logo-upload" type="file" className="sr-only" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} accept="image/*" />
                  </Label>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onClose} variant="secondary">Fechar</Button>
              <Button onClick={handleSave} disabled={isUploading || updateWorkspaceMutation.isPending}>
                {isUploading ? "Enviando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="members" className="py-4 space-y-4">
            <Label>Adicionar Membro ao Workspace</Label>
            <div className="flex items-center gap-2">
              <Select onValueChange={setSelectedUserId} value={selectedUserId || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name || user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => selectedUserId && addMemberMutation.mutate(selectedUserId)} disabled={!selectedUserId || addMemberMutation.isPending}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            <Label>Membros Atuais</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allUsers?.filter((user: any) => members?.includes(user.id)).map((member: any) => (
                <div key={member.id} className="flex items-center gap-2 text-sm p-2 border rounded">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>{member.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span>{member.full_name || member.email}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="danger" className="py-4 space-y-4">
            <Label className="font-bold text-destructive">Deletar Workspace</Label>
            <p className="text-sm text-muted-foreground">Esta ação é irreversível. Todo o conteúdo, tarefas e configurações deste workspace serão permanentemente apagados.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar este Workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá deletar permanentemente o workspace "{workspace?.name}" e todos os seus dados. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteWorkspaceMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                    Sim, deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}