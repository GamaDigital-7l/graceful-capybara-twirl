import { supabase } from "@/integrations/supabase/client";
import { showError } from "./toast";

export const correctGrammar = async (text: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke("correct-grammar", {
      body: { text },
    });

    if (error) {
      throw error;
    }

    return data.correctedText;
  } catch (error: any) {
    console.error("Erro ao corrigir gramática:", error);
    // Não mostrar um erro para o usuário aqui, apenas retornar o texto original
    // para que a tarefa ainda possa ser criada, mas sem correção.
    return text; 
  }
};