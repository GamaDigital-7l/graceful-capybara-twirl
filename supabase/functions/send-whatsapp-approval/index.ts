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

    // 1. Buscar configurações e dados do workspace
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("whatsapp_api_token, whatsapp_phone_number_id, whatsapp_message_template")
      .eq("id", 1)
      .single();
    if (settingsError) throw new Error("Erro ao buscar configurações da aplicação.");
    if (!settings.whatsapp_api_token || !settings.whatsapp_phone_number_id) {
      throw new Error("Credenciais da API do WhatsApp não configuradas nas Configurações.");
    }

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("client_whatsapp_number")
      .eq("id", workspaceId)
      .single();
    if (workspaceError) throw new Error("Erro ao buscar dados do workspace.");
    if (!workspace.client_whatsapp_number) {
      throw new Error("O número de WhatsApp do cliente não está configurado neste workspace.");
    }

    // 2. Gerar e salvar o token de aprovação
    const token = uuidv4();
    const { error: tokenError } = await supabaseAdmin
      .from("public_approval_tokens")
      .insert({ token, group_id: groupId, workspace_id: workspaceId });
    if (tokenError) throw new Error("Erro ao criar token de aprovação no banco de dados.");

    // 3. Montar a mensagem e enviar via WhatsApp
    const approvalUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.co', '.app')}/approve/${token}`;
    const messageBody = `${settings.whatsapp_message_template}\n\n${approvalUrl}`;
    const clientPhoneNumber = workspace.client_whatsapp_number.replace(/\D/g, ''); // Limpa o número

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${settings.whatsapp_phone_number_id}/messages`, // API Version Updated
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.whatsapp_api_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: clientPhoneNumber,
          type: "text",
          text: { body: messageBody },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API Error:", errorData);
      throw new Error(`Erro da API do WhatsApp: ${errorData.error?.message || 'Verifique as credenciais e o número do cliente.'}`);
    }

    return new Response(JSON.stringify({ message: "Mensagem de aprovação enviada com sucesso!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Detailed error in send-whatsapp-approval:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});