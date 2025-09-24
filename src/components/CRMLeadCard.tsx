"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { User, Mail, Phone, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatSaoPauloDate } from "@/utils/date-utils";

export interface CRMLead {
  id: string;
  stageId: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedToAvatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CRMLeadCardProps {
  lead: CRMLead;
  onClick: () => void;
}

export function CRMLeadCard({
  lead,
  onClick,
}: CRMLeadCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "Lead",
      lead,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-4 bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-primary opacity-50 h-24"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer hover:ring-2 hover:ring-primary transition-shadow"
    >
      <CardContent className="p-4">
        <p className="font-medium text-lg">{lead.name}</p>
        {lead.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Mail className="h-4 w-4" />
            <span>{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Phone className="h-4 w-4" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.assignedTo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={lead.assignedToAvatar || undefined} loading="lazy" />
              <AvatarFallback className="text-xs">{lead.assignedToName?.charAt(0) || <User className="h-3 w-3" />}</AvatarFallback>
            </Avatar>
            <span>{lead.assignedToName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <CalendarDays className="h-4 w-4" />
          <span>Criado em: {formatSaoPauloDate(lead.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}