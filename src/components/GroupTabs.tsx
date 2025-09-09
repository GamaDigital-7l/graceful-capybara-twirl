"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { KanbanBoard } from "./KanbanBoard";

export interface Group {
  id: string;
  name: string;
}

interface GroupTabsProps {
  groups: Group[];
  activeGroupId: string | null;
  onGroupChange: (groupId: string) => void;
  onCreateGroup: (name: string) => void;
}

export function GroupTabs({
  groups,
  activeGroupId,
  onGroupChange,
  onCreateGroup,
}: GroupTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const handleCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName("");
      setIsCreating(false);
    }
  };

  return (
    <Tabs value={activeGroupId || ""} onValueChange={onGroupChange} className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-4">
        <TabsList>
          {groups.map((group) => (
            <TabsTrigger key={group.id} value={group.id}>
              {group.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {isCreating ? (
          <div className="flex items-center gap-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do Grupo (Ex: Setembro)"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Button onClick={handleCreate}>Criar</Button>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsCreating(true)}>
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