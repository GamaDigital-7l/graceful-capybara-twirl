import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'; // Corrigido: adicionado 'from'
import { format } from "https://esm.sh/date-fns@2.30.0"; // Importar funções do date-fns diretamente
import { formatInTimeZone } from "https://esm.sh/date-fns-tz@2.0.0"; // Importar funções do date-fns-tz diretamente

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formId, responseData, submittedByUserId, clientName } = await req.json();

    if (!formId || !responseData) {
      throw new Error("formId e responseData são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch form details to get workspace_id and title
    const { data: form, error: formError } = await supabaseAdmin
      .from("briefing_forms")
      .select("title, workspace_id")
      .eq("id", formId)
      .single();

    if (formError || !form) {
      throw new Error(`Formulário não encontrado ou erro ao buscar: ${formError?.message}`);
    }

    // 2. Insert the response into briefing_responses
    const { error: insertError } = await supabaseAdmin
      .from("briefing_responses")
      .insert({
        form_id: formId,
        response_data: responseData,
        submitted_by_user_id: submittedByUserId || null,
        workspace_id: form.workspace_id,
        client_name: clientName || null,
      });

    if (insertError) {
      throw new Error(`Erro ao salvar a resposta do briefing: ${insertError.message}`);
    }

    // 3. Send Telegram notification
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("telegram_bot_token, telegram_chat_id, site_url")
      .eq("id", 1)
      .single();

    if (settingsError) console.error("Erro ao buscar configurações do Telegram:", settingsError);

    const { telegram_bot_token, telegram_chat_id, site_url } = settings || {};

    if (telegram_bot_token && telegram_chat_id) {
      let message = `🎉 *Nova Resposta de Briefing!* 🎉\n\n`;
      message += `*Formulário:* ${form.title}\n`;
      message += `*Cliente/Usuário:* ${clientName || (submittedByUserId ? `ID do Usuário: ${submittedByUserId}` : 'Público')}\n`;
      if (form.workspace_id) {
        // Optionally fetch workspace name if needed, but for now, just ID
        message += `*Workspace ID:* ${form.workspace_id}\n`;
      }
      if (site_url) {
        message += `\n[Ver Respostas no App](${site_url}/briefings/${formId}/responses)\n`;
      }
      
      const telegramUrl = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;
      await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegram_chat_id,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    } else {
      console.warn("Configurações do Telegram não encontradas. Notificação não enviada.");
    }

    return new Response(JSON.stringify({ message: "Resposta do briefing salva com sucesso!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Erro na Edge Function submit-briefing-response:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});