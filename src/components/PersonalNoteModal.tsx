"use client";

import { useState, useEffect, useCallback } from "react";
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
import { showError } from "@/utils/toast";

export interface PersonalNote {
  id?: string;
  user_id?: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

interface PersonalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<PersonalNote>) => void;
  existingNote: PersonalNote | null;
}

export function PersonalNoteModal({
  isOpen,
  onClose,
  onSave,
  existingNote,
}: PersonalNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [existingNote, isOpen]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      showError("Título e conteúdo são obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          id: existingNote?.id,
          title: title.trim(),
          content: content.trim(),
        }
      );
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar nota:", error);
      showError(`Erro ao salvar nota: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, existingNote, onSave, onClose]);

  const isDisabled = isSaving;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingNote ? "Editar Nota Pessoal" : "Adicionar Nova Nota Pessoal"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="note-title">Título da Nota</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ideias para o novo projeto"
              disabled={isDisabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-content">Conteúdo da Nota</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva suas anotações aqui..."
              rows={10}
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