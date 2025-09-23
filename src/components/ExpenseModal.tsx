import { useState, useEffect } from "react";
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
import { formatSaoPauloDate, parseSaoPauloDateString, formatSaoPauloTime } from "@/utils/date-utils"; // Importar utilitário de data

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
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(undefined); // Alterado para undefined
  const [formattedExpenseDate, setFormattedExpenseDate] = useState<string | null>(null); // Novo estado

  useEffect(() => {
    if (existingData) {
      setDescription(existingData.description || "");
      setAmount(existingData.amount || "");
      setCategory(existingData.category || "");
      // existingData.expense_date já deve ser um objeto Date no fuso horário de SP
      setExpenseDate(existingData.expense_date || undefined);
    } else {
      setDescription("");
      setAmount("");
      setCategory("");
      const todayInSaoPaulo = new Date(); // Cria uma data no fuso horário local do navegador
      setExpenseDate(todayInSaoPaulo); // Define a data de hoje como padrão
    }
  }, [existingData, isOpen]);

  useEffect(() => {
    const updateFormattedDate = async () => {
      if (expenseDate) {
        setFormattedExpenseDate(await formatSaoPauloDate(expenseDate));
      } else {
        setFormattedExpenseDate(null);
      }
    };
    updateFormattedDate();
  }, [expenseDate]);

  const handleSave = async () => { // Tornar assíncrona
    if (!description.trim() || !amount || !expenseDate) {
      // Optionally show an error toast
      return;
    }
    onSave({
      id: existingData?.id,
      description: description.trim(),
      amount: parseFloat(amount as string),
      category: category.trim() || undefined,
      // Ao salvar, formate a data para YYYY-MM-DD no fuso horário de São Paulo
      expense_date: expenseDate, // A formatação para string YYYY-MM-DD será feita na mutation da página
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingData?.id ? "Editar Gasto" : "Adicionar Novo Gasto"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
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
                  {formattedExpenseDate ? (
                    formattedExpenseDate
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