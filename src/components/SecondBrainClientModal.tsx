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
import { showError } from "@/utils/toast";

export interface SecondBrainClient {
  id?: string;
  name: string;
  photo_url?: string | null;
  created_by?: string;
}

interface SecondBrainClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onSave agora recebe o cliente e o arquivo de foto
  onSave: (client: Partial<SecondBrainClient>, file: File | null) => Promise<void>;
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
    try {
      // Passa o cliente e o arquivo para a função onSave do componente pai
      await onSave(
        {
          id: existingClient?.id,
          name: name.trim(),
          photo_url: existingClient?.photo_url, // Mantém o URL existente, a mutação no pai irá sobrescrever se houver novo arquivo
          created_by: existingClient?.created_by, // Mantém o criador existente, a mutação no pai irá definir para novos
        },
        selectedFile
      );
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      showError(`Erro ao salvar cliente: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = isSaving;

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
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}