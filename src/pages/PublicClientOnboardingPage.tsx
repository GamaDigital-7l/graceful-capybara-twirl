"use client";

import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLogo } from "@/components/AppLogo";
import { Link as LinkIcon, FileText, Users, Video } from "lucide-react";
import { OnboardingTemplate } from "./OnboardingTemplatesPage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OnboardingPageData {
  client_name: string;
  company_name: string | null;
  onboarding_template_id: string | null;
}

interface FullOnboardingData {
  client_name: string;
  company_name: string | null;
  template: OnboardingTemplate | null;
}

const fetchOnboardingPageData = async (publicToken: string): Promise<FullOnboardingData | null> => {
  // Check for preview data in localStorage first
  if (publicToken === 'preview') {
    const previewData = localStorage.getItem('onboardingPreviewData');
    if (previewData) {
      return JSON.parse(previewData);
    }
    throw new Error("Dados de pré-visualização não encontrados. Por favor, gere a pré-visualização a partir do editor de templates.");
  }

  const { data: clientOnboarding, error: clientOnboardingError } = await supabase
    .from("client_onboarding_pages")
    .select("client_name, company_name, onboarding_template_id")
    .eq("public_token", publicToken)
    .single();
  
  if (clientOnboardingError) {
    if (clientOnboardingError.code === 'PGRST116') {
      console.warn("Página de onboarding do cliente não encontrada (PGRST116). Retornando null.");
      return null; // Retorna null se a página de onboarding do cliente não for encontrada
    } else {
      console.error("Erro ao buscar página de onboarding do cliente:", clientOnboardingError);
      throw clientOnboardingError; // Relança outros erros
    }
  }
  if (!clientOnboarding) { // Salvaguarda, deve ser coberto pelo bloco acima
    console.warn("Página de onboarding do cliente não encontrada (clientOnboarding é null). Retornando null.");
    return null;
  }

  let template: OnboardingTemplate | null = null;
  if (clientOnboarding.onboarding_template_id) {
    const { data: templateData, error: templateError } = await supabase
      .from("onboarding_page_templates")
      .select("*")
      .eq("id", clientOnboarding.onboarding_template_id)
      .single();
    // Handle PGRST116 (no rows found) gracefully
    if (templateError && templateError.code === 'PGRST116') {
      console.warn("Template de onboarding referenciado não encontrado.");
      template = null;
    } else if (templateError) {
      console.error("Erro ao buscar template de onboarding:", templateError);
      throw templateError; // Re-throw other errors
    } else {
      template = templateData as OnboardingTemplate;
    }
  }

  return {
    client_name: clientOnboarding.client_name,
    company_name: clientOnboarding.company_name,
    template: template,
  };
};

// Componente para renderizar vídeos do YouTube/Vimeo a partir de links Markdown
const MarkdownVideoRenderer = ({ node, ...props }: any) => {
  const url = props.src;
  if (!url) return null;

  let embedUrl = '';
  // YouTube
  const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/);
  if (youtubeMatch && youtubeMatch[1]) {
    embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  // Vimeo
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(?:video\/|)(\d+)(?:\S+)?/);
  if (vimeoMatch && vimeoMatch[1]) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  if (embedUrl) {
    return (
      <div className="relative w-full my-4" style={{ paddingBottom: '56.25%' }}> {/* 16:9 Aspect Ratio */}
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-md"
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={props.alt || "Embedded video"}
        ></iframe>
      </div>
    );
  }
  // Fallback para imagem se não for um vídeo reconhecido
  return <img {...props} className="max-w-full h-auto rounded-md my-4" />;
};

const PublicClientOnboardingPage = () => {
  const { publicToken } = useParams<{ publicToken: string }>();

  const { data, isLoading, error } = useQuery<FullOnboardingData | null, Error>({
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

  if (!data || !data.template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Página Não Encontrada</CardTitle></CardHeader>
          <CardContent><p>Não foi possível carregar a página de onboarding ou seu template.</p></CardContent>
        </Card>
      </div>
    );
  }

  const {
    client_name,
    company_name,
    template,
  } = data;

  const {
    welcome_message,
    processes_content,
    apps_access_info,
    tutorial_videos,
    briefing_links,
    main_content,
    section_order, // Obter a ordem das seções
  } = template;

  const sections: { [key: string]: React.ReactNode } = {
    welcome_message: welcome_message && (
      <Card>
        <CardHeader><CardTitle>Mensagem de Boas-Vindas</CardTitle></CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: MarkdownVideoRenderer }}>
              {welcome_message}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    ),
    main_content: main_content && (
      <Card>
        <CardHeader><CardTitle>Detalhes do Seu Projeto</CardTitle></CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: MarkdownVideoRenderer }}>
              {main_content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    ),
    briefing_links: briefing_links && briefing_links.length > 0 && (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Briefings Essenciais</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {briefing_links.map((link, index) => (
              <li key={index}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> {link.name}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    ),
    processes_content: processes_content && processes_content.length > 0 && (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Nossos Processos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {processes_content.map((item, index) => (
            <div key={index} className="space-y-2 border p-3 rounded-md bg-muted/50">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: MarkdownVideoRenderer }}>
                  {item.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    apps_access_info: apps_access_info && apps_access_info.length > 0 && (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Acesso aos Nossos Apps</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {apps_access_info.map((item, index) => (
            <div key={index} className="space-y-2 border p-3 rounded-md bg-muted/50">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: MarkdownVideoRenderer }}>
                  {item.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    tutorial_videos: tutorial_videos && tutorial_videos.length > 0 && (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Vídeos Tutoriais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tutorial_videos.map((video, index) => (
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
    ),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <header className="text-center mb-8">
        <AppLogo className="h-12 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Bem-vindo(a), {client_name}!</h1>
        {company_name && <p className="text-lg text-muted-foreground">da {company_name}</p>}
        <p className="text-lg text-muted-foreground mt-2">À Gama Creative</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {section_order.map((sectionKey) => sections[sectionKey])}
      </main>

      <footer className="text-center text-xs text-muted-foreground mt-12 pt-4 border-t">
        Gerado por Gama Creative Flow
      </footer>
    </div>
  );
};

export default PublicClientOnboardingPage;