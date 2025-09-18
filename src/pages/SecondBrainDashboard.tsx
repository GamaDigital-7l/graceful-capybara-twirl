import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, MoreVertical } from "lucide-react";
import { SecondBrainClientModal, SecondBrainClient } from "@/components/SecondBrainClientModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// A interface SecondBrainClient já é importada de "@/components/SecondBrainClientModal"
// Removendo a declaração duplicada aqui.

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
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isProfileLoading, setProfileLoading] = useState(true);

  const { data: clients, isLoading: isLoadingClients } = useQuery<SecondBrainClient[]>({
    queryKey: ["secondBrainClients"],
    queryFn: fetchSecondBrainClients,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      setProfileLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profileError) throw profileError;
          setUserRole(profile?.role || null);
        } else {
          setUserRole(null);
        }
      } catch (error: any) {
        console.error("Error fetching user role:", error.message);
        showError(`Erro ao carregar perfil: ${error.message}`);
        setUserRole(null);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!isProfileLoading && userRole !== 'admin' && userRole !== 'equipe') {
      navigate("/");
    }
  }, [isProfileLoading, userRole, navigate]);

  const saveClientMutation = useMutation({
    mutationFn: async (client: Partial<SecondBrainClient>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      let currentClientId = client.id;

      if (!currentClientId) {
        const { data: newClient, error: insertError } = await supabase
          .from("second_brain_clients")
          .insert({ name: client.name, created_by: user.id })
          .select("id")
          .single();
        if (insertError) throw insertError;
        currentClientId = newClient.id;
      }

      const { error: updateError } = await supabase
        .from("second_brain_clients")
        .update({ name: client.name })
        .eq("id", currentClientId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secondBrainClients"] });
      showSuccess("Cliente salvo com sucesso!");
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

  const handleSaveClient = async (client: Partial<SecondBrainClient>) => {
    await saveClientMutation.mutateAsync(client);
  };

  if (isProfileLoading || userRole === undefined) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (userRole !== 'admin' && userRole !== 'equipe') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
          <CardContent><p>Você não tem permissão para acessar esta página.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Segundo Cérebro</h1>
        <Button onClick={() => { setSelectedClient(null); setIsClientModalOpen(true); }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Cliente
        </Button>
      </div>
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
                    <CardContent className="flex-grow flex items-end justify-center p-4">
                      <Button variant="outline" className="w-full">Ver Prompts</Button>
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