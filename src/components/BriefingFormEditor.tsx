"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ArrowLeft } from "lucide-react";
import { BriefingForm, BriefingFormField, BriefingFieldType, BriefingFieldOption } from "@/types/briefing";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";

interface Workspace {
  id: string;
  name: string;
}

const fetchWorkspaces = async (): Promise<Workspace[]> => {
  const { data, error } = await supabase.from("workspaces").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const fetchBriefingForm = async (formId: string): Promise<BriefingForm> => {
  const { data, error } = await supabase.from("briefing_forms").select("*").eq("id", formId).single();
  if (error) throw new Error(error.message);
  return data as BriefingForm;
};

interface SortableFieldProps {
  field: BriefingFormField;
  index: number;
  onUpdateField: (index: number, updatedField: Partial<BriefingFormField>) => void;
  onRemoveField: (index: number) => void;
}

const SortableField = ({ field, index, onUpdateField, onRemoveField }: SortableFieldProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: 'relative',
  };

  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[optionIndex] = { ...newOptions[optionIndex], label: value, value: value }; // Value also changes
    onUpdateField(index, { options: newOptions });
  };

  const handleAddOption = () => {
    onUpdateField(index, { options: [...(field.options || []), { value: "", label: "" }] });
  };

  const handleRemoveOption = (optionIndex: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== optionIndex);
    onUpdateField(index, { options: newOptions });
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-md p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Campo #{index + 1} - {field.label || "Sem Título"}</span>
        </div>
        <Button variant="destructive" size="icon" onClick={() => onRemoveField(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Campo</Label>
          <Select
            value={field.type}
            onValueChange={(value) => onUpdateField(index, { type: value as BriefingFieldType, options: [] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto Curto</SelectItem>
              <SelectItem value="textarea">Texto Longo</SelectItem>
              <SelectItem value="select">Seleção (Dropdown)</SelectItem>
              <SelectItem value="radio">Múltipla Escolha (Rádio)</SelectItem>
              <SelectItem value="checkbox">Caixas de Seleção (Checkbox)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`field-label-${field.id}`}>Rótulo do Campo</Label>
          <Input
            id={`field-label-${field.id}`}
            value={field.label}
            onChange={(e) => onUpdateField(index, { label: e.target.value })}
            placeholder="Ex: Qual o nome do seu projeto?"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`field-placeholder-${field.id}`}>Placeholder (Opcional)</Label>
          <Input
            id={`field-placeholder-${field.id}`}
            value={field.placeholder || ""}
            onChange={(e) => onUpdateField(index, { placeholder: e.target.value })}
            placeholder="Ex: Digite aqui..."
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <Switch
            id={`field-required-${field.id}`}
            checked={field.required}
            onCheckedChange={(checked) => onUpdateField(index, { required: checked })}
          />
          <Label htmlFor={`field-required-${field.id}`}>Campo Obrigatório</Label>
        </div>
      </div>

      {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
        <div className="space-y-2 border-t pt-4 mt-4">
          <Label>Opções de Seleção</Label>
          {field.options?.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                placeholder={`Opção ${optionIndex + 1}`}
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(optionIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddOption}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Opção
          </Button>
        </div>
      )}
    </div>
  );
};

export function BriefingFormEditor() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [formStructure, setFormStructure] = useState<BriefingFormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!formId;

  const { data: existingForm, isLoading: isLoadingForm } = useQuery<BriefingForm>({
    queryKey: ["briefingForm", formId],
    queryFn: () => fetchBriefingForm(formId!),
    enabled: isEditing,
  });

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  useEffect(() => {
    if (isEditing && existingForm) {
      setTitle(existingForm.title);
      setDescription(existingForm.description || "");
      setWorkspaceId(existingForm.workspace_id);
      setFormStructure(existingForm.form_structure);
    } else {
      setTitle("");
      setDescription("");
      setWorkspaceId(null);
      setFormStructure([]);
    }
  }, [isEditing, existingForm]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleAddField = () => {
    setFormStructure([
      ...formStructure,
      { id: `field-${Date.now()}`, type: "text", label: "", required: false },
    ]);
  };

  const handleUpdateField = (index: number, updatedField: Partial<BriefingFormField>) => {
    const newStructure = [...formStructure];
    newStructure[index] = { ...newStructure[index], ...updatedField };
    setFormStructure(newStructure);
  };

  const handleRemoveField = (index: number) => {
    setFormStructure(formStructure.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formStructure.findIndex((field) => field.id === active.id);
      const newIndex = formStructure.findIndex((field) => field.id === over.id);
      setFormStructure((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const saveFormMutation = useMutation({
    mutationFn: async (form: Partial<BriefingForm>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      if (isEditing && formId) {
        const { error } = await supabase
          .from("briefing_forms")
          .update({
            title: form.title,
            description: form.description,
            workspace_id: form.workspace_id,
            form_structure: form.form_structure,
          })
          .eq("id", formId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("briefing_forms")
          .insert({
            title: form.title,
            description: form.description,
            workspace_id: form.workspace_id,
            form_structure: form.form_structure,
            created_by: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefingForms"] });
      showSuccess(`Formulário ${isEditing ? "atualizado" : "criado"} com sucesso!`);
      navigate("/briefings");
    },
    onError: (e: Error) => showError(`Erro ao salvar formulário: ${e.message}`),
    onSettled: () => setIsSaving(false),
  });

  const handleSave = () => {
    if (!title.trim()) {
      showError("O título do formulário é obrigatório.");
      return;
    }
    if (formStructure.some(field => !field.label.trim())) {
      showError("Todos os campos devem ter um rótulo.");
      return;
    }
    if (formStructure.some(field => (field.type === "select" || field.type === "radio" || field.type === "checkbox") && (!field.options || field.options.length === 0 || field.options.some(opt => !opt.label.trim())))) {
      showError("Campos de seleção, rádio ou checkbox devem ter pelo menos uma opção válida.");
      return;
    }

    setIsSaving(true);
    saveFormMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      workspace_id: workspaceId,
      form_structure: formStructure,
    });
  };

  if (isLoadingForm || isLoadingWorkspaces) {
    return <div className="p-8 text-center"><Skeleton className="h-96 w-full max-w-4xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/briefings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Formulário de Briefing" : "Criar Novo Formulário de Briefing"}</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Formulário"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Formulário</CardTitle>
          <CardDescription>Informações básicas e cliente associado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Título do Formulário</Label>
            <Input
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Briefing de Novo Projeto de Social Media"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Descrição (Opcional)</Label>
            <Textarea
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição sobre o propósito deste formulário."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-select">Associar ao Cliente (Workspace - Opcional)</Label>
            <Select
              value={workspaceId || ""}
              onValueChange={(value) => setWorkspaceId(value === "global" ? null : value)}
            >
              <SelectTrigger id="workspace-select">
                <SelectValue placeholder="Selecione um cliente ou 'Agência (Global)'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Agência (Global)</SelectItem>
                {workspaces?.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Formulários globais não são vinculados a um cliente específico.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estrutura do Formulário</CardTitle>
          <CardDescription>Arraste e solte para reordenar os campos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={formStructure.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {formStructure.map((field, index) => (
                <SortableField
                  key={field.id}
                  field={field}
                  index={index}
                  onUpdateField={handleUpdateField}
                  onRemoveField={handleRemoveField}
                />
              ))}
            </DndContext>
          </DndContext>
          <Button variant="outline" onClick={handleAddField} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Campo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}