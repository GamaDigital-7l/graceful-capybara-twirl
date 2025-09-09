"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "./ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Workspace } from "@/pages/Dashboard";

export interface FinancialData {
  id?: string;
  workspace_id: string | null;
  client_name?: string;
  service_description: string;
  payment_day: number;
  amount: number;
  contract_type: 'Mensal' | 'Pacote';
  client_type: 'Fixo' | 'Freela';
  status: 'Ativo' | 'Inativo';
}

interface FinancialControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FinancialData) => void;
  existingData: Partial<FinancialData> | null;
  workspaces: Workspace[];
  usedWorkspaceIds: string[];
}

export function FinancialControlModal({ isOpen, onClose, onSave, existingData, workspaces, usedWorkspaceIds }: FinancialControlModalProps) {
  const [formData, setFormData] = useState<Partial<FinancialData>>({});
  const [isAvulso, setIsAvulso] = useState(false);

  useEffect(() => {
    const isExistingAvulso = existingData ? !existingData.workspace_id : false;
    setIsAvulso(isExistingAvulso);
    setFormData(existingData || { status: 'Ativo', contract_type: 'Mensal', client_type: 'Fixo' });
  }, [existingData, isOpen]);

  const handleChange = (field: keyof FinancialData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvulsoToggle = (checked: boolean) => {
    setIsAvulso(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, workspace_id: null }));
    } else {
      setFormData(prev => ({ ...prev, client_name: undefined }));
    }
  };

  const handleSave = () => {
    onSave(formData as FinancialData);
    onClose();
  };

  const availableWorkspaces = workspaces.filter(ws => !usedWorkspaceIds.includes(ws.id) || ws.id === existingData?.workspace_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingData?.id ? "Editar" : "Adicionar"} Lançamento Financeiro</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-center space-x-2">
            <Switch id="avulso-switch" checked={isAvulso} onCheckedChange={handleAvulsoToggle} disabled={!!existingData?.id} />
            <Label htmlFor="avulso-switch">É um serviço avulso?</Label>
          </div>

          {isAvulso ? (
            <div className="col-span-2 space-y-2">
              <Label htmlFor="client_name">Nome do Cliente (Avulso)</Label>
              <Input id="client_name" value={formData.client_name || ''} onChange={(e) => handleChange('client_name', e.target.value)} />
            </div>
          ) : (
            <div className="col-span-2 space-y-2">
              <Label htmlFor="workspace_id">Cliente (Workspace)</Label>
              <Select
                value={formData.workspace_id || ''}
                onValueChange={(value) => handleChange('workspace_id', value)}
                disabled={!!existingData?.id}
              >
                <SelectTrigger id="workspace_id">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkspaces.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="col-span-2 space-y-2">
            <Label htmlFor="service_description">Serviço Contratado</Label>
            <Textarea id="service_description" value={formData.service_description || ''} onChange={(e) => handleChange('service_description', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input id="amount" type="number" value={formData.amount || ''} onChange={(e) => handleChange('amount', parseFloat(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_day">Dia do Pagamento</Label>
            <Input id="payment_day" type="number" min="1" max="31" value={formData.payment_day || ''} onChange={(e) => handleChange('payment_day', parseInt(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_type">Tipo de Contrato</Label>
            <Select value={formData.contract_type} onValueChange={(value) => handleChange('contract_type', value)}>
              <SelectTrigger id="contract_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mensal">Mensal</SelectItem>
                <SelectItem value="Pacote">Pacote</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_type">Tipo de Cliente</Label>
            <Select value={formData.client_type} onValueChange={(value) => handleChange('client_type', value)}>
              <SelectTrigger id="client_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixo">Fixo</SelectItem>
                <SelectItem value="Freela">Freela</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}