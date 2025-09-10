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
    const { to, message } = await req.json();
    if (!to || !message) {
      throw new Error("Número de destino (to) e mensagem (message) são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("whatsapp_api_token, whatsapp_phone_number_id")
      .eq("id", 1)
      .single();

    if (settingsError) throw settingsError;
    if (!settings?.whatsapp_api_token || !settings?.whatsapp_phone_number_id) {
      throw new Error("Configurações da API do WhatsApp não encontradas. Verifique a página de Configurações.");
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${settings.whatsapp_phone_number_id}/messages`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.whatsapp_api_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { "body": message },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API Error:", errorData);
      throw new Error(`Erro ao enviar mensagem: ${errorData.error?.message || 'Falha na API do WhatsApp'}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Mensagem enviada com sucesso!" }), {
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