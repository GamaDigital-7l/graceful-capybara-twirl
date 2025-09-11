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
    const { userId, email, password, full_name, avatar_url } = await req.json();
    if (!userId) {
      throw new Error("User ID é obrigatório.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Atualizar auth.users
    const authUpdates: { email?: string; password?: string; user_metadata?: { full_name?: string } } = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password;
    
    // user_metadata não é diretamente atualizável via admin.updateUser para full_name.
    // full_name e avatar_url são atualizados na tabela profiles.
    
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUser(userId, authUpdates);
      if (authError) throw authError;
    }

    // Atualizar public.profiles
    const profileUpdates: { full_name?: string; avatar_url?: string } = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);
      if (profileError) throw profileError;
    }

    return new Response(JSON.stringify({ message: "Usuário atualizado com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na Edge Function update-user-profile:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});