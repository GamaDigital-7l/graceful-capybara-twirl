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

interface PublicLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
  isGenerating: boolean;
  messageTemplate?: string; // Tornar mais genérico
  title: string; // Novo prop para o título do modal
  description: string; // Novo prop para a descrição do modal
  buttonText: string; // Novo prop para o texto do botão
}

export function PublicLinkModal({ isOpen, onClose, link, isGenerating, messageTemplate, title, description, buttonText }: PublicLinkModalProps) {
  const fullMessage = `${messageTemplate || 'Acesse o link:'}\n\n${link}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    showSuccess("Mensagem copiada para a área de transferência!");
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
              <Button onClick={handleCopyMessage} className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                {buttonText}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}