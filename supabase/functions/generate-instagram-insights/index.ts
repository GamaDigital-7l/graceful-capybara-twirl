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
    console.log("EF: Iniciando generate-instagram-insights.");
    const { instagramData, prompt } = await req.json();
    console.log("EF: Dados recebidos:", { instagramData, prompt });

    if (!instagramData || !prompt) {
      throw new Error("Dados do Instagram e prompt são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    console.log("EF: Cliente Supabase Admin criado.");

    // Buscar a chave da API do Gemini das configurações do app
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("app_settings")
      .select("gemini_api_key")
      .eq("id", 1)
      .single();
    console.log("EF: Configurações do app buscadas.");

    if (settingsError || !settings?.gemini_api_key) {
      console.error("EF: Erro ou chave da API do Gemini não encontrada nas configurações:", settingsError);
      throw new Error("Chave da API do Gemini não configurada nas configurações do aplicativo.");
    }

    const GEMINI_API_KEY = settings.gemini_api_key;
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    console.log("EF: Chave da API do Gemini obtida. URL da API:", GEMINI_API_URL);

    // PROMPT REFINADO
    const fullPrompt = `Você é um especialista em marketing digital e está criando um relatório de insights do Instagram para um cliente. Analise os seguintes dados e gere um resumo profissional, destacando as métricas chave, tendências e recomendações acionáveis. O relatório deve ser conciso, claro e focado em resultados para o cliente.

Formate a saída como um objeto JSON com as seguintes chaves:
"summary": (string) Um resumo executivo profissional.
"key_metrics": (array de objetos {name: string, value: string}) As 3-5 métricas mais importantes, incluindo "Seguidores", "Taxa de Engajamento", "Alcance", "Impressões", "Visualizações de Perfil" e "Número de Posts". Formate os valores de forma amigável (ex: "1.500", "2.5%", "10K").
"trends": (array de strings) 2-3 tendências observadas nos dados.
"recommendations": (array de strings) 2-3 recomendações práticas para o cliente.

Dados do Instagram:
${JSON.stringify(instagramData, null, 2)}

Instruções adicionais do usuário: ${prompt}`;
    console.log("EF: Prompt completo preparado.");

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    });
    console.log("EF: Resposta da API do Gemini recebida. Status:", geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error("EF: Erro na API do Gemini (status não-2xx):", errorData);
      throw new Error(`Erro na API do Gemini: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("EF: Conteúdo gerado pelo Gemini:", generatedContent);

    if (!generatedContent) {
      console.error("EF: Nenhum conteúdo gerado pela API do Gemini.");
      throw new Error("Nenhum conteúdo gerado pela API do Gemini.");
    }

    // Tentar parsear o conteúdo gerado como JSON
    let parsedInsights;
    try {
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedInsights = JSON.parse(jsonMatch[1]);
        console.log("EF: Conteúdo JSON extraído e parseado.");
      } else {
        parsedInsights = JSON.parse(generatedContent);
        console.log("EF: Conteúdo diretamente parseado como JSON.");
      }
    } catch (parseError) {
      console.warn("EF: Não foi possível parsear a saída do Gemini como JSON. Retornando como texto bruto.", parseError);
      parsedInsights = { raw_output: generatedContent };
    }
    console.log("EF: Insights parseados com sucesso.");

    return new Response(JSON.stringify(parsedInsights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("EF: Erro na Edge Function generate-instagram-insights:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});