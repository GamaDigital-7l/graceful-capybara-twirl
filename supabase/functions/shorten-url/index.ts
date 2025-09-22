import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar um código curto aleatório
function generateShortCode(length = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { longUrl } = await req.json();
    if (!longUrl) {
      throw new Error("longUrl é obrigatório.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let shortCode = generateShortCode();
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    // Tentar gerar um short_code único
    while (!isUnique && attempts < MAX_ATTEMPTS) {
      const { data, error } = await supabaseAdmin
        .from("short_urls")
        .select("short_code")
        .eq("short_code", shortCode)
        .single();

      if (error && error.code === 'PGRST116') { // No rows found, so it's unique
        isUnique = true;
      } else if (error) {
        throw error; // Other database error
      } else { // short_code already exists
        shortCode = generateShortCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error("Não foi possível gerar um short_code único após várias tentativas.");
    }

    // Inserir a URL curta no banco de dados
    const { error: insertError } = await supabaseAdmin
      .from("short_urls")
      .insert({ short_code: shortCode, long_url: longUrl });

    if (insertError) {
      throw new Error(`Erro ao salvar URL curta: ${insertError.message}`);
    }

    // Retornar o short_code gerado
    return new Response(JSON.stringify({ shortCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro na Edge Function shorten-url:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});