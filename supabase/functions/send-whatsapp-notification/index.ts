import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase/v2.39.3"; // Usar a versão correta do supabase-js

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
      throw new Error("Número de telefone 'to' e 'message' são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Obter configurações do WhatsApp da tabela app_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("whatsapp_api_token, whatsapp_phone_number_id")
      .eq("id", 1)
      .single();

    if (settingsError) throw settingsError;

    const { whatsapp_api_token, whatsapp_phone_number_id } = settings;

    if (!whatsapp_api_token || !whatsapp_phone_number_id) {
      console.warn("Configurações da API do WhatsApp não encontradas. Apenas logando a mensagem.");
      return new Response(JSON.stringify({ message: "Configurações da API do WhatsApp não encontradas. Mensagem não enviada, apenas logada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Simular ou enviar a mensagem via WhatsApp Business API
    console.log(`Simulando envio de WhatsApp para ${to}: "${message}"`);
    console.log(`Usando whatsapp_phone_number_id: ${whatsapp_phone_number_id}`);
    // console.log(`Usando whatsapp_api_token: ${whatsapp_api_token.substring(0, 5)}...`); // Logar apenas parte do token por segurança

    // --- AQUI É ONDE VOCÊ INTEGRARIA A CHAMADA REAL À WHATSAPP BUSINESS API ---
    // Exemplo de como seria a chamada (você precisaria de uma conta e configuração real):
    /*
    const whatsappApiUrl = `https://graph.facebook.com/v19.0/${whatsapp_phone_number_id}/messages`;
    const response = await fetch(whatsappApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whatsapp_api_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro ao enviar WhatsApp:", errorData);
      throw new Error(`Erro na API do WhatsApp: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const responseData = await response.json();
    console.log("WhatsApp enviado com sucesso:", responseData);
    */
    // --- FIM DA INTEGRAÇÃO REAL ---

    return new Response(JSON.stringify({ message: "Notificação WhatsApp processada (simulada). Verifique os logs da Edge Function para detalhes." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in Edge Function send-whatsapp-notification:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});