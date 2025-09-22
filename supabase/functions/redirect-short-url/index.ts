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
    const url = new URL(req.url);
    const shortCode = url.searchParams.get('code'); // Espera o código curto como parâmetro 'code'

    if (!shortCode) {
      return new Response("Código curto não fornecido.", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "" // Usar anon key para leitura pública
    );

    const { data, error } = await supabase
      .from("short_urls")
      .select("long_url")
      .eq("short_code", shortCode)
      .single();

    if (error || !data) {
      console.error("Erro ao buscar URL longa:", error?.message || "URL curta não encontrada.");
      return new Response("URL curta não encontrada ou expirada.", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
        status: 404,
      });
    }

    // Redirecionar para a URL longa
    return new Response(null, {
      status: 302, // Found / Moved Temporarily
      headers: {
        'Location': data.long_url,
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Erro na Edge Function redirect-short-url:", error.message);
    return new Response(`Erro interno do servidor: ${error.message}`, {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
      status: 500,
    });
  }
});