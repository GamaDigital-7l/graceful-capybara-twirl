import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Prompt } from "./PromptModal"; // Re-use Prompt interface

interface PromptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt | null;
}

export function PromptViewModal({ isOpen, onClose, prompt }: PromptViewModalProps) {
  if (!prompt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prompt.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="py-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {prompt.content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}