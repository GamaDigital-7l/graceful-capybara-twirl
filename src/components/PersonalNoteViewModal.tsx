import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PersonalNote } from "./PersonalNoteModal"; // Re-use PersonalNote interface
import { formatSaoPauloDateTime } from "@/utils/date-utils"; // Importar função de formatação

interface PersonalNoteViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: PersonalNote | null;
}

export const PersonalNoteViewModal = React.memo(function PersonalNoteViewModal({ isOpen, onClose, note }: PersonalNoteViewModalProps) {
  if (!note) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="py-4 space-y-4 p-4 sm:p-6">
            <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
            {note.updated_at && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Última atualização: {formatSaoPauloDateTime(note.updated_at)}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});