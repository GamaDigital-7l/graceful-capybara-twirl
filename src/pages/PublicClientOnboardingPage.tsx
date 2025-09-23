"use client";

import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLogo } from "@/components/AppLogo";
import { Link as LinkIcon, FileText, Users, Video } from "lucide-react";

interface OnboardingPageData {
  client_name: string;
  company_name: string | null;
  agency_welcome_message: string | null;
  agency_processes_content: string | null;
  agency_apps_access_info: string | null;
  agency_tutorial_videos: { name: string; url: string }[];
  agency_briefing_links: { name: string; url: string }[];
}

const fetchOnboardingPageData = async (publicToken: string): Promise<OnboardingPageData> => {
  const { data, error } = await supabase
    .from("client_onboarding_pages")
    .select("*")
    .eq("public_token", publicToken)
    .single();
  if (error) throw new Error(error.message);
  return data as OnboardingPageData;
};

const PublicClientOnboardingPage = () => {
  const { publicToken } = useParams<{ publicToken: string }>();

  const { data, isLoading, error } = useQuery<OnboardingPageData, Error>({
    queryKey: ["publicOnboardingPage", publicToken],
    queryFn: () => fetchOnboardingPageData(publicToken!),
    enabled: !!publicToken,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle className="text-destructive">Erro de Acesso</CardTitle></CardHeader>
          <CardContent><p>{error.message}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Página Não Encontrada</CardTitle></CardHeader>
          <CardContent><p>Não foi possível carregar a página de onboarding.</p></CardContent>
        </Card>
      </div>
    );
  }

  const {
    client_name,
    company_name,
    agency_welcome_message,
    agency_processes_content,
    agency_apps_access_info,
    agency_tutorial_videos,
    agency_briefing_links,
  } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <header className="text-center mb-8">
        <AppLogo className="h-12 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Bem-vindo(a), {client_name}!</h1>
        {company_name && <p className="text-lg text-muted-foreground">da {company_name}</p>}
        <p className="text-lg text-muted-foreground mt-2">À Gama Creative</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {agency_welcome_message && (
          <Card>
            <CardHeader><CardTitle>Mensagem de Boas-Vindas</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{agency_welcome_message}</p>
            </CardContent>
          </Card>
        )}

        {agency_briefing_links && agency_briefing_links.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Briefings Essenciais</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {agency_briefing_links.map((link, index) => (
                  <li key={index}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" /> {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {agency_processes_content && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Nossos Processos</CardTitle></CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                {agency_processes_content}
              </div>
            </CardContent>
          </Card>
        )}

        {agency_apps_access_info && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Acesso aos Nossos Apps</CardTitle></CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                {agency_apps_access_info}
              </div>
            </CardContent>
          </Card>
        )}

        {agency_tutorial_videos && agency_tutorial_videos.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Vídeos Tutoriais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agency_tutorial_videos.map((video, index) => (
                  <div key={index} className="space-y-2">
                    <h3 className="font-semibold">{video.name}</h3>
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 Aspect Ratio */}
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-md"
                        src={video.url.replace("watch?v=", "embed/")} // Convert YouTube watch URL to embed URL
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={video.name}
                      ></iframe>
                    </div>
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
                      Abrir no YouTube/Vimeo
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="text-center text-xs text-muted-foreground mt-12 pt-4 border-t">
        Gerado por Gama Creative Flow
      </footer>
    </div>
  );
};

export default PublicClientOnboardingPage;