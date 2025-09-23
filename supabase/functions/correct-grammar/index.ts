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
    const { text } = await req.json();

    if (!text) {
      throw new Error("O texto é obrigatório para correção gramatical.");
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

    const fullPrompt = `Corrija a gramática e a ortografia do seguinte texto. Retorne apenas o texto corrigido, sem qualquer introdução ou explicação.

Texto a ser corrigido: "${text}"`;

    const geminiRequestBody = {
      contents: [{ parts: [{ text: fullPrompt }] }],
    };

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(`Erro na API do Gemini: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const geminiData = await geminiResponse.json();
    const correctedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!correctedText) {
      throw new Error("Nenhum conteúdo corrigido gerado pela API do Gemini.");
    }

    return new Response(JSON.stringify({ correctedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro na Edge Function correct-grammar:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});