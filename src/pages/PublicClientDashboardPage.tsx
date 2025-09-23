"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Users, TrendingUp, CalendarDays, FileText, CheckCircle, ListTodo, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface PublicDashboardData {
  workspace: {
    name: string;
    logo_url: string | null;
  };
  instagramInsights: {
    insight_date: string;
    followers: number;
    engagement_rate: number;
    reach: number;
    impressions: number;
    profile_views: number;
    posts_count: number;
    interactions?: number; // Adicionado
    raw_data: any;
  } | null;
  kanbanTasks: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    attachments: any[] | null;
    column_title: string;
  }[];
  kanbanColumns: {
    id: string;
    title: string;
  }[];
}

const fetchPublicDashboardData = async (token: string): Promise<PublicDashboardData> => {
  const { data, error } = await supabase.functions.invoke("get-public-client-dashboard-data", {
    body: { token },
  });
  if (error) throw new Error(error.message);
  return data;
};

const PublicClientDashboardPage = () => {
  const { token } = useParams<{ token: string }>();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PublicDashboardData, Error>({
    queryKey: ["publicClientDashboard", token],
    queryFn: () => fetchPublicDashboardData(token!),
    enabled: !!token,
    retry: false,
  });

  const handleImageClick = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setIsPreviewModalOpen(true);
  };

  const { pendingTasks, approvedTasks } = useMemo(() => {
    if (!data?.kanbanTasks) return { pendingTasks: [], approvedTasks: [] };
    const pending = data.kanbanTasks.filter(task => 
      task.column_title === "Em Produção" || task.column_title === "Editar" || task.column_title === "Solicitações" || task.column_title === "Para aprovação"
    );
    const approved = data.kanbanTasks.filter(task => task.column_title === "Aprovado");
    return { pendingTasks: pending, approvedTasks: approved };
  }, [data?.kanbanTasks]);

  const chartData = useMemo(() => {
    if (!data?.instagramInsights) return [];
    const insights = data.instagramInsights;
    return [{
      name: format(new Date(insights.insight_date), "dd/MM"),
      Seguidores: insights.followers,
      Engajamento: insights.engagement_rate,
      Alcance: insights.reach,
      Impressões: insights.impressions,
      Visualizações: insights.profile_views,
      Posts: insights.posts_count,
      Interações: insights.interactions || 0, // Incluído
    }];
  }, [data?.instagramInsights]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle className="text-destructive">Erro de Acesso</CardTitle></CardHeader>
          <CardContent><p>{error.message}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Dashboard Não Encontrado</CardTitle></CardHeader>
          <CardContent><p>Não foi possível carregar os dados do dashboard.</p></CardContent>
        </Card>
      </div>
    );
  }

  const { workspace, instagramInsights, kanbanTasks, kanbanColumns } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <header className="text-center mb-8">
        {workspace.logo_url && (
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={workspace.logo_url} alt={workspace.name} loading="lazy" /> {/* Adicionado loading="lazy" */}
            <AvatarFallback className="text-4xl">{workspace.name.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        <h1 className="text-3xl font-bold">{workspace.name}</h1>
        <p className="text-lg text-muted-foreground">Dashboard do Cliente</p>
        <p className="text-sm text-muted-foreground mt-2">Última atualização: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {instagramInsights && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><BarChart className="h-6 w-6" /> Insights do Instagram</h2>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Métricas Recentes ({format(new Date(instagramInsights.insight_date), 'dd/MM/yyyy', { locale: ptBR })})</CardTitle>
                <CardDescription>Visão geral do desempenho do Instagram.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Ajustado para 4 colunas */}
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Seguidores</p>
                  <p className="text-2xl font-bold">{instagramInsights.followers.toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Engajamento</p>
                  <p className="text-2xl font-bold">{instagramInsights.engagement_rate.toFixed(2)}%</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <Sparkles className="h-8 w-8 text-purple-500 mb-2" /> {/* Ícone para Interações */}
                  <p className="text-sm font-medium text-muted-foreground">Interações</p>
                  <p className="text-2xl font-bold">{(instagramInsights.interactions || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <BarChart className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Alcance</p>
                  <p className="text-2xl font-bold">{instagramInsights.reach.toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <BarChart className="h-8 w-8 text-orange-500 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Impressões</p>
                  <p className="text-2xl font-bold">{instagramInsights.impressions.toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <FileText className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Visualizações de Perfil</p>
                  <p className="text-2xl font-bold">{instagramInsights.profile_views.toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center">
                  <ListTodo className="h-8 w-8 text-gray-500 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Posts no Mês</p>
                  <p className="text-2xl font-bold">{instagramInsights.posts_count}</p>
                </div>
              </CardContent>
            </Card>

            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" /> Gráfico de Métricas</CardTitle>
                  <CardDescription>Visão geral das métricas inseridas.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Seguidores" fill="#8884d8" />
                      <Bar dataKey="Engajamento" fill="#82ca9d" />
                      <Bar dataKey="Interações" fill="#6a0dad" /> {/* Nova barra para Interações */}
                      <Bar dataKey="Alcance" fill="#ffc658" />
                      <Bar dataKey="Impressões" fill="#ff7300" />
                      <Bar dataKey="Visualizações" fill="#0088FE" />
                      <Bar dataKey="Posts" fill="#FF0054" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ListTodo className="h-6 w-6" /> Tarefas do Kanban</h2>
          <Card>
            <CardHeader>
              <CardTitle>Status das Tarefas</CardTitle>
              <CardDescription>Visão geral das tarefas em andamento e aprovadas.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><ListTodo className="h-5 w-5" /> Pendentes / Em Revisão ({pendingTasks.length})</h3>
                <div className="space-y-4">
                  {pendingTasks.length > 0 ? (
                    pendingTasks.map(task => (
                      <Card key={task.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {task.attachments?.[0]?.url && (
                            <AspectRatio ratio={16 / 9} className="bg-muted rounded-md mb-2 group relative">
                              <img src={task.attachments[0].url} alt={task.title} className="rounded-md object-cover w-full h-full" loading="lazy" /> {/* Adicionado loading="lazy" */}
                              <div 
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => handleImageClick(task.attachments[0].url)}
                              >
                                <BarChart className="h-8 w-8 text-white" />
                              </div>
                            </AspectRatio>
                          )}
                          <p className="font-medium">{task.title}</p>
                          {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                          <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                            <span className={cn("font-semibold", task.column_title === "Editar" && "text-yellow-600", task.column_title === "Para aprovação" && "text-blue-600")}>
                              {task.column_title}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {format(new Date(task.due_date), 'dd MMM', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Nenhuma tarefa pendente ou em revisão.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /> Aprovadas ({approvedTasks.length})</h3>
                <div className="space-y-4">
                  {approvedTasks.length > 0 ? (
                    approvedTasks.map(task => (
                      <Card key={task.id} className="border-green-500/50 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {task.attachments?.[0]?.url && (
                            <AspectRatio ratio={16 / 9} className="bg-muted rounded-md mb-2 group relative">
                              <img src={task.attachments[0].url} alt={task.title} className="rounded-md object-cover w-full h-full" loading="lazy" /> {/* Adicionado loading="lazy" */}
                              <div 
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => handleImageClick(task.attachments[0].url)}
                              >
                                <BarChart className="h-8 w-8 text-white" />
                              </div>
                            </AspectRatio>
                          )}
                          <p className="font-medium">{task.title}</p>
                          {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                          <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                            <span className="font-semibold text-green-600">{task.column_title}</span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {format(new Date(task.due_date), 'dd MMM', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Nenhuma tarefa aprovada ainda.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="text-center text-xs text-muted-foreground mt-12 pt-4 border-t">
        Gerado por Gama Creative Flow
      </footer>

      <ImagePreviewModal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
        imageUrl={previewImageUrl} 
      />
    </div>
  );
};

export default PublicClientDashboardPage;