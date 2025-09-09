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
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export interface SecondBrainClient {
  id?: string;
  name: string;
  photo_url?: string | null;
  created_by?: string;
}

interface SecondBrainClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Partial<SecondBrainClient>) => void;
  existingClient: SecondBrainClient | null;
}

export function SecondBrainClientModal({
  isOpen,
  onClose,
  onSave,
  existingClient,
}: SecondBrainClientModalProps) {
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (existingClient) {
      setName(existingClient.name);
      setPhotoPreviewUrl(existingClient.photo_url || null);
    } else {
      setName("");
      setPhotoPreviewUrl(null);
    }
    setSelectedFile(null);
  }, [existingClient, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setPhotoPreviewUrl(URL.createObjectURL(event.target.files[0]));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError("O nome do cliente é obrigatório.");
      return;
    }

    let finalPhotoUrl = existingClient?.photo_url || null;

    if (selectedFile) {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Você precisa estar logado para enviar imagens.");
        setIsUploading(false);
        return;
      }

      const filePath = `second-brain-client-photos/${existingClient?.id || Date.now()}_${selectedFile.name}`;
      const { data, error } = await supabase.storage
        .from("second-brain-assets")
        .upload(filePath, selectedFile, { upsert: true });

      if (error) {
        showError("Erro ao enviar a foto. Tente novamente.");
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("second-brain-assets")
        .getPublicUrl(data.path);

      finalPhotoUrl = publicUrlData.publicUrl;
      setIsUploading(false);
    }

    onSave({
      id: existingClient?.id,
      name: name.trim(),
      photo_url: finalPhotoUrl,
      created_by: existingClient?.created_by,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingClient ? "Editar Cliente" : "Adicionar Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nome do Cliente</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cliente XYZ"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-photo">Foto do Cliente</Label>
            {photoPreviewUrl && (
              <div className="mb-2">
                <img src={photoPreviewUrl} alt="Preview" className="h-24 w-24 object-cover rounded-full" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-grow p-2 border rounded-md h-10 text-sm truncate">
                {selectedFile ? selectedFile.name : (photoPreviewUrl ? "Foto existente" : "Nenhum arquivo selecionado")}
              </div>
              <Button asChild variant="outline">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar
                  <Input
                    id="photo-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
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
          <Button type="button" onClick={handleSave} disabled={isUploading}>
            {isUploading ? "Enviando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}