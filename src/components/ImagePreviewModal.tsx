"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast"; // Importar toasts

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `image_${Date.now()}.jpg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess("Download iniciado!"); // Toast de sucesso
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      showError("Erro ao iniciar download. Tente 'Abrir para Salvar' e use as opções do navegador."); // Toast de erro
    }
  };

  const handleOpenImageInNewTab = () => {
    window.open(imageUrl, '_blank');
    showSuccess("Imagem aberta em nova aba. Use as opções do navegador para salvar."); // Informar o usuário
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-2">
        <DialogHeader>
          <DialogTitle className="p-4">Visualizar Imagem</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center p-4">
          <img src={imageUrl} alt="Preview" className="max-w-full max-h-[70vh] object-contain" />
        </div>
        <DialogFooter className="p-4 flex-col sm:flex-row sm:justify-end gap-2">
          <p className="text-xs text-muted-foreground text-center sm:text-right mb-2 sm:mb-0">
            Para salvar na galeria do celular, clique em "Abrir para Salvar" e use as opções do seu navegador (geralmente, segurando a imagem).
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleDownload} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Baixar Imagem
            </Button>
            <Button onClick={handleOpenImageInNewTab} variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir para Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}