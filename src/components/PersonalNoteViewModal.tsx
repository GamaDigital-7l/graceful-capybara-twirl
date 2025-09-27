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
          <div className="py-4 whitespace-pre-wrap text-sm text-foreground p-4 sm:p-6">
            {note.content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});