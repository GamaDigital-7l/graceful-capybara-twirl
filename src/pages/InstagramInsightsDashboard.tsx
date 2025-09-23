"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, BarChart, Users, TrendingUp, Calendar as CalendarIcon, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { generateInstagramInsights } from "@/utils/gemini";
import { useSettings } from "@/contexts/SettingsContext";
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
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatSaoPauloDate, formatSaoPauloTime } from "@/utils/date-utils"; // Importar utilitário de data

interface InstagramInsightData {
  id?: string;
  workspace_id: string;
  insight_date: string;
  followers: number;
  engagement_rate: number;
  reach: number;
  impressions: number;
  profile_views: number;
  posts_count: number;
  interactions?: number; // Adicionado
  raw_data: any;
}

interface GeminiInsightResponse {
  summary: string;
  key_metrics: { name: string; value: string }[];
  trends: string[];
  recommendations: string[];
  raw_output?: string;
}

const fetchWorkspaceDetails = async (workspaceId: string): Promise<{ name: string; logo_url: string | null }> => {
  const { data, error } = await supabase
    .from("workspaces")
    .select("name, logo_url")
    .eq("id", workspaceId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const InstagramInsightsDashboard = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const settings = useSettings();

  const [insightDate, setInsightDate] = useState<Date | undefined>(new Date());
  const [followers, setFollowers] = useState<number | string>("");
  const [engagementRate, setEngagementRate] = useState<number | string>("");
  const [reach, setReach] = useState<number | string>("");
  const [impressions, setImpressions] = useState<number | string>("");
  const [profileViews, setProfileViews] = useState<number | string>("");
  const [postsCount, setPostsCount] = useState<number | string>("");
  const [interactions, setInteractions] = useState<number | string>(""); // Novo estado

  const [reportStartDate, setReportStartDate] = useState<Date | undefined>(new Date());
  const [reportEndDate, setReportEndDate] = useState<Date | undefined>(new Date());

  const [geminiOutput, setGeminiOutput] = useState<GeminiInsightResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("Gere um resumo profissional, destacando métricas chave, tendências e recomendações para o cliente.");

  const { data: workspaceDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["workspaceDetails", workspaceId],
    queryFn: () => fetchWorkspaceDetails(workspaceId!),
    enabled: !!workspaceId,
  });

  const handleGenerateInsights = async () => {
    if (!workspaceId) {
      showError("ID do workspace não encontrado.");
      return;
    }
    if (!insightDate || followers === "" || engagementRate === "" || reach === "" || impressions === "" || profileViews === "" || postsCount === "" || interactions === "") {
      showError("Por favor, preencha todos os campos de métricas e a data.");
      return;
    }
    if (!settings?.gemini_api_key) {
      showError("Chave da API do Gemini não configurada. Por favor, adicione em Configurações.");
      return;
    }

    setIsGenerating(true);
    const loadingToastId = showLoading("Gerando insights com IA...");

    try {
      const instagramData = {
        date: await formatSaoPauloTime(insightDate, 'yyyy-MM-dd'),
        followers: Number(followers),
        engagement_rate: Number(engagementRate),
        reach: Number(reach),
        impressions: Number(impressions),
        profile_views: Number(profileViews),
        posts_count: Number(postsCount),
        interactions: Number(interactions), // Incluído
      };
      
      const insights = await generateInstagramInsights(instagramData, aiPrompt);
      
      // Garantir que posts_count e interactions estejam nas key_metrics se a IA não os incluiu
      if (insights && insights.key_metrics) {
        if (!insights.key_metrics.some(m => m.name === "Número de Posts")) {
          insights.key_metrics.push({ name: "Número de Posts", value: String(instagramData.posts_count) });
        }
        if (!insights.key_metrics.some(m => m.name === "Interações")) {
          insights.key_metrics.push({ name: "Interações", value: String(instagramData.interactions) });
        }
      }
      setGeminiOutput(insights);
      
      showSuccess("Insights gerados com sucesso!");
    } catch (error: any) {
      showError(`Erro ao processar dados: ${error.message}`);
      setGeminiOutput(null);
    } finally {
      setIsGenerating(false);
      dismissToast(loadingToastId);
    }
  };

  const chartData = useMemo(() => {
    if (!geminiOutput || !insightDate || followers === "" || engagementRate === "" || reach === "" || impressions === "" || profileViews === "" || postsCount === "" || interactions === "") return [];
    
    return [{
      name: formatSaoPauloTime(insightDate, "dd/MM"), // Isso ainda precisa ser await
      Seguidores: Number(followers),
      Engajamento: Number(engagementRate),
      Alcance: Number(reach),
      Impressões: Number(impressions),
      Visualizações: Number(profileViews),
      Posts: Number(postsCount),
      Interações: Number(interactions), // Incluído
    }];
  }, [geminiOutput, insightDate, followers, engagementRate, reach, impressions, profileViews, postsCount, interactions]);

  const [formattedChartData, setFormattedChartData] = useState<any[]>([]);
  const [formattedReportPeriod, setFormattedReportPeriod] = useState<string | null>(null);
  const [formattedInsightDateDisplay, setFormattedInsightDateDisplay] = useState<string | null>(null);

  useEffect(() => {
    const updateFormattedData = async () => {
      if (insightDate) {
        setFormattedChartData([{
          name: await formatSaoPauloTime(insightDate, "dd/MM"),
          Seguidores: Number(followers),
          Engajamento: Number(engagementRate),
          Alcance: Number(reach),
          Impressões: Number(impressions),
          Visualizações: Number(profileViews),
          Posts: Number(postsCount),
          Interações: Number(interactions),
        }]);
        setFormattedInsightDateDisplay(await formatSaoPauloDate(insightDate));
      } else {
        setFormattedChartData([]);
        setFormattedInsightDateDisplay(null);
      }

      if (reportStartDate && reportEndDate) {
        setFormattedReportPeriod(`${await formatSaoPauloDate(reportStartDate)} - ${await formatSaoPauloDate(reportEndDate)}`);
      } else {
        setFormattedReportPeriod("Selecione o período");
      }
    };
    updateFormattedData();
  }, [insightDate, followers, engagementRate, reach, impressions, profileViews, postsCount, interactions, reportStartDate, reportEndDate]);


  if (!workspaceId) {
    return <div className="p-8 text-center">Workspace não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link to={`/workspace/${workspaceId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Insights do Instagram</h1>
            <p className="text-sm text-muted-foreground">{isLoadingDetails ? <Skeleton className="h-4 w-32 mt-1" /> : workspaceDetails?.name}</p>
          </div>
        </div>
        {/* O botão de Exportar PDF foi removido */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inserir Dados do Instagram</CardTitle>
          <CardDescription>Preencha as métricas mais recentes do Instagram para gerar insights.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6"> {/* Ajustado padding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Ajustado para 3 colunas */}
            <div className="space-y-2">
              <Label htmlFor="insight-date">Data do Insight</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !insightDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formattedInsightDateDisplay ? (
                      formattedInsightDateDisplay
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={insightDate}
                    onSelect={setInsightDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followers">Seguidores</Label>
              <Input id="followers" type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Ex: 1500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engagement-rate">Taxa de Engajamento (%)</Label>
              <Input id="engagement-rate" type="number" step="0.01" value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)} placeholder="Ex: 2.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reach">Alcance</Label>
              <Input id="reach" type="number" value={reach} onChange={(e) => setReach(e.target.value)} placeholder="Ex: 10000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impressions">Impressões</Label>
              <Input id="impressions" type="number" value={impressions} onChange={(e) => setImpressions(e.target.value)} placeholder="Ex: 12000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-views">Visualizações de Perfil</Label>
              <Input id="profile-views" type="number" value={profileViews} onChange={(e) => setProfileViews(e.target.value)} placeholder="Ex: 500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posts-count">Número de Posts</Label>
              <Input id="posts-count" type="number" value={postsCount} onChange={(e) => setPostsCount(e.target.value)} placeholder="Ex: 15" />
            </div>
            <div className="space-y-2"> {/* Novo campo para Interações */}
              <Label htmlFor="interactions">Interações</Label>
              <Input id="interactions" type="number" value={interactions} onChange={(e) => setInteractions(e.target.value)} placeholder="Ex: 800" />
            </div>
          </div>
          
          <Label htmlFor="ai-prompt">Instruções para a IA (Opcional)</Label>
          <Textarea
            id="ai-prompt"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ex: Foco em crescimento de seguidores e engajamento."
            rows={3}
          />
          <Button onClick={handleGenerateInsights} disabled={isGenerating || !insightDate || followers === "" || engagementRate === "" || reach === "" || impressions === "" || profileViews === "" || postsCount === "" || interactions === ""}>
            {isGenerating ? "Gerando..." : <><Sparkles className="h-4 w-4 mr-2" /> Gerar Dashboard com IA</>}
          </Button>
        </CardContent>
      </Card>

      <div id="instagram-dashboard-content" className="space-y-6 p-4 bg-background rounded-lg shadow-md">
        <header className="text-center mb-8">
          {workspaceDetails?.logo_url && (
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={workspaceDetails.logo_url} alt={workspaceDetails.name} loading="lazy" /> {/* Adicionado loading="lazy" */}
              <AvatarFallback className="text-4xl">{workspaceDetails.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <h1 className="text-3xl font-bold">{workspaceDetails?.name || "Cliente"}</h1>
          <p className="text-lg text-muted-foreground">Relatório de Insights do Instagram</p>
          <p className="text-sm text-muted-foreground mt-2">Período: {formattedReportPeriod}</p>
        </header>

        {isGenerating && <Skeleton className="h-64 w-full" />}
        {geminiOutput && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Resumo da IA</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                <p className="whitespace-pre-wrap text-muted-foreground">{geminiOutput.summary}</p>
              </CardContent>
            </Card>

            {geminiOutput.key_metrics && geminiOutput.key_metrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" /> Métricas Chave</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6"> {/* Ajustado padding */}
                  {geminiOutput.key_metrics.map((metric, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-muted/20">
                      <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {geminiOutput.trends && geminiOutput.trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Tendências</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {geminiOutput.trends.map((trend, index) => (
                      <li key={index}>{trend}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {geminiOutput.recommendations && geminiOutput.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Recomendações</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {geminiOutput.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {geminiOutput.raw_output && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Saída Bruta da IA (Debug)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6"> {/* Ajustado padding */}
                  <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-md overflow-x-auto">{geminiOutput.raw_output}</pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {formattedChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" /> Gráfico de Métricas</CardTitle>
              <CardDescription>Visão geral das métricas inseridas.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] p-4 sm:p-6"> {/* Ajustado padding */}
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={formattedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Seguidores" fill="#8884d8" />
                  <Bar dataKey="Engajamento" fill="#82ca9d" />
                  <Bar dataKey="Alcance" fill="#ffc658" />
                  <Bar dataKey="Impressões" fill="#ff7300" />
                  <Bar dataKey="Visualizações" fill="#0088FE" />
                  <Bar dataKey="Posts" fill="#FF0054" />
                  <Bar dataKey="Interações" fill="#6a0dad" /> {/* Nova barra para Interações */}
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <footer className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
          Gerado por Gama Creative Flow
        </footer>
      </div>
    </div>
  );
};

export default InstagramInsightsDashboard;