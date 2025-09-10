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
import { Copy, Loader2 } from "lucide-react";
import { showSuccess } from "@/utils/toast";

interface ApprovalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
  isGenerating: boolean;
}

export function ApprovalLinkModal({ isOpen, onClose, link, isGenerating }: ApprovalLinkModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    showSuccess("Link copiado para a área de transferência!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de Aprovação Gerado</DialogTitle>
          <DialogDescription>
            Copie o link abaixo e envie para o seu cliente.
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
                <Label htmlFor="approval-link">Link Público</Label>
                <Textarea id="approval-link" value={link} readOnly rows={5} className="resize-none mt-1" />
              </div>
              <Button onClick={handleCopy} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}