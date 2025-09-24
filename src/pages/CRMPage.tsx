"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRMKanbanBoard } from "@/components/CRMKanbanBoard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const CRMPage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [isProfileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      setProfileLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profileError) throw profileError;
          setUserRole(profile?.role || null);
        } else {
          setUserRole(null);
        }
      } catch (error: any) {
        console.error("Error fetching user role:", error.message);
        showError(`Erro ao carregar perfil: ${error.message}`);
        setUserRole(null);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!isProfileLoading && userRole !== 'admin' && userRole !== 'equipe') {
      navigate("/");
    }
  }, [isProfileLoading, userRole, navigate]);

  if (isProfileLoading || userRole === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (userRole !== 'admin' && userRole !== 'equipe') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
          <CardContent><p>Você não tem permissão para acessar esta página.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">CRM - Funil de Vendas</h1>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Leads</CardTitle>
          <CardDescription>Acompanhe seus leads através das etapas do funil de vendas.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <CRMKanbanBoard />
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMPage;