"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      window.open(imageUrl, '_blank');
    }
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
        <DialogFooter className="p-4">
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Imagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}