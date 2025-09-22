"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BriefingForm, BriefingFormField, BriefingFieldType } from "@/types/briefing";
import { AppLogo } from "@/components/AppLogo";

const fetchBriefingForm = async (formId: string): Promise<BriefingForm> => {
  const { data, error } = await supabase
    .from("briefing_forms")
    .select("*")
    .eq("id", formId)
    .single();
  if (error) throw new Error(error.message);
  return data as BriefingForm;
};

const PublicBriefingPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: form, isLoading, error } = useQuery<BriefingForm, Error>({
    queryKey: ["publicBriefingForm", formId],
    queryFn: () => fetchBriefingForm(formId!),
    enabled: !!formId,
    retry: false,
  });

  useEffect(() => {
    if (form) {
      const initialData: { [key: string]: any } = {};
      form.form_structure.forEach(field => {
        if (field.type === "checkbox") {
          initialData[field.id] = [];
        } else {
          initialData[field.id] = "";
        }
      });
      setFormData(initialData);
    }
  }, [form]);

  const handleFieldChange = (fieldId: string, value: any, fieldType: BriefingFieldType) => {
    if (fieldType === "checkbox") {
      setFormData(prev => {
        const currentValues = prev[fieldId] || [];
        if (currentValues.includes(value)) {
          return { ...prev, [fieldId]: currentValues.filter((item: any) => item !== value) };
        } else {
          return { ...prev, [fieldId]: [...currentValues, value] };
        }
      });
    } else {
      setFormData(prev => ({ ...prev, [fieldId]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Basic validation
    if (form.form_structure.some(field => field.required && (!formData[field.id] || (Array.isArray(formData[field.id]) && formData[field.id].length === 0)))) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (form.form_structure.some(field => field.type === "text" && field.required && !clientName.trim())) {
      showError("Por favor, insira seu nome.");
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = showLoading("Enviando sua resposta...");

    try {
      const { data: { user } } = await supabase.auth.getUser(); // Try to get logged-in user
      const submittedByUserId = user?.id || null;

      const { error: submitError } = await supabase.functions.invoke("submit-briefing-response", {
        body: {
          formId: form.id,
          responseData: formData,
          submittedByUserId: submittedByUserId,
          clientName: clientName.trim() || null,
        },
      });

      if (submitError) throw submitError;

      showSuccess("Sua resposta foi enviada com sucesso! Agradecemos.");
      setIsSubmitted(true);
    } catch (submitError: any) {
      console.error("Erro ao submeter briefing:", submitError);
      showError(`Erro ao enviar sua resposta: ${submitError.message}`);
    } finally {
      setIsSubmitting(false);
      dismissToast(loadingToastId);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen p-4"><Skeleton className="h-96 w-full max-w-2xl" /></div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle className="text-destructive">Erro</CardTitle></CardHeader>
          <CardContent><p>{error.message}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Formulário Não Encontrado</CardTitle></CardHeader>
          <CardContent><p>O formulário de briefing que você está tentando acessar não existe ou foi desativado.</p></CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AppLogo className="h-12 w-auto mx-auto mb-4" />
            <CardTitle className="text-green-600">Obrigado!</CardTitle>
            <CardDescription>Sua resposta para "{form.title}" foi enviada com sucesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Agradecemos a sua colaboração.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 flex justify-center items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <AppLogo className="h-12 w-auto mx-auto mb-4" />
          <CardTitle>{form.title}</CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client-name">Seu Nome Completo <span className="text-destructive">*</span></Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: João da Silva"
                required
              />
            </div>
            {form.form_structure.map((field: BriefingFormField) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.type === "text" && (
                  <Input
                    id={field.id}
                    type="text"
                    value={formData[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
                {field.type === "textarea" && (
                  <Textarea
                    id={field.id}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleFieldChange(field.id, e.target.value, field.type)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={5}
                  />
                )}
                {field.type === "select" && field.options && (
                  <Select
                    value={formData[field.id] || ""}
                    onValueChange={(value) => handleFieldChange(field.id, value, field.type)}
                    required={field.required}
                  >
                    <SelectTrigger id={field.id}>
                      <SelectValue placeholder={field.placeholder || "Selecione uma opção"} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "radio" && field.options && (
                  <RadioGroup
                    value={formData[field.id] || ""}
                    onValueChange={(value) => handleFieldChange(field.id, value, field.type)}
                    required={field.required}
                  >
                    {field.options.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                        <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {field.type === "checkbox" && field.options && (
                  <div className="space-y-2">
                    {field.options.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${field.id}-${option.value}`}
                          checked={(formData[field.id] || []).includes(option.value)}
                          onCheckedChange={(checked) => handleFieldChange(field.id, option.value, field.type)}
                        />
                        <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
          <CardContent className="pt-0">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Resposta"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default PublicBriefingPage;