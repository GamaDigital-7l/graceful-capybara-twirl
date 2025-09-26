"use client";

import React, { useMemo, useState, useCallback } from "react";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "./ui/badge";
import { CRMLeadCard, CRMLead } from "./CRMLeadCard";

export interface CRMStage {
  id: string;
  title: string;
  position: number;
}

interface CRMStageColumnProps {
  stage: CRMStage;
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  onAddLead: (stageId: string) => void;
  onDeleteStage: (stageId: string) => void;
  onUpdateStage: (stageId: string, title: string) => void;
}

export const CRMStageColumn = React.memo(function CRMStageColumn({
  stage,
  leads,
  onLeadClick,
  onAddLead,
  onDeleteStage,
  onUpdateStage,
}: CRMStageColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(stage.title);

  const leadsIds = useMemo(() => {
    return leads.map((lead) => lead.id);
  }, [leads]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
    data: {
      type: "Stage",
      stage,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleTitleBlur = useCallback(() => {
    if (title !== stage.title) {
      onUpdateStage(stage.id, title);
    }
    setIsEditing(false);
  }, [title, stage.title, stage.id, onUpdateStage]);

  const handleDeleteStageClick = useCallback(() => {
    onDeleteStage(stage.id);
  }, [stage.id, onDeleteStage]);

  const handleAddLeadClick = useCallback(() => {
    onAddLead(stage.id);
  }, [stage.id, onAddLead]);

  const MemoizedCRMLeadCard = React.memo(CRMLeadCard);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-[300px] flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-primary opacity-50 h-[500px]"
      />
    );
  }

  return (
    <Card ref={setNodeRef} style={style} className="flex flex-col w-[300px] flex-shrink-0 h-full">
      <CardHeader
        {...attributes}
        {...listeners}
        className="flex flex-row items-center justify-between cursor-grab p-4 border-b"
      >
        <div className="flex items-center gap-2 flex-grow" onClick={() => setIsEditing(true)}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="h-8 text-base"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{stage.title}</h3>
              <Badge variant="secondary" className="h-5">{leads.length}</Badge>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive cursor-pointer" onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar Etapa
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá deletar a etapa "{stage.title}" e todos os leads associados a ela serão movidos para 'null'. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteStageClick}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-grow overflow-y-auto p-4">
        <SortableContext items={leadsIds}>
          {leads.map((lead) => (
            <MemoizedCRMLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
            />
          ))}
        </SortableContext>
      </CardContent>
      <div className="p-4 pt-0">
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleAddLeadClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Lead
        </Button>
      </div>
    </Card>
  );
});