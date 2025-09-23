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
import { MoreVertical, Edit, Trash2, TrendingUp, Users, DollarSign, RefreshCw, MinusCircle, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FinancialControlModal, FinancialData } from "@/components/FinancialControlModal";
import { ExpenseModal, ExpenseData } from "@/components/ExpenseModal";
import { Workspace } from "./Dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatSaoPauloTime, parseSaoPauloDateString } from "@/utils/date-utils"; // Importar utilitário de data e parseSaoPauloDateString

const fetchFinancialData = async (period?: Date) => {
  let query = supabase.from("financial_control").select("*, workspace:workspaces(name)");
  if (period) {
    query = query.eq("period", formatSaoPauloTime(period, 'yyyy-MM-dd'));
  }
  query = query.order("period", { ascending: false }).order("client_name");
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const fetchExpenses = async (period?: Date) => {
  let query = supabase.from("expenses").select("*");
  if (period) {
    query = query.gte("expense_date", formatSaoPauloTime(startOfMonth(period), 'yyyy-MM-dd'))
                 .lt("expense_date", formatSaoPauloTime(addMonths(startOfMonth(period), 1), 'yyyy-MM-dd'));
  }
  query = query.order("expense_date", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data.map(expense => ({
    ...expense,
    expense_date: parseSaoPauloDateString(expense.expense_date), // Convert string to Date object using parseSaoPauloDateString
  }));
};

const fetchWorkspaces = async (): Promise<Workspace[]> => {
  const { data, error } = await supabase.from("workspaces").select("*");
  if (error) throw new Error(error.message);
  return data;
};

const FinancialDashboard = () => {
  const queryClient = useQueryClient();
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedIncomeData, setSelectedIncomeData] = useState<Partial<FinancialData> | null>(null);
  const [selectedExpenseData, setSelectedExpenseData] = useState<Partial<ExpenseData> | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Date>(startOfMonth(new Date()));

  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["financialData", selectedPeriod.toISOString()],
    queryFn: () => fetchFinancialData(selectedPeriod),
  });

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["expenses", selectedPeriod.toISOString()],
    queryFn: () => fetchExpenses(selectedPeriod),
  });

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const incomeMutation = useMutation({
    mutationFn: async (data: FinancialData) => {
      const { id, ...rest } = data;
      const dataToSave = { ...rest, period: formatSaoPauloTime(selectedPeriod, 'yyyy-MM-dd') };
      const query = id ? supabase.from("financial_control").update(dataToSave).eq("id", id) : supabase.from("financial_control").insert(dataToSave);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialData", selectedPeriod.toISOString()] });
      showSuccess("Dados de recebimento salvos com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const expenseMutation = useMutation({
    mutationFn: async (data: ExpenseData) => {
      const { id, expense_date, ...rest } = data;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // Ao salvar, formate a data para YYYY-MM-DD no fuso horário de São Paulo
      const dataToSave = { ...rest, expense_date: formatSaoPauloTime(expense_date, 'yyyy-MM-dd'), user_id: user.id };
      const query = id ? supabase.from("expenses").update(dataToSave).eq("id", id) : supabase.from("expenses").insert(dataToSave);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", selectedPeriod.toISOString()] });
      showSuccess("Gasto salvo com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_control").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialData", selectedPeriod.toISOString()] });
      showSuccess("Registro de recebimento deletado com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", selectedPeriod.toISOString()] });
      showSuccess("Registro de gasto deletado com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const startNewMonthMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('start_new_financial_month');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialData"] });
      setSelectedPeriod(startOfMonth(addMonths(selectedPeriod, 1)));
      showSuccess("Novo mês iniciado com sucesso! Clientes fixos foram transferidos.");
    },
    onError: (e: Error) => showError(e.message),
  });

  const { totalRevenue, activeClients, totalExpenses, netProfit, currentPeriodIncomeData, currentPeriodExpenseData } = useMemo(() => {
    if (!financialData && !expenses) return { totalRevenue: 0, activeClients: 0, totalExpenses: 0, netProfit: 0, currentPeriodIncomeData: [], currentPeriodExpenseData: [] };
    
    const activeIncomeData = financialData?.filter(d => d.status === 'Ativo') || [];
    const totalRev = activeIncomeData.reduce((sum, item) => sum + Number(item.amount), 0);
    const clientCount = activeIncomeData.length;

    const totalExp = expenses?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    const netProf = totalRev - totalExp;

    return {
      totalRevenue: totalRev,
      activeClients: clientCount,
      totalExpenses: totalExp,
      netProfit: netProf,
      currentPeriodIncomeData: financialData || [],
      currentPeriodExpenseData: expenses || [],
    };
  }, [financialData, expenses]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const usedWorkspaceIds = financialData?.filter(d => d.workspace_id).map(d => d.workspace_id!) || [];

  const monthOptions = useMemo(() => {
    const options = [];
    let current = startOfMonth(new Date());
    for (let i = 0; i < 12; i++) {
      options.push({
        value: current.toISOString(),
        label: formatSaoPauloTime(current, "MMMM yyyy"),
      });
      current = subMonths(current, 1);
    }
    return options.reverse();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedPeriod.toISOString()}
            onValueChange={(value) => setSelectedPeriod(new Date(value))}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Selecione o Mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Iniciar Novo Mês
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá criar um novo período financeiro, copiando apenas os clientes do tipo "Fixo" do mês atual. O histórico será preservado. Deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => startNewMonthMutation.mutate()}>
                  Sim, iniciar novo mês
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento do Mês (Ativos)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
            {isLoadingFinancial ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos no Mês</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
            {isLoadingFinancial ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{activeClients}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
            <MinusCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
            {isLoadingExpenses ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
            {(isLoadingFinancial || isLoadingExpenses) ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="income">Recebimentos</TabsTrigger>
            <TabsTrigger value="expenses">Gastos</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button onClick={() => { setSelectedIncomeData(null); setIsIncomeModalOpen(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Recebimento
            </Button>
            <Button onClick={() => { setSelectedExpenseData(null); setIsExpenseModalOpen(true); }} variant="outline">
              <MinusCircle className="h-4 w-4 mr-2" />
              Adicionar Gasto
            </Button>
          </div>
        </div>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Controle de Recebimentos do Mês ({formatSaoPauloTime(selectedPeriod, "MMMM yyyy")})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
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
                    currentPeriodIncomeData?.map(item => (
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
                                <DropdownMenuItem onClick={() => { setSelectedIncomeData(item); setIsIncomeModalOpen(true); }}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
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
                                <AlertDialogAction onClick={() => deleteIncomeMutation.mutate(item.id!)} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
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
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Controle de Gastos do Mês ({formatSaoPauloTime(selectedPeriod, "MMMM yyyy")})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingExpenses ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    currentPeriodExpenseData?.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.category || 'N/A'}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(Number(item.amount))}</TableCell>
                        <TableCell>{formatSaoPauloTime(item.expense_date, "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedExpenseData(item); setIsExpenseModalOpen(true); }}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Deletar</DropdownMenuItem></AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja deletar este registro de gasto? Esta ação é irreversível.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteExpenseMutation.mutate(item.id!)} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
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
        </TabsContent>
      </Tabs>
      {isIncomeModalOpen && (
        <FinancialControlModal
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          onSave={(data) => incomeMutation.mutate(data)}
          existingData={selectedIncomeData}
          workspaces={workspaces || []}
          usedWorkspaceIds={usedWorkspaceIds}
        />
      )}
      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={(data) => expenseMutation.mutate(data)}
          existingData={selectedExpenseData}
        />
      )}
    </div>
  );
};

export default FinancialDashboard;