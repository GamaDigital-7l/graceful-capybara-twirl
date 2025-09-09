"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PlusCircle, MoreVertical, Edit, Trash2, TrendingUp, Users, DollarSign, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FinancialControlModal, FinancialData } from "@/components/FinancialControlModal";
import { Workspace } from "./Dashboard";

const fetchFinancialData = async () => {
  const { data, error } = await supabase.from("financial_control").select("*, workspace:workspaces(name)");
  if (error) throw error;
  return data;
};

const fetchWorkspaces = async (): Promise<Workspace[]> => {
  const { data, error } = await supabase.from("workspaces").select("*");
  if (error) throw new Error(error.message);
  return data;
};

const FinancialDashboard = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<Partial<FinancialData> | null>(null);

  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["financialData"],
    queryFn: fetchFinancialData,
  });

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const mutation = useMutation({
    mutationFn: async (data: FinancialData) => {
      const { id, ...rest } = data;
      const query = id ? supabase.from("financial_control").update(rest).eq("id", id) : supabase.from("financial_control").insert(rest);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialData"] });
      showSuccess("Dados salvos com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_control").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialData"] });
      showSuccess("Registro deletado com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const resetMonthMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_financial_month');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialData"] });
      showSuccess("Mês zerado! Apenas clientes fixos foram mantidos.");
    },
    onError: (e: Error) => showError(e.message),
  });

  const { totalRevenue, activeClients, averageTicket } = useMemo(() => {
    if (!financialData) return { totalRevenue: 0, activeClients: 0, averageTicket: 0 };
    const activeData = financialData.filter(d => d.status === 'Ativo');
    const total = activeData.reduce((sum, item) => sum + Number(item.amount), 0);
    const count = activeData.length;
    return {
      totalRevenue: total,
      activeClients: count,
      averageTicket: count > 0 ? total / count : 0,
    };
  }, [financialData]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const usedWorkspaceIds = financialData?.filter(d => d.workspace_id).map(d => d.workspace_id!) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Zerar Mês
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá todos os clientes do tipo "Freela" e contratos do tipo "Pacote". Apenas clientes "Fixos" com contrato "Mensal" permanecerão. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetMonthMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                  Sim, zerar mês
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => { setSelectedData(null); setIsModalOpen(true); }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar Lançamento
          </Button>
        </div>
      </header>
      <main>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Mensal (Ativos)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingFinancial ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingFinancial ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeClients}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingFinancial ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(averageTicket)}</div>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Controle de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Dia Pgto.</TableHead>
                  <TableHead>Tipo Contrato</TableHead>
                  <TableHead>Tipo Cliente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingFinancial ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  financialData?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {item.workspace ? item.workspace.name : item.client_name}
                        {!item.workspace_id && <Badge variant="outline">Avulso</Badge>}
                      </TableCell>
                      <TableCell><Badge variant={item.status === 'Ativo' ? 'default' : 'destructive'}>{item.status}</Badge></TableCell>
                      <TableCell>{formatCurrency(Number(item.amount))}</TableCell>
                      <TableCell>{item.payment_day}</TableCell>
                      <TableCell>{item.contract_type}</TableCell>
                      <TableCell>{item.client_type}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedData(item); setIsModalOpen(true); }}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                              <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Deletar</DropdownMenuItem></AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>Tem certeza que deseja deletar este registro? Esta ação é irreversível.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      {isModalOpen && (
        <FinancialControlModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={(data) => mutation.mutate(data)}
          existingData={selectedData}
          workspaces={workspaces || []}
          usedWorkspaceIds={usedWorkspaceIds}
        />
      )}
    </div>
  );
};

export default FinancialDashboard;