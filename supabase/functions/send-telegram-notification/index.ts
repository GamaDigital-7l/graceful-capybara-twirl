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
    const { message } = await req.json();
    if (!message) {
      throw new Error("A mensagem é obrigatória.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("telegram_bot_token, telegram_chat_id")
      .eq("id", 1)
      .single();

    if (settingsError) throw settingsError;

    const { telegram_bot_token, telegram_chat_id } = settings;

    if (!telegram_bot_token || !telegram_chat_id) {
      return new Response(JSON.stringify({ message: "Configurações do Telegram não encontradas." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Not an error, just not configured
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
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