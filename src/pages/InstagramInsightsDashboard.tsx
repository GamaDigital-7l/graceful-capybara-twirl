"use client";

import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Download, BarChart, LineChart, Users, TrendingUp, Eye, MessageSquare, FileText } from "lucide-react";
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
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  raw_data: any;
}

interface GeminiInsightResponse {
  summary: string;
  key_metrics: { name: string; value: string }[];
  trends: string[];
  recommendations: string[];
  raw_output?: string;
}

const fetchWorkspaceName = async (workspaceId: string): Promise<string> => {
  const { data, error } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();
  if (error) throw new Error(error.message);
  return data.name;
};

const fetchInstagramInsights = async (workspaceId: string): Promise<InstagramInsightData[]> => {
  const { data, error } = await supabase
    .from("instagram_insights")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("insight_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

const InstagramInsightsDashboard = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const settings = useSettings();

  const [rawInstagramData, setRawInstagramData] = useState("");
  const [geminiOutput, setGeminiOutput] = useState<GeminiInsightResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("Gere um resumo profissional, destacando métricas chave, tendências e recomendações para o cliente.");

  const { data: workspaceName, isLoading: isLoadingName } = useQuery({
    queryKey: ["workspaceName", workspaceId],
    queryFn: () => fetchWorkspaceName(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: historicalInsights, isLoading: isLoadingHistoricalInsights } = useQuery<InstagramInsightData[]>({
    queryKey: ["instagramInsights", workspaceId],
    queryFn: () => fetchInstagramInsights(workspaceId!),
    enabled: !!workspaceId,
  });

  const saveInsightMutation = useMutation({
    mutationFn: async (insight: InstagramInsightData) => {
      const { error } = await supabase.from("instagram_insights").insert(insight);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagramInsights", workspaceId] });
      showSuccess("Insight salvo com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const saveReportMutation = useMutation({
    mutationFn: async (report: { workspace_id: string; report_url: string; ai_summary?: string; period_start?: string; period_end?: string; created_by: string }) => {
      const { error } = await supabase.from("instagram_reports").insert(report);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Relatório PDF salvo e registrado!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleGenerateInsights = async () => {
    if (!workspaceId) {
      showError("ID do workspace não encontrado.");
      return;
    }
    if (!rawInstagramData.trim()) {
      showError("Por favor, insira os dados brutos do Instagram.");
      return;
    }
    if (!settings?.gemini_api_key) {
      showError("Chave da API do Gemini não configurada. Por favor, adicione em Configurações.");
      return;
    }

    setIsGenerating(true);
    const loadingToastId = showLoading("Gerando insights com IA...");

    try {
      const parsedData = JSON.parse(rawInstagramData);
      const insights = await generateInstagramInsights(parsedData, aiPrompt);
      setGeminiOutput(insights);

      // Tentar salvar o insight histórico
      if (parsedData.date && parsedData.followers) { // Exemplo básico de validação
        const newInsight: InstagramInsightData = {
          workspace_id: workspaceId,
          insight_date: parsedData.date, // Assumindo que 'date' está no raw_data
          followers: parsedData.followers,
          engagement_rate: parsedData.engagement_rate || 0,
          reach: parsedData.reach || 0,
          impressions: parsedData.impressions || 0,
          profile_views: parsedData.profile_views || 0,
          posts_count: parsedData.posts_count || 0,
          raw_data: parsedData,
        };
        await saveInsightMutation.mutateAsync(newInsight);
      }

      showSuccess("Insights gerados com sucesso!");
    } catch (error: any) {
      showError(`Erro ao processar dados: ${error.message}`);
      setGeminiOutput(null);
    } finally {
      setIsGenerating(false);
      dismissToast(loadingToastId);
    }
  };

  const handleExportPdf = async () => {
    if (!geminiOutput) {
      showError("Gere os insights primeiro para exportar o PDF.");
      return;
    }

    const loadingToastId = showLoading("Gerando PDF...");
    try {
      const dashboardElement = document.getElementById("instagram-dashboard-content");
      if (!dashboardElement) {
        throw new Error("Elemento do dashboard não encontrado.");
      }

      const canvas = await html2canvas(dashboardElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const pdfBlob = pdf.output('blob');
      const fileName = `relatorio_instagram_${workspaceName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      const filePath = `instagram-reports/${workspaceId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("instagram-reports")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload do PDF: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("instagram-reports")
        .getPublicUrl(uploadData.path);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado para salvar relatório.");

      await saveReportMutation.mutateAsync({
        workspace_id: workspaceId!,
        report_url: publicUrlData.publicUrl,
        ai_summary: geminiOutput.summary,
        period_start: historicalInsights?.[0]?.insight_date,
        period_end: historicalInsights?.[historicalInsights.length - 1]?.insight_date,
        created_by: user.id,
      });

      window.open(publicUrlData.publicUrl, "_blank");
      showSuccess("PDF gerado e salvo com sucesso!");
    } catch (error: any) {
      showError(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const chartData = useMemo(() => {
    if (!historicalInsights) return [];
    return historicalInsights.map(insight => ({
      date: format(new Date(insight.insight_date), "dd/MM"),
      Followers: insight.followers,
      Engagement: insight.engagement_rate,
      Reach: insight.reach,
      Impressions: insight.impressions,
      ProfileViews: insight.profile_views,
    }));
  }, [historicalInsights]);

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
            <p className="text-sm text-muted-foreground">{isLoadingName ? <Skeleton className="h-4 w-32 mt-1" /> : workspaceName}</p>
          </div>
        </div>
        <Button onClick={handleExportPdf} disabled={!geminiOutput || isGenerating}>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Brutos do Instagram</CardTitle>
          <CardDescription>Cole os dados JSON dos insights do Instagram aqui.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="raw-data">Dados JSON</Label>
          <Textarea
            id="raw-data"
            value={rawInstagramData}
            onChange={(e) => setRawInstagramData(e.target.value)}
            placeholder='Ex: {"date": "2023-10-26", "followers": 1500, "engagement_rate": 2.5, ...}'
            rows={8}
            className="font-mono text-xs"
          />
          <Label htmlFor="ai-prompt">Instruções para a IA (Opcional)</Label>
          <Textarea
            id="ai-prompt"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ex: Foco em crescimento de seguidores e engajamento."
            rows={3}
          />
          <Button onClick={handleGenerateInsights} disabled={isGenerating || !rawInstagramData.trim()}>
            {isGenerating ? "Gerando..." : <><Sparkles className="h-4 w-4 mr-2" /> Gerar Dashboard com IA</>}
          </Button>
        </CardContent>
      </Card>

      <div id="instagram-dashboard-content" className="space-y-6 p-4 bg-background rounded-lg shadow-md">
        <h2 className="text-2xl font-bold">Dashboard de Insights</h2>
        {isGenerating && <Skeleton className="h-64 w-full" />}
        {geminiOutput && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Resumo da IA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{geminiOutput.summary}</p>
              </CardContent>
            </Card>

            {geminiOutput.key_metrics && geminiOutput.key_metrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" /> Métricas Chave</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <CardContent>
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
                <CardContent>
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
                <CardContent>
                  <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-md overflow-x-auto">{geminiOutput.raw_output}</pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {isLoadingHistoricalInsights ? (
          <Skeleton className="h-96 w-full" />
        ) : chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Histórico de Métricas</CardTitle>
              <CardDescription>Evolução das métricas ao longo do tempo.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Followers" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Engagement" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="Reach" stroke="#ffc658" />
                  <Line type="monotone" dataKey="Impressions" stroke="#ff7300" />
                  <Line type="monotone" dataKey="ProfileViews" stroke="#0088FE" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InstagramInsightsDashboard;