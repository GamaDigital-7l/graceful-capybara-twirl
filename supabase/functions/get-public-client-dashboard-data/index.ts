import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) throw new Error("Token é obrigatório.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Validar o token e obter IDs do workspace e grupo
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("public_client_dashboards")
      .select("workspace_id, group_id, expires_at, is_active")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) throw new Error("Link do dashboard inválido.");
    if (!tokenData.is_active || new Date(tokenData.expires_at) < new Date()) {
      throw new Error("Este link do dashboard expirou ou não é mais válido.");
    }

    const { workspace_id, group_id } = tokenData;

    // 2. Buscar detalhes do workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("name, logo_url")
      .eq("id", workspace_id)
      .single();
    if (wsError) throw wsError;

    // 3. Buscar o último Instagram Insight para o workspace
    const { data: latestInsight, error: insightError } = await supabaseAdmin
      .from("instagram_insights")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("insight_date", { ascending: false })
      .limit(1)
      .single();
    // Não lançar erro se não houver insights, apenas retornar null
    if (insightError && insightError.code !== 'PGRST116') console.error("Error fetching latest insight:", insightError);

    // 4. Buscar tarefas do Kanban para o grupo (mês)
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from("columns")
      .select("id, title")
      .eq("group_id", group_id)
      .order("position");
    if (columnsError) throw columnsError;

    const columnIds = columns.map(c => c.id);
    const { data: tasksData, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, due_date, attachments, column_id, columns(title)")
      .in("column_id", columnIds)
      .order("position");
    if (tasksError) throw tasksError;

    const tasks = tasksData.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      attachments: task.attachments,
      column_title: (task.columns as { title: string })?.title,
    }));

    return new Response(JSON.stringify({
      workspace,
      instagramInsights: latestInsight,
      kanbanTasks: tasks,
      kanbanColumns: columns,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in Edge Function get-public-client-dashboard-data:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});