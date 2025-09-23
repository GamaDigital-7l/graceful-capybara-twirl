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
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface PersonalTask {
  id?: string;
  user_id?: string; // Will be set by the backend
  title: string;
  description?: string;
  due_date: Date;
  due_time?: string; // HH:mm format
  is_completed?: boolean;
}

interface PersonalTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: PersonalTask) => void;
  existingTask?: PersonalTask | null;
}

export function PersonalTaskModal({
  isOpen,
  onClose,
  onSave,
  existingTask,
}: PersonalTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState(""); // HH:mm format

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description || "");
      setDueDate(existingTask.due_date);
      setDueTime(existingTask.due_time || "");
    } else {
      setTitle("");
      setDescription("");
      setDueDate(new Date()); // Default to today
      setDueTime("");
    }
  }, [existingTask, isOpen]);

  const handleSave = () => {
    if (!title.trim() || !dueDate) {
      // TODO: Add a toast for validation error
      return;
    }

    const taskToSave: PersonalTask = {
      id: existingTask?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate,
      due_time: dueTime || undefined,
      is_completed: existingTask?.is_completed || false,
    };
    onSave(taskToSave);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingTask ? "Editar Tarefa Pessoal" : "Adicionar Nova Tarefa Pessoal"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Tarefa</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pagar contas de luz"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre a tarefa..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
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
                      <span>Selecione uma data</span>
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
            <div className="space-y-2">
              <Label htmlFor="dueTime">Hora (Opcional)</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Salvar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}