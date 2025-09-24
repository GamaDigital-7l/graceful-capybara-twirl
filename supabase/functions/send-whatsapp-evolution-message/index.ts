import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      throw new Error("O número de telefone 'to' e a 'message' são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar as credenciais da Evolution API das configurações do app
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("evolution_api_url, evolution_api_token, evolution_api_instance")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.evolution_api_url || !settings?.evolution_api_token || !settings?.evolution_api_instance) {
      throw new Error("Credenciais da Evolution API (URL, Token, Instância) não configuradas nas configurações do aplicativo.");
    }

    const { evolution_api_url, evolution_api_token, evolution_api_instance } = settings;

    // Formatar o número de telefone para o padrão da Evolution API (geralmente 55DDD9XXXXYYYY)
    // Remover caracteres não numéricos e garantir que comece com 55
    const cleanedTo = to.replace(/\D/g, '');
    const formattedTo = cleanedTo.startsWith('55') ? cleanedTo : `55${cleanedTo}`;

    const evolutionApiEndpoint = `${evolution_api_url}/message/sendText/${evolution_api_instance}`;
    
    const evolutionResponse = await fetch(evolutionApiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolution_api_token, // O token da Evolution API geralmente vai no header 'apikey'
      },
      body: JSON.stringify({
        number: formattedTo,
        textMessage: {
          text: message,
        },
      }),
    });

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.json();
      console.error("Erro na API da Evolution:", errorData);
      throw new Error(`Erro ao enviar mensagem via Evolution API: ${errorData.message || 'Erro desconhecido'}`);
    }

    const responseData = await evolutionResponse.json();
    console.log("Mensagem Evolution API enviada com sucesso:", responseData);

    return new Response(JSON.stringify({ message: "Mensagem WhatsApp enviada com sucesso via Evolution API!", response: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro na Edge Function send-whatsapp-evolution-message:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});