import { supabase } from "@/integrations/supabase/client";
import { showError } from "./toast";

interface GeminiInsightResponse {
  summary: string;
  key_metrics: { name: string; value: string }[];
  trends: string[];
  recommendations: string[];
  raw_output?: string; // Caso o parse JSON falhe
}

export const generateInstagramInsights = async (
  instagramData: any,
  prompt: string
): Promise<GeminiInsightResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("generate-instagram-insights", {
      body: { instagramData, prompt },
    });

    if (error) {
      throw error;
    }

    return data as GeminiInsightResponse;
  } catch (error: any) {
    console.error("Erro ao gerar insights do Instagram:", error);
    showError(`Erro ao gerar insights: ${error.message}`);
    return null;
  }
};