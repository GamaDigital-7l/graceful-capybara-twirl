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
import { showError } from "@/utils/toast";

export interface SecondBrainClient {
  id?: string;
  name: string;
  created_by?: string;
}

interface SecondBrainClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Partial<SecondBrainClient>) => Promise<void>;
  existingClient: SecondBrainClient | null;
}

export function SecondBrainClientModal({
  isOpen,
  onClose,
  onSave,
  existingClient,
}: SecondBrainClientModalProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingClient) {
      setName(existingClient.name);
    } else {
      setName("");
    }
  }, [existingClient, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      showError("O nome do cliente é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          id: existingClient?.id,
          name: name.trim(),
          created_by: existingClient?.created_by,
        }
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
        <div className="py-4 space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
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