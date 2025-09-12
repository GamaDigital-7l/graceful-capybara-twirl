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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message } = await req.json(); // Telegram webhook sends a 'message' object
    const text = message?.text;
    const telegramChatId = message?.chat?.id;

    if (!text || !telegramChatId) {
      throw new Error("Mensagem ou Chat ID do Telegram inválidos.");
    }

    // --- Lógica para extrair dados do gasto da mensagem ---
    // Exemplo de formato esperado: "Gasto: Descrição do item; Valor: 150.50; Categoria: Alimentação"
    const descriptionMatch = text.match(/Gasto:\s*(.*?);/i);
    const amountMatch = text.match(/Valor:\s*([\d.,]+);/i);
    const categoryMatch = text.match(/Categoria:\s*(.*?)(;|$)/i);

    const description = descriptionMatch ? descriptionMatch[1].trim() : null;
    const amountStr = amountMatch ? amountMatch[1].replace(',', '.').trim() : null;
    const category = categoryMatch ? categoryMatch[1].trim() : null;

    if (!description || !amountStr) {
      throw new Error("Formato da mensagem inválido. Use: 'Gasto: [Descrição]; Valor: [Valor]; Categoria: [Categoria (opcional)]'");
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error("Valor inválido. Certifique-se de que é um número.");
    }

    // --- Lógica para identificar o user_id ---
    // Opção 1: Mapear telegram_chat_id para user_id (requer tabela telegram_chat_user_map)
    const { data: userMap, error: mapError } = await supabaseAdmin
      .from('telegram_chat_user_map')
      .select('user_id')
      .eq('telegram_chat_id', telegramChatId.toString())
      .single();

    let userId = null;
    if (userMap) {
      userId = userMap.user_id;
    } else {
      // Se não houver mapeamento, você pode optar por:
      // 1. Rejeitar a requisição (mais seguro)
      // 2. Usar um user_id padrão (menos seguro, mas pode ser útil para testes ou admin)
      // Por enquanto, vamos rejeitar se não houver mapeamento.
      throw new Error("Usuário do Telegram não vinculado a uma conta no aplicativo. Por favor, vincule sua conta primeiro.");
    }

    // --- Inserir o gasto no banco de dados ---
    const { error: insertError } = await supabaseAdmin
      .from("expenses")
      .insert({
        user_id: userId,
        description: description,
        amount: amount,
        category: category,
        expense_date: new Date().toISOString().split('T')[0], // Data atual
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: "Gasto registrado com sucesso!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na Edge Function add-expense-from-telegram:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});