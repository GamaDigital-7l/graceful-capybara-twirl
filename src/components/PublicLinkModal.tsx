import React, { useState } from "react";
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
import { Copy, Loader2, MessageSquare, Send } from "lucide-react"; // Adicionado Send
import { showSuccess, showError } from "@/utils/toast";
import { sendWhatsAppEvolutionNotification } from "@/utils/whatsapp"; // Importar a função de envio

interface PublicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
  isGenerating: boolean;
  messageTemplate?: string;
  title: string;
  description: string;
  buttonText: string;
  clientPhoneNumber: string | null; // Novo prop para o número de telefone do cliente
}

export function PublicLinkModal({ isOpen, onClose, link, isGenerating, messageTemplate, title, description, buttonText, clientPhoneNumber }: PublicLinkModalProps) {
  const fullMessage = `${messageTemplate || 'Acesse o link:'}\n\n${link}`;
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    showSuccess("Mensagem copiada para a área de transferência!");
  };

  const handleSendWhatsApp = async () => {
    if (!clientPhoneNumber) {
      showError("Número de telefone do cliente não configurado para este workspace.");
      return;
    }
    setIsSendingWhatsapp(true);
    try {
      await sendWhatsAppEvolutionNotification(clientPhoneNumber, fullMessage);
      showSuccess("Mensagem enviada via WhatsApp!");
      onClose(); // Fechar modal após o envio
    } catch (error) {
      // Erro já tratado na função utilitária
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
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
                <Label htmlFor="public-message">Mensagem para Compartilhar</Label>
                <Textarea id="public-message" value={fullMessage} readOnly rows={6} className="resize-none mt-1" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {clientPhoneNumber && (
                  <Button onClick={handleSendWhatsApp} className="w-full sm:w-1/2" disabled={isSendingWhatsapp}>
                    {isSendingWhatsapp ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar via WhatsApp
                  </Button>
                )}
                <Button onClick={handleCopyMessage} className="w-full sm:w-1/2" variant={clientPhoneNumber ? "outline" : "default"}>
                  <Copy className="h-4 w-4 mr-2" />
                  {buttonText}
                </Button>
              </div>
              {!clientPhoneNumber && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Adicione o número de telefone do cliente nas configurações do workspace para enviar via WhatsApp.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}