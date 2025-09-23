"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Importar DialogFooter
  DialogClose, // Importar DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BriefingForm, BriefingResponse, BriefingFormField } from "@/types/briefing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button"; // Importar Button
import { Copy } from "lucide-react"; // Importar ícone Copy
import { showSuccess } from "@/utils/toast"; // Importar showSuccess

interface BriefingResponseViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: BriefingResponse | null;
  form: BriefingForm | null;
}

export function BriefingResponseViewModal({ isOpen, onClose, response, form }: BriefingResponseViewModalProps) {
  if (!response || !form) return null;

  const renderFieldValue = (field: BriefingFormField, value: any) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Não respondido</span>;
    }

    switch (field.type) {
      case "checkbox":
        return Array.isArray(value) && value.length > 0
          ? value.map((item: string) => (
              <span key={item} className="block text-sm text-foreground">
                • {field.options?.find(opt => opt.value === item)?.label || item}
              </span>
            ))
          : <span className="text-muted-foreground italic">Nenhuma opção selecionada</span>;
      case "select":
      case "radio":
        return <span className="text-sm text-foreground">{field.options?.find(opt => opt.value === value)?.label || value}</span>;
      case "text":
      case "textarea":
      default:
        return <p className="whitespace-pre-wrap text-sm text-foreground">{value}</p>;
    }
  };

  const getRawFieldValue = (field: BriefingFormField, value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "Não respondido";
    }

    switch (field.type) {
      case "checkbox":
        return Array.isArray(value) && value.length > 0
          ? value.map((item: string) => field.options?.find(opt => opt.value === item)?.label || item).join(", ")
          : "Nenhuma opção selecionada";
      case "select":
      case "radio":
        return field.options?.find(opt => opt.value === value)?.label || value;
      case "text":
      case "textarea":
      default:
        return String(value);
    }
  };

  const handleCopyResponse = () => {
    let responseText = `Resposta do Briefing: ${form.title}\n\n`;
    responseText += `Enviado por: ${response.client_name || "Usuário Autenticado"}\n`;
    responseText += `Data de Envio: ${format(new Date(response.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}\n\n`;

    form.form_structure?.forEach((field) => {
      responseText += `${field.label}:\n`;
      responseText += `${getRawFieldValue(field, response.response_data[field.id])}\n\n`;
    });

    navigator.clipboard.writeText(responseText);
    showSuccess("Resposta copiada para a área de transferência!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Resposta do Briefing: {form.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="py-4 space-y-6 p-4 sm:p-6"> {/* Ajustado padding */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Enviado por:</p>
              <p className="text-lg font-semibold">{response.client_name || "Usuário Autenticado"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Data de Envio:</p>
              <p className="text-lg font-semibold">{format(new Date(response.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
            {form.form_structure?.map((field) => (
              <div key={field.id} className="space-y-2 border-t pt-4">
                <p className="text-base font-semibold">{field.label}</p>
                {renderFieldValue(field, response.response_data[field.id])}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleCopyResponse} className="w-full">
            <Copy className="h-4 w-4 mr-2" /> Copiar Resposta Completa
          </Button>
          <DialogClose asChild>
            <Button variant="secondary" className="w-full sm:w-auto">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}