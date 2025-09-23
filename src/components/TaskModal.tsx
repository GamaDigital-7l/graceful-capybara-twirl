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
import { Trash2, Upload, Calendar as CalendarIcon, Download, Eye, User, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ptBR } from "date-fns/locale"; // Importar ptBR
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AspectRatio } from "./ui/aspect-ratio";
import { ScrollArea } from "./ui/scroll-area";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatSaoPauloDate, formatSaoPauloTime, formatSaoPauloHour, formatSaoPauloDateTime } from "@/utils/date-utils"; // Importar utilitário de data

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  task: Task | null;
  columnId?: string;
  currentUser: { full_name: string, role: string } | null;
  usersForAssignment: UserProfile[]; // Novo prop para usuários
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  columnId,
  currentUser,
  usersForAssignment,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [actionType, setActionType] = useState<TaskActionType>("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>(""); // Novo estado para a hora de entrega
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null); // Novo estado para assignedTo

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAttachmentUrl(task.attachments?.[0]?.url || "");
      setActionType(task.actionType || "none");
      // Ao carregar, trate a string YYYY-MM-DD como data local de São Paulo
      setDueDate(task.dueDate ? new Date(task.dueDate + 'T00:00:00') : undefined);
      setDueTime(task.due_time || ""); // Carregar due_time
      setComments(task.comments || []);
      setAssignedTo(task.assignedTo || null); // Carregar assignedTo
    } else {
      setTitle("");
      setDescription("");
      setAttachmentUrl("");
      setActionType("none");
      setDueDate(undefined);
      setDueTime(""); // Resetar due_time
      setComments([]);
      setAssignedTo(null); // Resetar assignedTo
    }
    setSelectedFile(null);
    setNewComment("");
  }, [task, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setAttachmentUrl(URL.createObjectURL(event.target.files[0]));
    }
  };

  const handleRemoveImage = () => {
    setAttachmentUrl("");
    setSelectedFile(null);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return;
    const comment: Comment = {
      id: new Date().getTime().toString(),
      text: newComment.trim(),
      author: currentUser.full_name,
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
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(data.path);

      finalAttachmentUrl = publicUrlData.publicUrl;
      setIsUploading(false);
    }

    const savedTask: Partial<Task> = {
      id: task?.id,
      columnId: task?.columnId || columnId,
      title: title || "Nova Tarefa",
      description: description,
      actionType: actionType,
      attachments: finalAttachmentUrl
        ? [{ id: "1", url: finalAttachmentUrl, isCover: true }]
        : [],
      // Ao salvar, formate a data para YYYY-MM-DD no fuso horário de São Paulo
      dueDate: dueDate ? formatSaoPauloTime(dueDate, 'yyyy-MM-dd') : undefined,
      due_time: dueTime || null, // Salvar due_time
      comments: comments,
      assignedTo: assignedTo, // Salvar assignedTo
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

  const canAssignTasks = currentUser?.role === 'admin' || currentUser?.role === 'equipe';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{task ? "Editar Tarefa" : "Criar Tarefa"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              {/* Coluna da Esquerda: Detalhes da Tarefa */}
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
                  <Label htmlFor="description">Descrição (Legenda)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Adicione mais detalhes sobre a tarefa..."
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4"> {/* Grid para Data e Hora */}
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
                            formatSaoPauloDate(dueDate)
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
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'equipe') && (
                    <div className="space-y-2">
                      <Label htmlFor="dueTime">Hora de Entrega</Label>
                      <Input
                        id="dueTime"
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
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
                {canAssignTasks && (
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Atribuir a</Label>
                    <Select
                      value={assignedTo || ""}
                      onValueChange={(value) => setAssignedTo(value === "unassigned" ? null : value)}
                    >
                      <SelectTrigger id="assignedTo">
                        <SelectValue placeholder="Ninguém" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Ninguém</SelectItem>
                        {usersForAssignment.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar_url || undefined} loading="lazy" /> {/* Adicionado loading="lazy" */}
                                <AvatarFallback>{user.full_name?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                              </Avatar>
                              {user.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Coluna da Direita: Imagem e Comentários */}
              <div className="space-y-4 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="attachment">Imagem de Capa</Label>
                  {attachmentUrl && (
                    <div className="space-y-2">
                      <AspectRatio ratio={16 / 9} className="bg-muted rounded-md group relative">
                        <img src={attachmentUrl} alt="Pré-visualização" className="rounded-md object-cover w-full h-full" loading="lazy" /> {/* Adicionado loading="lazy" */}
                        <div 
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => setIsPreviewModalOpen(true)}
                        >
                          <Eye className="h-8 w-8 text-white" />
                        </div>
                      </AspectRatio>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="attachment-url"
                      value={attachmentUrl.startsWith('blob:') ? '' : attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Cole uma URL ou faça upload"
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
                    {currentUser?.role === 'admin' && attachmentUrl && (
                      <Button variant="destructive" size="icon" onClick={handleRemoveImage}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 flex flex-col flex-grow">
                  <Label>Comentários</Label>
                  <div className="flex-grow space-y-2 max-h-64 overflow-y-auto rounded-md border p-2 bg-muted/50">
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="text-sm bg-background p-2 rounded-md">
                          <p className="font-semibold text-primary">{comment.author}</p>
                          <p className="text-foreground">{comment.text}</p>
                          <p className="text-xs text-muted-foreground pt-1">
                            {formatSaoPauloDateTime(comment.createdAt)}
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
            </div>
          </ScrollArea>
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
      <ImagePreviewModal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
        imageUrl={attachmentUrl} 
      />
    </>
  );
}