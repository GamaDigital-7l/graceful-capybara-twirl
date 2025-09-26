import { useState, useEffect, useCallback } from "react"; // Adicionado useCallback
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatSaoPauloDate, parseSaoPauloDateString } from "@/utils/date-utils";

export interface ExpenseData {
  id?: string;
  description: string;
  amount: number;
  category?: string;
  expense_date: Date;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseData) => void;
  existingData: Partial<ExpenseData> | null;
}

export function ExpenseModal({ isOpen, onClose, onSave, existingData }: ExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [category, setCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (existingData) {
      setDescription(existingData.description || "");
      setAmount(existingData.amount || "");
      setCategory(existingData.category || "");
      // Ao carregar, trate a string YYYY-MM-DD como data local de São Paulo
      setExpenseDate(existingData.expense_date ? parseSaoPauloDateString(existingData.expense_date.toISOString().split('T')[0]) : new Date());
    } else {
      setDescription("");
      setAmount("");
      setCategory("");
      setExpenseDate(new Date());
    }
  }, [existingData, isOpen]);

  const handleSave = useCallback(() => {
    if (!description.trim() || !amount || !expenseDate) {
      // Optionally show an error toast
      return;
    }
    onSave({
      id: existingData?.id,
      description: description.trim(),
      amount: parseFloat(amount as string),
      category: category.trim() || undefined,
      expense_date: expenseDate,
    });
    onClose();
  }, [description, amount, category, expenseDate, existingData, onSave, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingData?.id ? "Editar Gasto" : "Adicionar Novo Gasto"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel do escritório, Salários, Marketing"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria (Opcional)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Despesas Fixas, Marketing, Pessoal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseDate">Data do Gasto</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expenseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expenseDate ? (
                    formatSaoPauloDate(expenseDate)
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expenseDate}
                  onSelect={setExpenseDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Salvar Gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}