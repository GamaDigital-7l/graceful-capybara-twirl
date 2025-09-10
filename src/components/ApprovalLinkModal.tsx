"use client";

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
import { Copy } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface ApprovalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function ApprovalLinkModal({ isOpen, onClose, message }: ApprovalLinkModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    showSuccess("Mensagem copiada para a área de transferência!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de Aprovação Gerado</DialogTitle>
          <DialogDescription>
            Copie a mensagem abaixo e envie para o seu cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea value={message} readOnly rows={6} className="resize-none" />
        </div>
        <DialogFooter>
          <Button onClick={handleCopy} className="w-full">
            <Copy className="h-4 w-4 mr-2" />
            Copiar Mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}