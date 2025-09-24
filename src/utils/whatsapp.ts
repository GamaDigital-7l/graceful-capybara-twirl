import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "./toast";

// Renomeada a função original para ser mais específica (assumindo que era para Meta ou genérica)
export const sendWhatsAppMetaNotification = async (to: string, message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
      body: { to, message },
    });

    if (error) {
      throw error;
    }

    showSuccess(data.message || "Notificação WhatsApp enviada (simulada)!");
    return data;
  } catch (error: any) {
    console.error("Erro ao enviar notificação WhatsApp (Meta/Genérica):", error);
    showError(`Erro ao enviar WhatsApp (Meta/Genérica): ${error.message}`);
    throw error;
  }
};

// Nova função para enviar mensagens via Evolution API
export const sendWhatsAppEvolutionNotification = async (to: string, message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp-evolution-message", {
      body: { to, message },
    });

    if (error) {
      throw error;
    }

    showSuccess(data.message || "Mensagem WhatsApp enviada via Evolution API!");
    return data;
  } catch (error: any) {
    console.error("Erro ao enviar notificação WhatsApp (Evolution API):", error);
    showError(`Erro ao enviar WhatsApp (Evolution API): ${error.message}`);
    throw error;
  }
};