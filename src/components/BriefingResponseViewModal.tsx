"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BriefingForm, BriefingResponse, BriefingFormField } from "@/types/briefing";
import { Button } from "@/components/ui/button";
import { Copy, Link as LinkIcon, FileText } from "lucide-react"; // Adicionado LinkIcon e FileText
import { showSuccess } from "@/utils/toast";
import { formatSaoPauloDateTime } from "@/utils/date-utils";

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
      case "file": // NEW: Render file link
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Abrir Arquivo
          </a>
        );
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
      case "file": // NEW: Return file URL
        return value;
      case "text":
      case "textarea":
      default:
        return String(value);
    }
  };

  const handleCopyResponse = () => {
    let responseText = `Resposta do Briefing: ${form.title}\n\n`;
    responseText += `Enviado por: ${response.client_name || "Usuário Autenticado"}\n`;
    responseText += `Data de Envio: ${formatSaoPauloDateTime(response.submitted_at)}\n\n`;

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
          <div className="py-4 space-y-6 p-4 sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Enviado por:</p>
              <p className="text-lg font-semibold">{response.client_name || "Usuário Autenticado"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Data de Envio:</p>
              <p className="text-lg font-semibold">{formatSaoPauloDateTime(response.submitted_at)}</p>
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