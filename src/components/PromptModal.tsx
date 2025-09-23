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
import { Textarea } from "@/components/ui/textarea";

export interface Prompt {
  id?: string;
  second_brain_client_id: string;
  title: string;
  content: string;
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: Partial<Prompt>) => void;
  existingPrompt: Prompt | null;
  clientId: string;
}

export function PromptModal({
  isOpen,
  onClose,
  onSave,
  existingPrompt,
  clientId,
}: PromptModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (existingPrompt) {
      setTitle(existingPrompt.title);
      setContent(existingPrompt.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [existingPrompt, isOpen]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      // Optionally show an error toast
      return;
    }
    onSave({
      id: existingPrompt?.id,
      second_brain_client_id: clientId,
      title: title.trim(),
      content: content.trim(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingPrompt ? "Editar Prompt" : "Adicionar Novo Prompt"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
          <div className="space-y-2">
            <Label htmlFor="prompt-title">Título do Prompt</Label>
            <Input
              id="prompt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Prompt para Geração de Ideias"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-content">Conteúdo do Prompt</Label>
            <Textarea
              id="prompt-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole o texto do prompt aqui..."
              rows={10}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}