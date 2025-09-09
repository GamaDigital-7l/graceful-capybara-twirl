"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { KanbanBoard } from "./KanbanBoard";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Group {
  id: string;
  name: string;
}

interface GroupTabsProps {
  groups: Group[];
  activeGroupId: string | null;
  onGroupChange: (groupId: string) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onReorderGroups: (groups: Group[]) => void;
}

const SortableGroupTab = ({
  group,
  onDeleteGroup,
}: {
  group: Group;
  onDeleteGroup: (groupId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center bg-background rounded-md p-1"
    >
      <TabsTrigger
        value={group.id}
        className="flex-grow cursor-grab data-[state=active]:shadow-sm"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 mr-2 text-muted-foreground" />
        {group.name}
      </TabsTrigger>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-8 w-8 flex-shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar Grupo
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá deletar o grupo "{group.name}" e todas as suas colunas e
              tarefas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteGroup(group.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export function GroupTabs({
  groups,
  activeGroupId,
  onGroupChange,
  onCreateGroup,
  onDeleteGroup,
  onReorderGroups,
}: GroupTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName("");
      setIsCreating(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      onReorderGroups(arrayMove(groups, oldIndex, newIndex));
    }
  };

  return (
    <Tabs
      value={activeGroupId || ""}
      onValueChange={onGroupChange}
      className="p-4 md:p-8"
    >
      <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={groups.map((g) => g.id)}
            strategy={horizontalListSortingStrategy}
          >
            <TabsList>
              {groups.map((group) => (
                <SortableGroupTab
                  key={group.id}
                  group={group}
                  onDeleteGroup={onDeleteGroup}
                />
              ))}
            </TabsList>
          </SortableContext>
        </DndContext>
        {isCreating ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do Grupo (Ex: Setembro)"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button onClick={handleCreate}>Criar</Button>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsCreating(true)} className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        )}
      </div>
      {groups.map((group) => (
        <TabsContent key={group.id} value={group.id}>
          <KanbanBoard key={group.id} groupId={group.id} />
        </TabsContent>
      ))}
    </Tabs>
  );
}