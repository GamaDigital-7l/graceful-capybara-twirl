"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRMLead } from "./CRMLeadCard";
import { useState, useEffect } from "react";
import { Trash2, User, MessageSquareText, Send, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendWhatsAppEvolutionNotification } from "@/utils/whatsapp"; // Importar a nova função

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface CRMLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Partial<CRMLead>) => void;
  onDelete?: (leadId: string) => void;
  lead: CRMLead | null;
  stageId?: string; // Initial stage for new leads
  usersForAssignment: UserProfile[];
}

export function CRMLeadModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  lead,
  stageId,
  usersForAssignment,
}: CRMLeadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setEmail(lead.email || "");
      setPhone(lead.phone || "");
      setSource(lead.source || "");
      setNotes(lead.notes || "");
      setAssignedTo(lead.assignedTo || null);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setSource("");
      setNotes("");
      setAssignedTo(null);
    }
    setWhatsappMessage(""); // Limpar mensagem ao abrir/trocar lead
  }, [lead, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      showError("O nome do lead é obrigatório.");
      return;
    }

    const savedLead: Partial<CRMLead> = {
      id: lead?.id,
      stageId: lead?.stageId || stageId,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      assignedTo: assignedTo,
    };
    onSave(savedLead);
    onClose();
  };

  const handleDelete = () => {
    if (lead && onDelete) {
      onDelete(lead.id);
      onClose();
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) {
      showError("O lead não possui um número de telefone para enviar a mensagem.");
      return;
    }
    if (!whatsappMessage.trim()) {
      showError("A mensagem do WhatsApp não pode estar vazia.");
      return;
    }

    setIsSendingWhatsapp(true);
    try {
      await sendWhatsAppEvolutionNotification(phone.trim(), whatsappMessage.trim());
      setWhatsappMessage(""); // Limpar campo após envio
    } catch (error) {
      // Erro já tratado na função utilitária
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    if (!phone.trim()) {
      showError("O lead não possui um número de telefone.");
      return;
    }
    const formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage.trim())}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Adicionar Novo Lead"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details" className="py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes do Lead</TabsTrigger>
            <TabsTrigger value="whatsapp" disabled={!lead}>Mensagens WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 p-4 sm:p-6"> {/* Adicionado p-4 sm:p-6 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Lead</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 5511987654321"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Ex: Indicação, Anúncio, Site"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione detalhes importantes sobre o lead..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Atribuir a</Label>
                <Select
                  value={assignedTo || ""}
                  onValueChange={(value) => setAssignedTo(value === "unassigned" ? null : value)}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder="Ninguém" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Ninguém</SelectItem>
                    {usersForAssignment.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar_url || undefined} loading="lazy" />
                            <AvatarFallback className="text-xs">{user.full_name?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                          </Avatar>
                          {user.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="whatsapp" className="pt-4 space-y-4 p-4 sm:p-6"> {/* Adicionado p-4 sm:p-6 */}
            {lead && phone ? (
              <>
                <p className="text-sm text-muted-foreground">Enviar mensagem para: <span className="font-semibold">{phone}</span></p>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-message">Mensagem</Label>
                  <Textarea
                    id="whatsapp-message"
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                    rows={6}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2"> {/* Ajustado para flex-col em mobile */}
                  <Button onClick={handleSendWhatsApp} disabled={isSendingWhatsapp || !whatsappMessage.trim()} className="flex-grow">
                    {isSendingWhatsapp ? "Enviando..." : <><Send className="h-4 w-4 mr-2" /> Enviar via Evolution AI</>}
                  </Button>
                  <Button onClick={handleOpenWhatsAppWeb} variant="outline" className="flex-grow" disabled={!phone}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir no WhatsApp Web
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Para enviar mensagens WhatsApp, o lead precisa ter um número de telefone cadastrado.
              </p>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter className="justify-between pt-4 flex-col sm:flex-row gap-2"> {/* Ajustado para flex-col em mobile */}
          <div>
            {lead && onDelete && (
              <Button variant="destructive" onClick={handleDelete} size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto"> {/* Ajustado para w-full em mobile */}
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="w-full sm:w-auto"> {/* Ajustado para w-full em mobile */}
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave} className="w-full sm:w-auto"> {/* Ajustado para w-full em mobile */}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}