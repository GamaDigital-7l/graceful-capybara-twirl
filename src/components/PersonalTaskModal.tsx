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
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatSaoPauloDate, parseSaoPauloDateString } from "@/utils/date-utils";

export interface PersonalTask {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  due_date: Date;
  due_time?: string;
  is_completed?: boolean;
  reminder_preferences?: string[];
  priority?: 'Highest' | 'High' | 'Medium' | 'Low';
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
  const [dueTime, setDueTime] = useState("");
  const [reminderPreferences, setReminderPreferences] = useState<string[]>([]);
  const [priority, setPriority] = useState<'Highest' | 'High' | 'Medium' | 'Low'>('Medium');

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description || "");
      // Ao carregar, trate a string YYYY-MM-DD como data local de São Paulo
      setDueDate(existingTask.due_date ? parseSaoPauloDateString(existingTask.due_date.toISOString().split('T')[0]) : undefined);
      setDueTime(existingTask.due_time || "");
      setReminderPreferences(existingTask.reminder_preferences || []);
      setPriority(existingTask.priority || 'Medium');
    } else {
      setTitle("");
      setDescription("");
      setDueDate(new Date());
      setDueTime("");
      setReminderPreferences([]);
      setPriority('Medium');
    }
  }, [existingTask, isOpen]);

  const handleReminderChange = (reminderType: string, checked: boolean | 'indeterminate') => {
    setReminderPreferences(prev => {
      if (checked) {
        return [...prev, reminderType];
      } else {
        return prev.filter(type => type !== reminderType);
      }
    });
  };

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
      reminder_preferences: reminderPreferences,
      priority: priority,
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
                      formatSaoPauloDate(dueDate)
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

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as 'Highest' | 'High' | 'Medium' | 'Low')}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Highest">Mais Alta</SelectItem>
                <SelectItem value="High">Alta</SelectItem>
                <SelectItem value="Medium">Média</SelectItem>
                <SelectItem value="Low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="text-base font-medium">Lembretes</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-1d-before"
                  checked={reminderPreferences.includes('1d_before')}
                  onCheckedChange={(checked) => handleReminderChange('1d_before', checked)}
                />
                <Label htmlFor="reminder-1d-before">1 dia antes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-1h-before"
                  checked={reminderPreferences.includes('1h_before')}
                  onCheckedChange={(checked) => handleReminderChange('1h_before', checked)}
                />
                <Label htmlFor="reminder-1h-before">1 hora antes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-30m-before"
                  checked={reminderPreferences.includes('30m_before')}
                  onCheckedChange={(checked) => handleReminderChange('30m_before', checked)}
                />
                <Label htmlFor="reminder-30m-before">30 minutos antes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-15m-before"
                  checked={reminderPreferences.includes('15m_before')}
                  onCheckedChange={(checked) => handleReminderChange('15m_before', checked)}
                />
                <Label htmlFor="reminder-15m-before">15 minutos antes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-at-due-time"
                  checked={reminderPreferences.includes('at_due_time')}
                  onCheckedChange={(checked) => handleReminderChange('at_due_time', checked)}
                />
                <Label htmlFor="reminder-at-due-time">No horário de vencimento</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-1h-after"
                  checked={reminderPreferences.includes('1h_after')}
                  onCheckedChange={(checked) => handleReminderChange('1h_after', checked)}
                />
                <Label htmlFor="reminder-1h-after">1 hora depois (se não concluída)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-1d-after"
                  checked={reminderPreferences.includes('1d_after')}
                  onCheckedChange={(checked) => handleReminderChange('1d_after', checked)}
                />
                <Label htmlFor="reminder-1d-after">1 dia depois (se não concluída)</Label>
              </div>
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