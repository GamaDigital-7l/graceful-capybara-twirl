"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ArrowLeft, Edit, Trash2, Brain } from "lucide-react";
import { SecondBrainClientModal, SecondBrainClient } from "@/components/SecondBrainClientModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const fetchSecondBrainClients = async (): Promise<SecondBrainClient[]> => {
  const { data, error } = await supabase.from("second_brain_clients").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const SecondBrainDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SecondBrainClient | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);

  const { data: clients, isLoading: isLoadingClients } = useQuery<SecondBrainClient[]>({
    queryKey: ["secondBrainClients"],
    queryFn: fetchSecondBrainClients,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || null);
      }
      setProfileLoading(false);
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!isProfileLoading && userRole !== 'admin') {
      navigate("/"); // Redirect non-admins
    }
  }, [isProfileLoading, userRole, navigate]);

  const createClientMutation = useMutation({
    mutationFn: async (client: Partial<SecondBrainClient>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");
      const { data, error } = await supabase.from("second_brain_clients").insert({ ...client, created_by: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainClients"] });
      showSuccess("Cliente adicionado ao Segundo Cérebro!");
      setIsClientModalOpen(false); // Close modal on success
    },
    onError: (e: Error) => showError(e.message),
  });

  const updateClientMutation = useMutation({
    mutationFn: async (client: Partial<SecondBrainClient>) => {
      if (!client.id) throw new Error("ID do cliente é necessário para atualização.");
      const { error } = await supabase.from("second_brain_clients").update(client).eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainClients"] });
      showSuccess("Cliente atualizado!");
      setIsClientModalOpen(false); // Close modal on success
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from("second_brain_clients").delete().eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainClients"] });
      showSuccess("Cliente deletado do Segundo Cérebro!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleSaveClient = (client: Partial<SecondBrainClient>) => {
    if (client.id) {
      updateClientMutation.mutate(client);
    } else {
      createClientMutation.mutate(client);
    }
  };

  if (isProfileLoading || userRole === null) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (userRole !== 'admin') {
    return null; // Should be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Segundo Cérebro</h1>
        </div>
        <Button onClick={() => { setSelectedClient(null); setIsClientModalOpen(true); }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Cliente
        </Button>
      </header>
      <main className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Meus Clientes</CardTitle>
            <CardDescription>Gerencie os clientes e seus prompts personalizados.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : clients && clients.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {clients.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-shadow flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium flex-grow truncate pr-2">{client.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedClient(client); setIsClientModalOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Cliente
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar Cliente
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja deletar o cliente "{client.name}" e todos os seus prompts? Esta ação é irreversível.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => client.id && deleteClientMutation.mutate(client.id)} className="bg-destructive hover:bg-destructive/90">
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <Link to={`/second-brain/${client.id}`} className="flex flex-col flex-grow">
                      <CardContent className="flex flex-col items-center justify-center pt-4 flex-grow">
                        <Avatar className="h-24 w-24 mb-4">
                          <AvatarImage src={client.photo_url || undefined} alt={client.name} />
                          <AvatarFallback>{client.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" className="w-full mt-auto">Ver Prompts</Button>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum cliente cadastrado ainda. Clique em "Adicionar Cliente" para começar.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <SecondBrainClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        existingClient={selectedClient}
      />
    </div>
  );
};

export default SecondBrainDashboard;