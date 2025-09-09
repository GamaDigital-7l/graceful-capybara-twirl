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
import { Trash2 } from "lucide-react";

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
  }, [task, isOpen]);

  const handleSave = () => {
    const savedTask: Task = {
      id: task?.id || new Date().getTime().toString(),
      columnId: task?.columnId || columnId || "todo",
      title: title || "Nova Tarefa",
      description: description,
      actionType: actionType,
      attachments: attachmentUrl
        ? [{ id: "1", url: attachmentUrl, isCover: true }]
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
            <Label htmlFor="attachment">URL da Imagem de Capa</Label>
            <Input
              id="attachment"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.png"
            />
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
                <SelectItem value="approve">Aprovar Job</SelectItem>
                <SelectItem value="edit">Solicitar Edição</SelectItem>
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
            <Button type="button" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}