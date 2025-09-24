"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { CRMStageColumn, CRMStage } from "./CRMStageColumn";
import { CRMLeadCard, CRMLead } from "./CRMLeadCard";
import { CRMLeadModal } from "./CRMLeadModal";

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface CRMData {
  stages: CRMStage[];
  leads: CRMLead[];
}

const fetchCRMData = async (): Promise<CRMData> => {
  const { data: stages, error: stagesError } = await supabase
    .from("crm_stages")
    .select("id, title, position")
    .order("position");
  if (stagesError) throw new Error(stagesError.message);
  if (!stages) return { stages: [], leads: [] };

  const stageIds = stages.map((s) => s.id);
  if (stageIds.length === 0) return { stages, leads: [] };

  const { data: leadsData, error: leadsError } = await supabase
    .from("crm_leads")
    .select("*, assigned_to:profiles(id, full_name, avatar_url)")
    .in("stage_id", stageIds)
    .order("created_at", { ascending: true }); // Order leads by creation date within columns
  if (leadsError) throw new Error(leadsError.message);

  const leads = leadsData.map((lead) => ({
    id: lead.id,
    stageId: lead.stage_id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    notes: lead.notes,
    assignedTo: (lead.assigned_to as UserProfile)?.id || null,
    assignedToName: (lead.assigned_to as UserProfile)?.full_name || null,
    assignedToAvatar: (lead.assigned_to as UserProfile)?.avatar_url || null,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  }));

  return { stages, leads };
};

const fetchUsersForAssignment = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url, role").in('role', ['admin', 'equipe']);
  if (error) throw error;
  return data || [];
};

export function CRMKanbanBoard() {
  const queryClient = useQueryClient();
  const [activeEl, setActiveEl] = useState<{ type: "Stage" | "Lead", data: CRMStage | CRMLead } | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [newLeadStageId, setNewLeadStageId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ full_name: string, role: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
        setCurrentUser(profile);
      }
    };
    fetchUser();
  }, []);

  const { data, isLoading, error } = useQuery<CRMData, Error>({
    queryKey: ["crmData"],
    queryFn: fetchCRMData,
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching CRM data:", error);
      showError(`Erro ao carregar o CRM: ${error.message}`);
    }
  }, [error]);

  const { data: usersForAssignment, isLoading: isLoadingUsersForAssignment } = useQuery<UserProfile[]>({
    queryKey: ["usersForAssignment"],
    queryFn: fetchUsersForAssignment,
  });

  const stages = data?.stages || [];
  const leads = data?.leads || [];
  const stageIds = useMemo(() => stages.map((stage) => stage.id), [stages]);
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

  const invalidateCRMData = () => queryClient.invalidateQueries({ queryKey: ["crmData"] });

  const createStageMutation = useMutation({
    mutationFn: async () => supabase.from("crm_stages").insert({ title: "Nova Etapa", position: stages.length }),
    onSuccess: () => { invalidateCRMData(); showSuccess("Etapa criada!"); },
    onError: (e: Error) => showError(e.message),
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => supabase.from("crm_stages").update({ title }).eq("id", id),
    onSuccess: invalidateCRMData,
    onError: (e: Error) => showError(e.message),
  });

  const updateStagePositionMutation = useMutation({
    mutationFn: async (updatedStages: CRMStage[]) => {
      const updates = updatedStages.map(stage => supabase.from('crm_stages').update({ position: stage.position }).eq('id', stage.id));
      await Promise.all(updates);
    },
    onSuccess: invalidateCRMData,
    onError: (e: Error) => showError(e.message),
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => supabase.from("crm_stages").delete().eq("id", id),
    onSuccess: () => { invalidateCRMData(); showSuccess("Etapa deletada!"); },
    onError: (e: Error) => showError(e.message),
  });

  const saveLeadMutation = useMutation({
    mutationFn: async (lead: Partial<CRMLead>) => {
      const { id, stageId, assignedTo, ...rest } = lead;
      const dataToSave = { 
        ...rest, 
        stage_id: stageId, 
        assigned_to: assignedTo || null,
        updated_at: new Date().toISOString(),
      };
      Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

      if (id) {
        const { error } = await supabase.from("crm_leads").update(dataToSave).eq("id", id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");
        const { error } = await supabase.from("crm_leads").insert({ ...dataToSave, created_by: user.id });
        if (error) throw error;
      }
      return lead;
    },
    onSuccess: (savedLead) => {
      invalidateCRMData();
      showSuccess("Lead salvo!");
      if (!savedLead.id) {
        // Opcional: Notificação para novo lead
      }
    },
    onError: (e: Error) => showError(e.message),
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async (updatedLeads: CRMLead[]) => {
      const updates = updatedLeads.map(lead => supabase.from('crm_leads').update({ stage_id: lead.stageId, updated_at: new Date().toISOString() }).eq('id', lead.id));
      await Promise.all(updates);
    },
    onSuccess: invalidateCRMData,
    onError: (e: Error) => showError(e.message),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => supabase.from("crm_leads").delete().eq("id", id),
    onSuccess: () => { invalidateCRMData(); showSuccess("Lead deletado!"); },
    onError: (e: Error) => showError(e.message),
  });

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "Stage") {
      setActiveEl({ type: "Stage", data: active.data.current.stage as CRMStage });
    } else if (active.data.current?.type === "Lead") {
      setActiveEl({ type: "Lead", data: active.data.current.lead as CRMLead });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveEl(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAStage = active.data.current?.type === "Stage";
    if (isActiveAStage) {
        const activeIndex = stages.findIndex((s) => s.id === activeId);
        const overIndex = stages.findIndex((s) => s.id === overId);
        if (activeIndex !== overIndex) {
            const reorderedStages: CRMStage[] = arrayMove(stages, activeIndex, overIndex);
            updateStagePositionMutation.mutate(reorderedStages.map((stage, index) => ({ ...stage, position: index })));
        }
        return;
    }

    const isActiveALead = active.data.current?.type === "Lead";
    if (isActiveALead) {
        const activeLead = leads.find(l => l.id === activeId);
        if (!activeLead) return;

        const overIsAStage = over.data.current?.type === "Stage";
        const overIsALead = over.data.current?.type === "Lead";

        const sourceStageId = activeLead.stageId;
        let destinationStageId: string;
        if (overIsAStage) {
            destinationStageId = over.id as string;
        } else if (overIsALead) {
            const overLead = leads.find(l => l.id === overId);
            if (!overLead) return;
            destinationStageId = overLead.stageId;
        } else {
            return;
        }

        // For CRM, we only care about changing the stage_id.
        // The order within a stage is implicitly by created_at for now.
        if (sourceStageId !== destinationStageId) {
            const updatedLead = { ...activeLead, stageId: destinationStageId };
            updateLeadStageMutation.mutate([updatedLead]);
            showSuccess(`Lead "${activeLead.name}" movido para a nova etapa!`);
        }
    }
  };

  if (isLoading || isLoadingUsersForAssignment) return <div className="p-8 text-center">Carregando CRM...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Erro ao carregar o CRM: ${error.message}</div>;

  return (
    <div>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="w-full overflow-x-auto pb-4">
          <div className="inline-flex gap-6 items-start">
            <SortableContext items={stageIds}>
              {stages.map((stage) => (
                <CRMStageColumn
                  key={stage.id}
                  stage={stage}
                  leads={leads.filter((lead) => lead.stageId === stage.id)}
                  onLeadClick={(lead) => { setSelectedLead(lead); setIsLeadModalOpen(true); }}
                  onAddLead={(stageId) => { setSelectedLead(null); setNewLeadStageId(stageId); setIsLeadModalOpen(true); }}
                  onDeleteStage={(id) => deleteStageMutation.mutate(id)}
                  onUpdateStage={(id, title) => updateStageMutation.mutate({ id, title })}
                />
              ))}
            </SortableContext>
            <Button onClick={() => createStageMutation.mutate()} variant="outline" className="h-full min-h-[100px] flex-shrink-0 w-[300px]">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Etapa
            </Button>
          </div>
        </div>
        {createPortal(<DragOverlay>{
          activeEl?.type === "Lead" && <CRMLeadCard lead={activeEl.data as CRMLead} onClick={() => {}} />
        }
        {
          activeEl?.type === "Stage" && <CRMStageColumn stage={activeEl.data as CRMStage} leads={[]} onLeadClick={() => {}} onAddLead={() => {}} onDeleteStage={() => {}} onUpdateStage={() => {}} />
        }
        </DragOverlay>, document.body)}
      </DndContext>
      <CRMLeadModal 
        isOpen={isLeadModalOpen} 
        onClose={() => setIsLeadModalOpen(false)} 
        onSave={(lead) => saveLeadMutation.mutate(lead)} 
        onDelete={(id) => deleteLeadMutation.mutate(id)} 
        lead={selectedLead} 
        stageId={newLeadStageId || undefined} 
        usersForAssignment={usersForAssignment || []}
      />
    </div>
  );
}