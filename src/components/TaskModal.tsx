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
import { Task, TaskActionType, Comment } from "./KanbanCard";
import { useState, useEffect } from "react";
import { Trash2, Upload, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAttachmentUrl(task.attachments?.[0]?.url || "");
      setActionType(task.actionType || "none");
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setComments(task.comments || []);
    } else {
      setTitle("");
      setDescription("");
      setAttachmentUrl("");
      setActionType("none");
      setDueDate(undefined);
      setComments([]);
    }
    setSelectedFile(null);
    setNewComment("");
  }, [task, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: new Date().getTime().toString(),
      text: newComment.trim(),
      author: "Usuário", // Placeholder for user
      createdAt: new Date().toISOString(),
    };
    setComments([...comments, comment]);
    setNewComment("");
  };

  const handleSave = async () => {
    let finalAttachmentUrl = attachmentUrl;

    if (selectedFile) {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Você precisa estar logado para enviar imagens.");
        setIsUploading(false);
        return;
      }

      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(filePath, selectedFile);

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
      dueDate: dueDate?.toISOString(),
      comments: comments,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Criar Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
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
                rows={5}
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
                    <Input
                      id="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </Label>
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? (
                      format(dueDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Escolha uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionType">Ação do Card</Label>
              <Select
                value={actionType}
                onValueChange={(value) =>
                  setActionType(value as TaskActionType)
                }
              >
                <SelectTrigger id="actionType">
                  <SelectValue placeholder="Selecione uma ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="review">
                    Revisão do Cliente (Aprovar/Editar)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 flex flex-col">
            <Label>Comentários</Label>
            <div className="flex-grow space-y-2 max-h-64 overflow-y-auto rounded-md border p-2 bg-muted/50">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="text-sm bg-background p-2 rounded-md">
                    <p className="font-semibold text-primary">{comment.author}</p>
                    <p className="text-foreground">{comment.text}</p>
                    <p className="text-xs text-muted-foreground pt-1">
                      {format(new Date(comment.createdAt), "dd/MM/yy HH:mm")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground p-2">
                  Nenhum comentário ainda.
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar um comentário..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
              />
              <Button onClick={handleAddComment} type="button">Enviar</Button>
            </div>
          </div>
        </div>
        <DialogFooter className="justify-between pt-4">
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