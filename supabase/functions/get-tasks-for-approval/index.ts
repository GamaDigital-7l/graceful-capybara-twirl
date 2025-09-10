import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) throw new Error("Token é obrigatório.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Validar o token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("public_approval_tokens")
      .select("group_id, workspace_id, expires_at, is_active")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) throw new Error("Link de aprovação inválido.");
    if (!tokenData.is_active || new Date(tokenData.expires_at) < new Date()) {
      throw new Error("Este link de aprovação expirou ou não é mais válido.");
    }

    // 2. Buscar dados do workspace e tarefas
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("name, logo_url")
      .eq("id", tokenData.workspace_id)
      .single();
    if (wsError) throw wsError;

    const { data: approvalColumn, error: colError } = await supabaseAdmin
      .from("columns")
      .select("id")
      .eq("group_id", tokenData.group_id)
      .eq("title", "Para aprovação")
      .single();
    if (colError || !approvalColumn) throw new Error("Coluna 'Para aprovação' não encontrada.");

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, attachments")
      .eq("column_id", approvalColumn.id)
      .order("position");
    if (tasksError) throw tasksError;

    return new Response(JSON.stringify({ workspace, tasks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});