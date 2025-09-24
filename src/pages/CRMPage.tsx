"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send } from "lucide-react";

const CRMPage = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: async ({ to, message }: { to: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-evolution-message", {
        body: { to, message },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Mensagem WhatsApp enviada com sucesso!");
      setPhoneNumber("");
      setMessage("");
    },
    onError: (e: Error) => showError(`Erro ao enviar mensagem: ${e.message}`),
    onMutate: () => showLoading("Enviando mensagem WhatsApp..."),
    onSettled: () => dismissToast(),
  });

  const handleSendMessage = () => {
    if (!phoneNumber.trim() || !message.trim()) {
      showError("Por favor, preencha o número de telefone e a mensagem.");
      return;
    }
    sendMessageMutation.mutate({ to: phoneNumber.trim(), message: message.trim() });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">CRM - Enviar WhatsApp</h1>
      <Card>
        <CardHeader>
          <CardTitle>Enviar Mensagem WhatsApp (Evolution API)</CardTitle>
          <CardDescription>Envie mensagens diretas para seus clientes via WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="phone-number">Número de Telefone (com DDD, ex: 5511987654321)</Label>
            <Input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ex: 5511987654321"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              rows={5}
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || !phoneNumber.trim() || !message.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMPage;