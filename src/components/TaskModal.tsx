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
import { Trash2, Upload, Calendar as CalendarIcon, Download, Eye, User, Clock, Plus, Check } from "lucide-react";
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
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

// Nova interface para Subtarefa
interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
  parent_task_id: string;
  created_at: string;
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
  const [dueTime, setDueTime] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  // Estados para Subtarefas
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAttachmentUrl(task.attachments?.[0]?.url || "");
      setActionType(task.actionType || "none");
      setDueDate(task.dueDate ? new Date(task.dueDate + 'T00:00:00') : undefined);
      setDueTime(task.due_time || "");
      setComments(task.comments || []);
      setAssignedTo(task.assignedTo || null);
      fetchSubtasks(task.id); // Carregar subtarefas ao abrir o modal
    } else {
      setTitle("");
      setDescription("");
      setAttachmentUrl("");
      setActionType("none");
      setDueDate(undefined);
      setDueTime("");
      setComments([]);
      setAssignedTo(null);
      setSubtasks([]); // Limpar subtarefas
    }
    setSelectedFile(null);
    setNewComment("");
    setNewSubtaskTitle(""); // Limpar título da nova subtarefa
  }, [task, isOpen]);

  const fetchSubtasks = async (parentTaskId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, is_completed, parent_task_id, created_at")
      .eq("parent_task_id", parentTaskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar subtarefas:", error.message);
      showError("Erro ao carregar subtarefas.");
    } else {
      setSubtasks(data as Subtask[]);
    }
  };

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

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task?.id) return;

    setIsSubmittingSubtask(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: newSubtaskTitle.trim(),
          parent_task_id: task.id,
          is_completed: false,
          column_id: task.columnId, // Subtarefas herdam a coluna da tarefa pai
          position: 0, // Posição inicial, pode ser ajustada se necessário
        })
        .select("id, title, is_completed, parent_task_id, created_at")
        .single();

      if (error) throw error;

      setSubtasks(prev => [...prev, data as Subtask]);
      setNewSubtaskTitle("");
      showSuccess("Subtarefa adicionada!");
    } catch (error: any) {
      console.error("Erro ao adicionar subtarefa:", error.message);
      showError("Erro ao adicionar subtarefa.");
    } finally {
      setIsSubmittingSubtask(false);
    }
  };

  const handleToggleSubtaskComplete = async (subtaskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: isCompleted })
        .eq("id", subtaskId);

      if (error) throw error;

      setSubtasks(prev => prev.map(st => st.id === subtaskId ? { ...st, is_completed: isCompleted } : st));
      showSuccess("Status da subtarefa atualizado!");
    } catch (error: any) {
      console.error("Erro ao atualizar subtarefa:", error.message);
      showError("Erro ao atualizar subtarefa.");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", subtaskId);

      if (error) throw error;

      setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
      showSuccess("Subtarefa deletada!");
    } catch (error: any) {
      console.error("Erro ao deletar subtarefa:", error.message);
      showError("Erro ao deletar subtarefa.");
    }
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
      dueDate: dueDate ? formatSaoPauloTime(dueDate, 'yyyy-MM-dd') : undefined,
      due_time: dueTime || null,
      comments: comments,
      assignedTo: assignedTo,
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
          <Tabs defaultValue="details" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="comments">Comentários</TabsTrigger>
              <TabsTrigger value="subtasks" disabled={!task?.id}>Subtarefas</TabsTrigger> {/* Desabilitar se não for tarefa existente */}
            </TabsList>
            <TabsContent value="details" className="py-4">
              <ScrollArea className="max-h-[60vh] pr-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                  {/* Coluna da Direita: Imagem */}
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
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="comments" className="py-4 flex flex-col h-full">
              <Label>Comentários</Label>
              <div className="flex-grow space-y-2 max-h-[60vh] overflow-y-auto rounded-md border p-2 bg-muted/50">
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
            </TabsContent>
            <TabsContent value="subtasks" className="py-4 flex flex-col h-full">
              <Label>Subtarefas</Label>
              <div className="flex-grow space-y-2 max-h-[60vh] overflow-y-auto rounded-md border p-2 bg-muted/50">
                {subtasks.length > 0 ? (
                  subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center justify-between bg-background p-2 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`subtask-${subtask.id}`}
                          checked={subtask.is_completed}
                          onCheckedChange={(checked: boolean) => handleToggleSubtaskComplete(subtask.id, checked)}
                        />
                        <Label htmlFor={`subtask-${subtask.id}`} className={cn("text-sm", subtask.is_completed && "line-through text-muted-foreground")}>
                          {subtask.title}
                        </Label>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSubtask(subtask.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-2">
                    Nenhuma subtarefa ainda.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Adicionar nova subtarefa..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubtask();
                  }}
                  disabled={isSubmittingSubtask}
                />
                <Button onClick={handleAddSubtask} type="button" disabled={isSubmittingSubtask}>
                  {isSubmittingSubtask ? <Check className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
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