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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select
import { formatSaoPauloDate, parseSaoPauloDateString, formatSaoPauloTime } from "@/utils/date-utils"; // Importar utilitário de data

export interface PersonalTask {
  id?: string;
  user_id?: string; // Will be set by the backend
  title: string;
  description?: string;
  due_date: Date;
  due_time?: string; // HH:mm format
  is_completed?: boolean;
  reminder_preferences?: string[]; // New field for reminder preferences
  priority?: 'Highest' | 'High' | 'Medium' | 'Low'; // New field for priority
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
  const [reminderPreferences, setReminderPreferences] = useState<string[]>([]); // State for reminder preferences
  const [priority, setPriority] = useState<'Highest' | 'High' | 'Medium' | 'Low'>('Medium'); // State for priority
  const [formattedDueDateDisplay, setFormattedDueDateDisplay] = useState<string | null>(null); // Novo estado para exibição da data

  useEffect(() => {
    const updateFormattedDate = async () => {
      if (dueDate) {
        setFormattedDueDateDisplay(await formatSaoPauloDate(dueDate));
      } else {
        setFormattedDueDateDisplay(null);
      }
    };
    updateFormattedDate();
  }, [dueDate]);

  useEffect(() => {
    const initializeState = async () => {
      if (existingTask) {
        setTitle(existingTask.title);
        setDescription(existingTask.description || "");
        setDueDate(existingTask.due_date || undefined);
        setDueTime(existingTask.due_time || "");
        setReminderPreferences(existingTask.reminder_preferences || []);
        setPriority(existingTask.priority || 'Medium');
      } else {
        setTitle("");
        setDescription("");
        setDueDate(await parseSaoPauloDateString(await formatSaoPauloTime(new Date(), 'yyyy-MM-dd'))); // Default to today in SP timezone
        setDueTime("");
        setReminderPreferences([]);
        setPriority('Medium');
      }
    };
    initializeState();
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
      // Ao salvar, formate a data para YYYY-MM-DD no fuso horário de São Paulo
      due_date: dueDate, // A formatação para string YYYY-MM-DD será feita na mutation da página
      due_time: dueTime || undefined,
      is_completed: existingTask?.is_completed || false,
      reminder_preferences: reminderPreferences,
      priority: priority, // Save priority
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
                    {formattedDueDateDisplay ? (
                      formattedDueDateDisplay
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