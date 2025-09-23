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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Task } from "./KanbanCard";

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string, comment: string, targetColumnId: string) => void;
  task: (Task & { columnId: string }) | null;
}

export function EditRequestModal({
  isOpen,
  onClose,
  onConfirm,
  task,
}: EditRequestModalProps) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setComment("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (task && comment.trim()) {
      onConfirm(task.id, comment.trim(), task.columnId);
      onClose();
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Edição para: {task.title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 p-4 sm:p-6"> {/* Ajustado padding */}
          <Label htmlFor="comment">Adicionar Comentário de Edição</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Por favor, altere a imagem de capa e ajuste o texto principal."
            rows={4}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!comment.trim()}
          >
            Enviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}