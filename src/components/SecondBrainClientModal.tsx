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
  onSave: (client: Partial<SecondBrainClient>) => Promise<void>; // onSave now returns a Promise
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
  const [isSaving, setIsSaving] = useState(false);

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

    setIsSaving(true);
    let finalPhotoUrl = existingClient?.photo_url || null;
    let clientIdToUse = existingClient?.id;
    let createdByToUse = existingClient?.created_by;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Você precisa estar logado para realizar esta ação.");
        setIsSaving(false);
        return;
      }
      createdByToUse = user.id; // Ensure created_by is always the current user for new clients or updates

      // If it's a new client and has a file, we need to create the client first to get an ID
      if (!existingClient && selectedFile) {
        const { data: newClientData, error: createError } = await supabase
          .from("second_brain_clients")
          .insert({ name: name.trim(), created_by: user.id })
          .select("id")
          .single();

        if (createError) throw createError;
        clientIdToUse = newClientData.id;
        showSuccess("Cliente criado com sucesso!");
      }

      if (selectedFile && clientIdToUse) {
        setIsUploading(true);
        const filePath = `second-brain-client-photos/${clientIdToUse}/${Date.now()}_${selectedFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from("second-brain-assets")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("second-brain-assets")
          .getPublicUrl(data.path);

        finalPhotoUrl = publicUrlData.publicUrl;
        setIsUploading(false);
      }

      // Now call onSave with the complete data
      await onSave({
        id: clientIdToUse, // Use the new ID if created, otherwise existing
        name: name.trim(),
        photo_url: finalPhotoUrl,
        created_by: createdByToUse,
      });

      onClose(); // Close only after all operations are successful
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      showError(`Erro ao salvar cliente: ${error.message}`);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const isDisabled = isUploading || isSaving;

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
              disabled={isDisabled}
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
              <Button asChild variant="outline" disabled={isDisabled}>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar
                  <Input
                    id="photo-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept="image/*"
                    disabled={isDisabled}
                  />
                </Label>
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isDisabled}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isDisabled}>
            {isSaving ? "Salvando..." : (isUploading ? "Enviando..." : "Salvar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}