"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { Textarea } from "@/components/ui/textarea";

const fetchSettings = async () => {
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
};

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [appName, setAppName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  // const [logoFile, setLogoFile] = useState<File | null>(null); // Removido
  // const [faviconFile, setFaviconFile] = useState<File | null>(null); // Removido
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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
      setWhatsappMessageTemplate(settings.whatsapp_message_template || "");
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
    setIsUploading(true);
    // let logoUrl = settings.logo_url; // Removido
    // let faviconUrl = settings.favicon_url; // Removido

    // if (logoFile) {
    //   const { data, error } = await supabase.storage.from("logos").upload(`public/logo`, logoFile, { upsert: true });
    //   if (error) { showError("Erro ao enviar logo."); setIsUploading(false); return; }
    //   logoUrl = supabase.storage.from("logos").getPublicUrl(data.path).data.publicUrl;
    // }

    // Favicon agora é gerenciado diretamente no index.html, não precisa de upload aqui
    // if (faviconFile) {
    //   const { data, error } = await supabase.storage.from("logos").upload(`public/favicon`, faviconFile, { upsert: true });
    //   if (error) { showError("Erro ao enviar favicon."); setIsUploading(false); return; }
    //   faviconUrl = supabase.storage.from("logos").getPublicUrl(data.path).data.publicUrl;
    // }

    // Remove a barra final da URL do site antes de salvar
    const cleanedSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

    updateSettingsMutation.mutate({
      app_name: appName,
      site_url: cleanedSiteUrl,
      primary_color: primaryColor,
      background_color: backgroundColor,
      // logo_url: logoUrl, // Removido
      // favicon_url: faviconUrl, // Removido
      telegram_bot_token: telegramBotToken,
      telegram_chat_id: telegramChatId,
      whatsapp_message_template: whatsappMessageTemplate,
    });
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8 flex items-center">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </header>
      <main className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Aplicação</CardTitle>
            <CardDescription>Personalize a aparência e as integrações do seu aplicativo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="appName">Nome do Aplicativo</Label>
              <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="siteUrl">URL do Site</Label>
              <Input id="siteUrl" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="http://localhost:32100" />
              <p className="text-xs text-muted-foreground">Essencial para gerar os links de aprovação corretos. Use http://localhost:32100 para testes.</p>
            </div>
            {/* Logo upload removido */}
            {/* <div className="space-y-2">
              <Label>Logo (para tela de login)</Label>
              <div className="flex items-center gap-2">
                <Input id="logo-display" placeholder={logoFile ? logoFile.name : "Nenhum arquivo selecionado"} readOnly className="flex-grow" />
                <Button asChild variant="outline"><Label htmlFor="logo-upload" className="cursor-pointer"><Upload className="h-4 w-4 mr-2" /> <Input id="logo-upload" type="file" className="sr-only" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} accept="image/*" /></Label></Button>
              </div>
            </div> */}
            {/* Favicon upload removido */}
            {/* <div className="space-y-2">
              <Label>Favicon (ícone da aba do navegador)</Label>
              <div className="flex items-center gap-2">
                <Input id="favicon-display" placeholder={faviconFile ? faviconFile.name : "Nenhum arquivo selecionado"} readOnly className="flex-grow" />
                <Button asChild variant="outline"><Label htmlFor="favicon-upload" className="cursor-pointer"><Upload className="h-4 w-4" /> <Input id="favicon-upload" type="file" className="sr-only" onChange={(e) => setFaviconFile(e.target.files?.[0] || null)} accept="image/x-icon,image/png,image/svg+xml" /></Label></Button>
              </div>
            </div> */}
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
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-template">Template de Mensagem (WhatsApp)</Label>
              <Textarea id="whatsapp-template" value={whatsappMessageTemplate} onChange={(e) => setWhatsappMessageTemplate(e.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">Esta mensagem será usada ao gerar links de aprovação.</p>
            </div>
            <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Notificações do Telegram</h3>
                <div className="space-y-2">
                    <Label htmlFor="telegram-token">Token do Bot do Telegram</Label>
                    <PasswordInput id="telegram-token" value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="telegram-chat-id">Chat ID do Telegram</Label>
                    <Input id="telegram-chat-id" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} />
                </div>
            </div>
          </CardContent>
        </Card>
        
        <Button onClick={handleSave} disabled={isUploading || updateSettingsMutation.isPending} className="w-full">
          {isUploading ? "Enviando..." : "Salvar Todas as Alterações"}
          </Button>
      </main>
    </div>
  );
};

export default SettingsPage;