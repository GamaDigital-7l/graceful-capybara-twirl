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

    const payload = await req.json();
    console.log("Received Telegram webhook payload:", JSON.stringify(payload, null, 2));

    const message = payload?.message;
    const text = message?.text;
    const telegramChatId = message?.chat?.id;

    if (!text || !telegramChatId) {
      console.error("Invalid Telegram message or chat ID received.");
      throw new Error("Mensagem ou Chat ID do Telegram inválidos.");
    }

    console.log(`Processing message from chat ID ${telegramChatId}: "${text}"`);

    // --- Lógica para extrair dados do gasto da mensagem ---
    // Exemplo de formato esperado: "Gasto: Descrição do item; Valor: 150.50; Categoria: Alimentação"
    const descriptionMatch = text.match(/Gasto:\s*(.*?)(;|$)/i);
    const amountMatch = text.match(/Valor:\s*([\d.,R$]+)(;|$)/i); // Ajustado para incluir R$ no regex
    const categoryMatch = text.match(/Categoria:\s*(.*?)(;|$)/i);

    const description = descriptionMatch ? descriptionMatch[1].trim() : null;
    let amountStr = amountMatch ? amountMatch[1].trim() : null;
    const category = categoryMatch ? categoryMatch[1].trim() : null;

    if (!description || !amountStr) {
      console.error("Failed to parse description or amount from message.");
      throw new Error("Formato da mensagem inválido. Use: 'Gasto: [Descrição]; Valor: [Valor]; Categoria: [Categoria (opcional)]'");
    }

    // Remover "R$" e substituir vírgula por ponto para garantir o parseFloat
    amountStr = amountStr.replace(/R\$/i, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      console.error(`Parsed amount "${amountStr}" is not a valid number.`);
      throw new Error("Valor inválido. Certifique-se de que é um número.");
    }

    console.log(`Parsed: Description='${description}', Amount='${amount}', Category='${category}'`);

    // --- Lógica para identificar o user_id ---
    const { data: userMap, error: mapError } = await supabaseAdmin
      .from('telegram_chat_user_map')
      .select('user_id')
      .eq('telegram_chat_id', telegramChatId.toString())
      .single();

    if (mapError) {
      console.error("Error fetching user map:", mapError.message);
      throw new Error("Erro ao buscar mapeamento de usuário do Telegram.");
    }

    let userId = null;
    if (userMap) {
      userId = userMap.user_id;
      console.log(`Found user ID ${userId} for Telegram chat ID ${telegramChatId}`);
    } else {
      console.warn(`No user ID found for Telegram chat ID ${telegramChatId}.`);
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

    if (insertError) {
      console.error("Error inserting expense into database:", insertError.message);
      throw insertError;
    }

    console.log("Expense successfully recorded.");

    return new Response(JSON.stringify({ message: "Gasto registrado com sucesso!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in Edge Function add-expense-from-telegram:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});