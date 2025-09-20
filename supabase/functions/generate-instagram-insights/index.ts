import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instagramData, prompt } = await req.json();

    if (!instagramData || !prompt) {
      throw new Error("Dados do Instagram e prompt são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar a chave da API do Gemini das configurações do app
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("gemini_api_key")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.gemini_api_key) {
      throw new Error("Chave da API do Gemini não configurada nas configurações do aplicativo.");
    }

    const GEMINI_API_KEY = settings.gemini_api_key;
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    const fullPrompt = `Analise os seguintes dados de insights do Instagram e gere um resumo profissional, destacando métricas chave, tendências e recomendações. Formate a saída como um objeto JSON com as seguintes chaves: "summary" (string), "key_metrics" (array de objetos {name: string, value: string}), "trends" (array de strings), "recommendations" (array de strings).

Dados do Instagram:
${JSON.stringify(instagramData, null, 2)}

Instruções adicionais: ${prompt}`;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error("Erro na API do Gemini:", errorData);
      throw new Error(`Erro na API do Gemini: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      throw new Error("Nenhum conteúdo gerado pela API do Gemini.");
    }

    // Tentar parsear o conteúdo gerado como JSON
    let parsedInsights;
    try {
      // O Gemini pode retornar o JSON dentro de um bloco de código markdown
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedInsights = JSON.parse(jsonMatch[1]);
      } else {
        parsedInsights = JSON.parse(generatedContent);
      }
    } catch (parseError) {
      console.warn("Não foi possível parsear a saída do Gemini como JSON. Retornando como texto bruto.", parseError);
      parsedInsights = { raw_output: generatedContent };
    }

    return new Response(JSON.stringify(parsedInsights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function generate-instagram-insights:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});