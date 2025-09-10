import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendTelegramNotification = async (supabaseAdmin, message) => {
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("telegram_bot_token, telegram_chat_id")
    .eq("id", 1)
    .single();
  
  if (settings?.telegram_bot_token && settings?.telegram_chat_id) {
    const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, taskId, action, comment } = await req.json();
    if (!token || !taskId || !action) {
      throw new Error("token, taskId e action são obrigatórios.");
    }
    if (action === "edit" && !comment) {
      throw new Error("O comentário é obrigatório para solicitar edição.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Validar o token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("public_approval_tokens")
      .select("group_id, workspace_id, is_active, expires_at")
      .eq("token", token)
      .single();
    if (tokenError || !tokenData || !tokenData.is_active || new Date(tokenData.expires_at) < new Date()) {
      throw new Error("Link inválido ou expirado.");
    }

    // 2. Buscar a tarefa e o workspace
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("title, comments")
      .eq("id", taskId)
      .single();
    if (taskError) throw taskError;

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", tokenData.workspace_id)
      .single();
    if (wsError) throw wsError;

    // 3. Encontrar a coluna de destino
    const targetColumnTitle = action === "approve" ? "Aprovado" : "Editar";
    const { data: targetColumn, error: colError } = await supabaseAdmin
      .from("columns")
      .select("id")
      .eq("group_id", tokenData.group_id)
      .eq("title", targetColumnTitle)
      .single();
    if (colError || !targetColumn) throw new Error(`Coluna '${targetColumnTitle}' não encontrada.`);

    // 4. Executar a ação
    let updateData: { column_id: string; comments?: any[] } = { column_id: targetColumn.id };
    let notificationMessage = "";

    if (action === "edit") {
      const newComment = {
        id: new Date().getTime().toString(),
        text: comment,
        author: `${workspace.name} (Cliente)`,
        createdAt: new Date().toISOString(),
      };
      updateData.comments = [...(task.comments || []), newComment];
      notificationMessage = `*${workspace.name}* solicitou edição para a tarefa *"${task.title}"*.\nComentário: _${comment}_`;
    } else {
      notificationMessage = `*${workspace.name}* aprovou a tarefa *"${task.title}"*.`;
    }

    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update(updateData)
      .eq("id", taskId);
    if (updateError) throw updateError;

    // 5. Enviar notificação e retornar sucesso
    await sendTelegramNotification(supabaseAdmin, notificationMessage);

    return new Response(JSON.stringify({ message: `Tarefa ${action === 'approve' ? 'aprovada' : 'enviada para edição'} com sucesso!` }), {
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