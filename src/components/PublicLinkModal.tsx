import React, { useState, useCallback } from "react"; // Adicionado useCallback
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
import { Copy, Loader2, MessageSquare, Send } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { sendWhatsAppEvolutionNotification } from "@/utils/whatsapp";

interface PublicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
  isGenerating: boolean;
  messageTemplate?: string;
  title: string;
  description: string;
  buttonText: string;
  clientPhoneNumber: string | null;
  whatsappGroupId: string | null; // Novo prop para o ID do grupo do WhatsApp
}

export function PublicLinkModal({ isOpen, onClose, link, isGenerating, messageTemplate, title, description, buttonText, clientPhoneNumber, whatsappGroupId }: PublicLinkModalProps) {
  const fullMessage = `${messageTemplate || 'Acesse o link:'}\n\n${link}`;
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(fullMessage);
    showSuccess("Mensagem copiada para a área de transferência!");
  }, [fullMessage]);

  const handleSendWhatsApp = useCallback(async () => {
    if (!clientPhoneNumber && !whatsappGroupId) {
      showError("Nenhum número de telefone ou ID de grupo do cliente configurado para este workspace.");
      return;
    }

    setIsSendingWhatsapp(true);
    try {
      // Prioriza o envio para o grupo se o ID estiver disponível
      if (whatsappGroupId) {
        await sendWhatsAppEvolutionNotification(whatsappGroupId, fullMessage, true); // O terceiro parâmetro indica que é um grupo
      } else if (clientPhoneNumber) {
        await sendWhatsAppEvolutionNotification(clientPhoneNumber, fullMessage);
      }
      showSuccess("Mensagem enviada via WhatsApp!");
      onClose();
    } catch (error) {
      // Erro já tratado na função utilitária
    } finally {
      setIsSendingWhatsapp(false);
    }
  }, [clientPhoneNumber, whatsappGroupId, fullMessage, onClose]);

  const canSendWhatsapp = !!clientPhoneNumber || !!whatsappGroupId;

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
                {canSendWhatsapp && (
                  <Button onClick={handleSendWhatsApp} className="w-full sm:w-1/2" disabled={isSendingWhatsapp}>
                    {isSendingWhatsapp ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar via WhatsApp
                  </Button>
                )}
                <Button onClick={handleCopyMessage} className="w-full sm:w-1/2" variant={canSendWhatsapp ? "outline" : "default"}>
                  <Copy className="h-4 w-4 mr-2" />
                  {buttonText}
                </Button>
              </div>
              {!canSendWhatsapp && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Adicione o número de telefone ou ID do grupo do cliente nas configurações do workspace para enviar via WhatsApp.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}