"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, MessageSquare } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface ApprovalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
  isGenerating: boolean;
  whatsappMessageTemplate?: string;
}

export function ApprovalLinkModal({ isOpen, onClose, link, isGenerating, whatsappMessageTemplate }: ApprovalLinkModalProps) {
  const fullMessage = `${whatsappMessageTemplate || 'Olá! Seus posts estão prontos para aprovação. Por favor, acesse o link a seguir para revisar e aprovar:'}\n\n${link}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    showSuccess("Mensagem copiada para a área de transferência!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de Aprovação Gerado</DialogTitle>
          <DialogDescription>
            Copie a mensagem abaixo e envie para o seu cliente via WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isGenerating ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="approval-message">Mensagem para o Cliente</Label>
                <Textarea id="approval-message" value={fullMessage} readOnly rows={6} className="resize-none mt-1" />
              </div>
              <Button onClick={handleCopyMessage} className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Copiar Mensagem para WhatsApp
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}