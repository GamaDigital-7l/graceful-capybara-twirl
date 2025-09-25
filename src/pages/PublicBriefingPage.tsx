"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { ArrowLeft, ArrowRight } from "lucide-react";

const fetchBriefingForm = async (formId: string): Promise<BriefingForm | null> => {
  const { data, error } = await supabase
    .from("briefing_forms")
    .select("id, title, description, is_active, display_mode, form_structure")
    .eq("id", formId)
    .maybeSingle();
  if (error) {
    console.error("Erro ao buscar formulário de briefing:", error);
    throw error;
  }
  return data as BriefingForm;
};

const PublicBriefingPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: form, isLoading, error } = useQuery<BriefingForm | null, Error>({
    queryKey: ["publicBriefingForm", formId],
    queryFn: () => fetchBriefingForm(formId!),
    enabled: !!formId,
    retry: false,
  });

  const allFields = useMemo(() => {
    if (!form) return [];
    const formStructure = form.form_structure || []; 
    return [{ id: "client-name", type: "text", label: "Seu Nome Completo", required: true, placeholder: "Ex: João da Silva" } as BriefingFormField, ...formStructure];
  }, [form]);

  useEffect(() => {
    if (form) {
      const initialData: { [key: string]: any } = {};
      allFields.forEach(field => {
        if (field.type === "checkbox") {
          initialData[field.id] = [];
        } else {
          initialData[field.id] = "";
        }
      });
      setFormData(initialData);
      setCurrentStep(0);
    }
  }, [form, allFields]);

  const handleFieldChange = useCallback((fieldId: string, value: any, fieldType: BriefingFieldType) => {
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
  }, []);

  const validateCurrentStep = useCallback(() => {
    if (form?.display_mode === 'typeform') {
      const currentField = allFields[currentStep];
      if (currentField.required) {
        const value = formData[currentField.id];
        if (currentField.id === "client-name") {
          if (!clientName.trim()) {
            showError("Por favor, insira seu nome completo.");
            return false;
          }
        } else if (!value || (Array.isArray(value) && value.length === 0)) {
          showError(`Por favor, preencha o campo "${currentField.label}".`);
          return false;
        }
      }
    } else { // all_questions mode
      if (!clientName.trim()) {
        showError("Por favor, insira seu nome completo.");
        return false;
      }
      const formStructure = form?.form_structure || [];
      if (formStructure.some((field: BriefingFormField) => field.required && (!formData[field.id] || (Array.isArray(formData[field.id]) && formData[field.id].length === 0)))) {
        showError("Por favor, preencha todos os campos obrigatórios.");
        return false;
      }
    }
    return true;
  }, [form, allFields, currentStep, formData, clientName]);

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < allFields.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form) return;

    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = showLoading("Enviando sua resposta...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const submittedByUserId = user?.id || null;

      const finalFormData = { ...formData };
      delete finalFormData["client-name"];

      const { error: submitError } = await supabase.functions.invoke("submit-briefing-response", {
        body: {
          formId: form.id,
          responseData: finalFormData,
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

  const renderField = (field: BriefingFormField) => {
    const value = field.id === "client-name" ? clientName : formData[field.id];
    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string | boolean) => {
      if (field.id === "client-name") {
        setClientName(typeof e === 'string' ? e : (e as React.ChangeEvent<HTMLInputElement>).target.value);
      } else {
        handleFieldChange(field.id, typeof e === 'string' ? e : (e as React.ChangeEvent<HTMLInputElement>).target.value, field.type);
      }
    };

    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            type="text"
            value={value || ""}
            onChange={onChange}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full"
          />
        );
      case "textarea":
        return (
          <Textarea
            id={field.id}
            value={value || ""}
            onChange={onChange}
            placeholder={field.placeholder}
            required={field.required}
            rows={5}
            className="w-full"
          />
        );
      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
            required={field.required}
          >
            <SelectTrigger id={field.id} className="w-full">
              <SelectValue placeholder={field.placeholder || "Selecione uma opção"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={onChange}
            required={field.required}
            className="flex flex-col space-y-2"
          >
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option.value}`}
                  checked={(value || []).includes(option.value)}
                  onCheckedChange={() => handleFieldChange(field.id, option.value, field.type)}
                />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );
      default:
        return null;
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

  if (!form || !form.is_active) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Formulário Não Encontrado ou Inativo</CardTitle></CardHeader>
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

  const isTypeformMode = form.display_mode === 'typeform';
  const currentField = isTypeformMode ? allFields[currentStep] : null;
  const isLastStep = isTypeformMode && currentStep === allFields.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 flex justify-center items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <AppLogo className="h-12 w-auto mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold mb-2">{form.title}</CardTitle>
          {form.description && <CardDescription className="text-lg text-muted-foreground">{form.description}</CardDescription>}
          {isTypeformMode && (
            <p className="text-sm text-muted-foreground mt-4">
              Pergunta {currentStep + 1} de {allFields.length}
            </p>
          )}
        </CardHeader>
        <form onSubmit={isTypeformMode ? (e) => e.preventDefault() : handleSubmit}>
          <CardContent className="space-y-6 pt-4">
            {isTypeformMode ? (
              <div className="min-h-[200px] flex flex-col justify-center items-center text-center">
                {currentField && (
                  <div className="w-full space-y-4">
                    <Label htmlFor={currentField.id} className="text-xl font-semibold">
                      {currentField.label} {currentField.required && <span className="text-destructive">*</span>}
                    </Label>
                    {renderField(currentField)}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="client-name" className="text-base font-medium">Seu Nome Completo <span className="text-destructive">*</span></Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    required
                    className="w-full"
                  />
                </div>
                {form.form_structure?.map((field: BriefingFormField) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id} className="text-base font-medium">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </>
            )}
          </CardContent>
          <CardContent className="pt-0">
            {isTypeformMode ? (
              <div className="flex justify-between gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentStep === 0 || isSubmitting}
                  className="w-1/2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  className="w-1/2"
                >
                  {isLastStep ? (isSubmitting ? "Enviando..." : "Enviar Resposta") : "Próximo"} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Resposta"}
              </Button>
            )}
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default PublicBriefingPage;