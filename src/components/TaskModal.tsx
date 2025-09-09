"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, TaskActionType } from "./KanbanCard";
import { useState, useEffect } from "react";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  task: Task | null;
  columnId?: string;
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  columnId,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [actionType, setActionType] = useState<TaskActionType>("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAttachmentUrl(task.attachments?.[0]?.url || "");
      setActionType(task.actionType || "none");
    } else {
      setTitle("");
      setDescription("");
      setAttachmentUrl("");
      setActionType("none");
    }
    setSelectedFile(null);
  }, [task, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSave = async () => {
    let finalAttachmentUrl = attachmentUrl;

    if (selectedFile) {
      setIsUploading(true);
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(fileName, selectedFile);

      if (error) {
        showError("Erro ao enviar a imagem. Tente novamente.");
        console.error("Upload error:", error.message);
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(data.path);
      
      finalAttachmentUrl = publicUrlData.publicUrl;
      showSuccess("Imagem enviada com sucesso!");
      setIsUploading(false);
    }

    const savedTask: Task = {
      id: task?.id || new Date().getTime().toString(),
      columnId: task?.columnId || columnId || "todo",
      title: title || "Nova Tarefa",
      description: description,
      actionType: actionType,
      attachments: finalAttachmentUrl
        ? [{ id: "1", url: finalAttachmentUrl, isCover: true }]
        : [],
    };
    onSave(savedTask);
    onClose();
  };

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Criar Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Desenvolver a nova landing page"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione mais detalhes sobre a tarefa..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachment">Imagem de Capa</Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachment-url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="Ou cole uma URL de imagem aqui"
                className="flex-grow"
              />
              <Button asChild variant="outline" size="icon">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <Input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </Label>
              </Button>
            </div>
            {selectedFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {selectedFile.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="actionType">Ação do Card</Label>
            <Select
              value={actionType}
              onValueChange={(value) => setActionType(value as TaskActionType)}
            >
              <SelectTrigger id="actionType">
                <SelectValue placeholder="Selecione uma ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="review">Revisão do Cliente (Aprovar/Editar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="justify-between">
          <div>
            {task && onDelete && (
              <Button variant="destructive" onClick={handleDelete} size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-x-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave} disabled={isUploading}>
              {isUploading ? "Enviando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}