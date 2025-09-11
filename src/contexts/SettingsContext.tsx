"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  app_name?: string;
  favicon_url?: string;
  logo_url?: string;
  primary_color?: string;
  background_color?: string;
  site_url?: string; // Adicionar site_url à interface
  whatsapp_message_template?: string; // Adicionar whatsapp_message_template
}

const SettingsContext = createContext<AppSettings | null | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  // Não lançar erro aqui, pois o contexto pode ser undefined durante a inicialização ou se não houver settings
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .single();
      
      if (error) {
        console.error("Error fetching app settings:", error);
      } else if (data) {
        setSettings(data);
      }
    };

    fetchSettings();

    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.1' }, (payload) => {
        setSettings(payload.new as AppSettings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (settings) {
      // Aplicar título
      if (settings.app_name) {
        document.title = settings.app_name;
      }

      // Aplicar Favicon
      const favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
      favicon.setAttribute('rel', 'icon');
      favicon.setAttribute('href', settings.favicon_url || '/favicon.ico');
      document.head.appendChild(favicon);

      // Aplicar cores
      const root = document.documentElement;
      if (settings.primary_color) {
        root.style.setProperty('--primary', settings.primary_color);
      }
      if (settings.background_color) {
        root.style.setProperty('--background', settings.background_color);
      }
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};