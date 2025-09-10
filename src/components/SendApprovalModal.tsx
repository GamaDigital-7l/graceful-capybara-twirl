"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Send, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface SendApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  isGenerating: boolean;
}

export function SendApprovalModal({ isOpen, onClose, message, isGenerating }: SendApprovalModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    showSuccess("Mensagem copiada!");
  };

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      showError("Por favor, insira um número de WhatsApp.");
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-whatsapp-approval", {
        body: { to: phoneNumber, message },
      });
      if (error) throw error;
      showSuccess("Mensagem enviada com sucesso via WhatsApp!");
      onClose();
    } catch (e: any) {
      showError(`Erro ao enviar: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Link de Aprovação</DialogTitle>
          <DialogDescription>
            Envie o link diretamente para o WhatsApp do cliente ou copie a mensagem.
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
                <Label htmlFor="approval-message">Mensagem com Link</Label>
                <Textarea id="approval-message" value={message} readOnly rows={6} className="resize-none mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleCopy} variant="outline" className="w-full">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mensagem
                </Button>
              </div>
              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="whatsapp-number">Enviar para o WhatsApp</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="whatsapp-number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 5511999998888"
                  />
                  <Button onClick={handleSend} disabled={isSending}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Insira o número com código do país e DDD, sem espaços ou símbolos.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}