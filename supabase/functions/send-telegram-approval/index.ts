import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { v4 as uuidv4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { groupId, workspaceId } = await req.json();
    if (!groupId || !workspaceId) {
      throw new Error("groupId e workspaceId são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Buscar configurações e nome do workspace
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("telegram_bot_token, telegram_chat_id, site_url")
      .eq("id", 1)
      .single();
    if (settingsError) throw new Error("Erro ao buscar configurações da aplicação.");
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      throw new Error("Credenciais do Telegram não configuradas.");
    }
    if (!settings.site_url) {
      throw new Error("A 'URL do Site' não está configurada na página de Configurações.");
    }

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();
    if (workspaceError) throw new Error("Erro ao buscar nome do workspace.");

    // 2. Gerar e salvar o token de aprovação
    const token = uuidv4();
    const { error: tokenError } = await supabaseAdmin
      .from("public_approval_tokens")
      .insert({ token, group_id: groupId, workspace_id: workspaceId });
    if (tokenError) throw new Error("Erro ao criar token de aprovação.");

    // 3. Montar a mensagem e enviar
    const approvalUrl = `${settings.site_url}/approve/${token}`;
    const message = `Olá! Os posts para o cliente *${workspace.name}* estão prontos para aprovação.\n\nPor favor, acesse o link a seguir para revisar:\n${approvalUrl}`;

    const telegramUrl = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro na API do Telegram: ${errorData.description}`);
    }

    return new Response(JSON.stringify({ message: "Notificação enviada com sucesso!" }), {
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