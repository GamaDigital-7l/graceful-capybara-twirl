import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput } from "@/components/PasswordInput";
import { Textarea } from "@/components/ui/textarea";

const fetchSettings = async () => {
  let { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();

  if (error && error.code === 'PGRST116') { // No rows found
    console.warn("No app_settings found with id=1. Creating a default entry.");
    const { data: newSettings, error: insertError } = await supabase
      .from("app_settings")
      .insert({ id: 1, app_name: "Gama Creative Flow", site_url: "http://localhost:32100" }) // Inserir valores padrão
      .select("*")
      .single();
    if (insertError) throw new Error(`Failed to create default app settings: ${insertError.message}`);
    data = newSettings;
  } else if (error) {
    throw new Error(error.message);
  }
  return data;
};

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [appName, setAppName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramBotTokenDeadlines, setTelegramBotTokenDeadlines] = useState("");
  const [telegramChatIdDeadlines, setTelegramChatIdDeadlines] = useState("");
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState("");
  const [whatsappApiToken, setWhatsappApiToken] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(""); // Novo estado
  const [evolutionApiToken, setEvolutionApiToken] = useState(""); // Novo estado
  const [evolutionApiInstance, setEvolutionApiInstance] = useState(""); // Novo estado
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name || "");
      setSiteUrl(settings.site_url || "");
      setPrimaryColor(settings.primary_color || "");
      setBackgroundColor(settings.background_color || "");
      setTelegramBotToken(settings.telegram_bot_token || "");
      setTelegramChatId(settings.telegram_chat_id || "");
      setTelegramBotTokenDeadlines(settings.telegram_bot_token_deadlines || "");
      setTelegramChatIdDeadlines(settings.telegram_chat_id_deadlines || "");
      setWhatsappMessageTemplate(settings.whatsapp_message_template || "");
      setWhatsappApiToken(settings.whatsapp_api_token || "");
      setWhatsappPhoneNumberId(settings.whatsapp_phone_number_id || "");
      setGeminiApiKey(settings.gemini_api_key || "");
      setEvolutionApiUrl(settings.evolution_api_url || ""); // Inicializar novo estado
      setEvolutionApiToken(settings.evolution_api_token || ""); // Inicializar novo estado
      setEvolutionApiInstance(settings.evolution_api_instance || ""); // Inicializar novo estado
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { error } = await supabase.from("app_settings").update(updatedData).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      showSuccess("Configurações salvas com sucesso!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleSave = async () => {
    setIsSaving(true);
    
    const cleanedSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

    updateSettingsMutation.mutate({
      app_name: appName,
      site_url: cleanedSiteUrl,
      primary_color: primaryColor,
      background_color: backgroundColor,
      telegram_bot_token: telegramBotToken,
      telegram_chat_id: telegramChatId,
      telegram_bot_token_deadlines: telegramBotTokenDeadlines,
      telegram_chat_id_deadlines: telegramChatIdDeadlines,
      whatsapp_message_template: whatsappMessageTemplate,
      whatsapp_api_token: whatsappApiToken,
      whatsapp_phone_number_id: whatsappPhoneNumberId,
      gemini_api_key: geminiApiKey,
      evolution_api_url: evolutionApiUrl, // Salvar novo campo
      evolution_api_token: evolutionApiToken, // Salvar novo campo
      evolution_api_instance: evolutionApiInstance, // Salvar novo campo
    });
    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Aplicação</CardTitle>
          <CardDescription>Personalize a aparência e as integrações do seu aplicativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6"> {/* Ajustado padding */}
          <div className="space-y-2">
            <Label htmlFor="appName">Nome do Aplicativo</Label>
            <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="siteUrl">URL do Site</Label>
            <Input id="siteUrl" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="http://localhost:32100" />
            <p className="text-xs text-muted-foreground">Essencial para gerar os links de aprovação corretos. Use http://localhost:32100 para testes.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Cor Primária (Botões e Destaques)</Label>
            <Input id="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            <p className="text-xs text-muted-foreground">Formato HSL sem 'hsl()'. Ex: 222.2 47.4% 11.2%</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Cor de Fundo Principal</Label>
            <Input id="backgroundColor" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            <p className="text-xs text-muted-foreground">Formato HSL sem 'hsl()'. Ex: 0 0% 100%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6"> {/* Ajustado padding */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp-template">Template de Mensagem (WhatsApp)</Label>
            <Textarea id="whatsapp-template" value={whatsappMessageTemplate} onChange={(e) => setWhatsappMessageTemplate(e.target.value)} rows={3} />
            <p className="text-xs text-muted-foreground">Esta mensagem será usada ao gerar links de aprovação.</p>
          </div>
          <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium">Integração WhatsApp Business API (Meta)</h3>
              <p className="text-sm text-muted-foreground">Preencha as credenciais da sua conta WhatsApp Business API para enviar notificações reais.</p>
              <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-token">Token da API do WhatsApp</Label>
                  <PasswordInput id="whatsapp-api-token" value={whatsappApiToken} onChange={(e) => setWhatsappApiToken(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone-number-id">ID do Número de Telefone do WhatsApp</Label>
                  <Input id="whatsapp-phone-number-id" value={whatsappPhoneNumberId} onChange={(e) => setWhatsappPhoneNumberId(e.target.value)} />
              </div>
          </div>
          <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium">Integração Evolution API (WhatsApp)</h3>
              <p className="text-sm text-muted-foreground">Conecte sua instância da Evolution API para enviar mensagens WhatsApp.</p>
              <div className="space-y-2">
                  <Label htmlFor="evolution-api-url">URL da Evolution API</Label>
                  <Input id="evolution-api-url" value={evolutionApiUrl} onChange={(e) => setEvolutionApiUrl(e.target.value)} placeholder="Ex: https://api.evolution-api.com" />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="evolution-api-token">Token da Evolution API</Label>
                  <PasswordInput id="evolution-api-token" value={evolutionApiToken} onChange={(e) => setEvolutionApiToken(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="evolution-api-instance">Nome da Instância da Evolution API</Label>
                  <Input id="evolution-api-instance" value={evolutionApiInstance} onChange={(e) => setEvolutionApiInstance(e.target.value)} placeholder="Ex: minha-instancia-whatsapp" />
              </div>
          </div>
          <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium">Notificações do Telegram (Aprovações/Edições)</h3>
              <div className="space-y-2">
                  <Label htmlFor="telegram-token">Token do Bot do Telegram</Label>
                  <PasswordInput id="telegram-token" value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="telegram-chat-id">Chat ID do Telegram</Label>
                  <Input id="telegram-chat-id" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
              </div>
          </div>
          <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium">Notificações do Telegram (Prazos de Tarefas)</h3>
              <p className="text-sm text-muted-foreground">Use um bot e chat diferentes para avisos de prazos.</p>
              <div className="space-y-2">
                  <Label htmlFor="telegram-token-deadlines">Token do Bot do Telegram (Prazos)</Label>
                  <PasswordInput id="telegram-token-deadlines" value={telegramBotTokenDeadlines} onChange={(e) => setTelegramBotTokenDeadlines(e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="telegram-chat-id-deadlines">Chat ID do Telegram (Prazos)</Label>
                  <Input id="telegram-chat-id-deadlines" value={telegramChatIdDeadlines} onChange={(e) => setTelegramChatIdDeadlines(e.target.value)} />
              </div>
          </div>
          <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-medium">Integração Google Gemini API</h3>
              <p className="text-sm text-muted-foreground">Chave da API para usar o Google Gemini para geração de insights.</p>
              <div className="space-y-2">
                  <Label htmlFor="gemini-api-key">Chave da API do Gemini</Label>
                  <PasswordInput id="gemini-api-key" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} />
              </div>
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={handleSave} disabled={isSaving || updateSettingsMutation.isPending} className="w-full">
        {isSaving ? "Salvando..." : "Salvar Todas as Alterações"}
        </Button>
    </div>
  );
};

export default SettingsPage;