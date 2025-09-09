"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
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
import { Upload } from "lucide-react";
import { Workspace } from "@/pages/Dashboard"; // Re-using the interface

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
}

export function WorkspaceSettingsModal({
  isOpen,
  onClose,
  workspace,
}: WorkspaceSettingsModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
    }
    setSelectedFile(null);
  }, [workspace, isOpen]);

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (updatedData: Partial<Workspace>) => {
      if (!workspace) throw new Error("Workspace não selecionado.");
      const { error } = await supabase
        .from("workspaces")
        .update(updatedData)
        .eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      showSuccess("Workspace atualizado!");
      onClose();
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleSave = async () => {
    if (!workspace) return;

    let logoUrl = workspace.logo_url;

    if (selectedFile) {
      setIsUploading(true);
      const filePath = `${workspace.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("workspace-logos")
        .upload(filePath, selectedFile);

      if (uploadError) {
        showError("Erro ao enviar a logo.");
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("workspace-logos")
        .getPublicUrl(filePath);
      logoUrl = publicUrlData.publicUrl;
      setIsUploading(false);
    }

    updateWorkspaceMutation.mutate({ name, logo_url: logoUrl });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações do Workspace</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome do Cliente</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
                  <Input
                    id="logo-upload"
                    type="file"
                    className="sr-only"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                </Label>
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isUploading || updateWorkspaceMutation.isPending}>
            {isUploading ? "Enviando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}