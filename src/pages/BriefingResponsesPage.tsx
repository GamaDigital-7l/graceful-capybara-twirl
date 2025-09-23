"use client";

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Eye, Trash2, MoreVertical, CalendarDays, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BriefingForm, BriefingResponse } from "@/types/briefing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BriefingResponseViewModal } from "@/components/BriefingResponseViewModal";

const fetchBriefingForm = async (formId: string): Promise<BriefingForm | null> => {
  const { data, error } = await supabase.from("briefing_forms").select("id, title, description, form_structure").eq("id", formId).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw new Error(error.message);
  }
  return data as BriefingForm;
};

const fetchBriefingResponses = async (formId: string): Promise<BriefingResponse[]> => {
  const { data, error } = await supabase
    .from("briefing_responses")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as BriefingResponse[];
};

const BriefingResponsesPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<BriefingResponse | null>(null);

  const { data: form, isLoading: isLoadingForm } = useQuery<BriefingForm | null>({
    queryKey: ["briefingFormDetails", formId],
    queryFn: () => fetchBriefingForm(formId!),
    enabled: !!formId,
    retry: false,
  });

  const { data: responses, isLoading: isLoadingResponses } = useQuery<BriefingResponse[]>({
    queryKey: ["briefingResponses", formId],
    queryFn: () => fetchBriefingResponses(formId!),
    enabled: !!formId,
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
      navigate("/"); // Redirect non-staff users
    }
  }, [isProfileLoading, userRole, navigate]);

  const deleteResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      const { error } = await supabase.from("briefing_responses").delete().eq("id", responseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["briefingResponses", formId] });
      showSuccess("Resposta deletada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleViewResponse = (response: BriefingResponse) => {
    setSelectedResponse(response);
    setIsViewModalOpen(true);
  };

  if (isProfileLoading || userRole === undefined || isLoadingForm || isLoadingResponses) {
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

  if (!form) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle className="text-destructive">Formulário Não Encontrado</CardTitle></CardHeader>
          <CardContent><p>O formulário de briefing que você está tentando acessar não existe.</p></CardContent>
        </Card>
      </div>
    );
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
          <div>
            <h1 className="text-2xl font-bold">Respostas para: {form.title}</h1>
            {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respostas Recebidas</CardTitle>
          <CardDescription>Visualize e gerencie as respostas enviadas para este formulário.</CardDescription>
        </CardHeader>
        <CardContent>
          {responses && responses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {responses.map((response) => (
                <Card key={response.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg font-medium flex-grow pr-2">{response.client_name || "Usuário Autenticado"}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <CalendarDays className="h-3 w-3" /> {format(new Date(response.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewResponse(response)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Resposta Completa
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar Resposta
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar esta resposta de "{response.client_name || "Usuário Autenticado"}"? Esta ação é irreversível.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteResponseMutation.mutate(response.id)} className="bg-destructive hover:bg-destructive/90">
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {/* Exibir um resumo das primeiras respostas */}
                      {Object.entries(response.response_data).slice(0, 2).map(([fieldId, value]) => {
                        const field = form.form_structure.find(f => f.id === fieldId);
                        if (!field) return null;
                        const displayValue = Array.isArray(value) ? value.join(", ") : value;
                        return <span key={fieldId} className="block">{field.label}: {displayValue}</span>;
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma resposta recebida para este formulário ainda.</p>
          )}
        </CardContent>
      </Card>

      <BriefingResponseViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        response={selectedResponse}
        form={form}
      />
    </div>
  );
};

export default BriefingResponsesPage;