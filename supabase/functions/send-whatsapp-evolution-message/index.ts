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
    const { to, whatsappGroupId, message: rawMessage } = await req.json();
    const message = String(rawMessage || '').trim();

    console.log("EF: Received 'to':", to);
    console.log("EF: Received 'whatsappGroupId':", whatsappGroupId);
    console.log("EF: Processed 'message':", message);

    if (!message) {
      throw new Error("A 'message' é obrigatória.");
    }
    if (!to && !whatsappGroupId) {
      throw new Error("É necessário fornecer um número de telefone 'to' ou um 'whatsappGroupId'.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("evolution_api_url, evolution_api_token, evolution_api_instance")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.evolution_api_url || !settings?.evolution_api_token || !settings?.evolution_api_instance) {
      throw new Error("Credenciais da Evolution API (URL, Token, Instância) não configuradas nas configurações do aplicativo.");
    }

    const { evolution_api_url, evolution_api_token, evolution_api_instance } = settings;

    let evolutionApiEndpoint: string;
    let requestBody: any;

    if (whatsappGroupId) {
      // Enviar para grupo
      evolutionApiEndpoint = `${evolution_api_url}/message/sendText/${evolution_api_instance}`;
      requestBody = {
        number: whatsappGroupId, // Evolution API pode usar 'number' para IDs de grupo também, ou 'groupId'
        options: {
          delay: 1200,
        },
        text: message,
      };
      console.log("EF: Sending to WhatsApp Group ID:", whatsappGroupId);
    } else {
      // Enviar para número individual
      const cleanedTo = to.replace(/\D/g, '');
      const formattedTo = cleanedTo.startsWith('55') ? cleanedTo : `55${cleanedTo}`;
      evolutionApiEndpoint = `${evolution_api_url}/message/sendText/${evolution_api_instance}`;
      requestBody = {
        number: formattedTo,
        options: {
          delay: 1200,
        },
        text: message,
      };
      console.log("EF: Sending to individual number:", formattedTo);
    }

    console.log("EF: Sending request to Evolution API with endpoint:", evolutionApiEndpoint);
    console.log("EF: Request Body:", JSON.stringify(requestBody, null, 2));

    const evolutionResponse = await fetch(evolutionApiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolution_api_token,
      },
      body: JSON.stringify(requestBody),
    });

    if (!evolutionResponse.ok) {
      let errorBody;
      const contentType = evolutionResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorBody = await evolutionResponse.json();
      } else {
        errorBody = await evolutionResponse.text();
      }
      console.error("Erro na API da Evolution:", errorBody);
      throw new Error(`Erro ao enviar mensagem via Evolution API (Status: ${evolutionResponse.status}): ${typeof errorBody === 'string' ? errorBody : errorBody.message || JSON.stringify(errorBody) || 'Erro desconhecido'}`);
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