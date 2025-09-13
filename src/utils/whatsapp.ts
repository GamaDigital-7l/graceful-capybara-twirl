import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "./toast";

export const sendWhatsAppNotification = async (to: string, message: string) => {
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
    console.error("Erro ao enviar notificação WhatsApp:", error);
    showError(`Erro ao enviar WhatsApp: ${error.message}`);
    throw error;
  }
};