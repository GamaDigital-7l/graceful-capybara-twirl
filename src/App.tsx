import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { Layout } from "./components/Layout";
import NotFound from "./pages/NotFound";

// Lazy-load de todos os componentes de página
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WorkspacePage = lazy(() => import("./pages/Workspace"));
const PlaybookPage = lazy(() => import("./pages/Playbook"));
const AdminPage = lazy(() => import("./pages/Admin"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const SecondBrainDashboard = lazy(() => import("./pages/SecondBrainDashboard"));
const ClientPromptsPage = lazy(() => import("./pages/ClientPromptsPage"));
const PublicApprovalPage = lazy(() => import("./pages/PublicApprovalPage"));
const EmployeeDashboardPage = lazy(() => import("./pages/EmployeeDashboardPage"));
const EmployeeDetailsPage = lazy(() => import("./pages/EmployeeDetailsPage"));
const InstagramInsightsDashboard = lazy(() => import("./pages/InstagramInsightsDashboard"));
const PublicClientDashboardPage = lazy(() => import("./pages/PublicClientDashboardPage"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const BriefingsPage = lazy(() => import("./pages/BriefingsPage"));
const PublicBriefingPage = lazy(() => import("./pages/PublicBriefingPage"));
const BriefingFormEditor = lazy(() => import("./components/BriefingFormEditor"));
const BriefingResponsesPage = lazy(() => import("./pages/BriefingResponsesPage"));
const PublicClientOnboardingPage = lazy(() => import("./pages/PublicClientOnboardingPage"));
const OnboardingTemplatesPage = lazy(() => import("./pages/OnboardingTemplatesPage"));
const AgencyPlaybookPage = lazy(() => import("./pages/AgencyPlaybookPage"));
const PersonalTasksPage = lazy(() => import("./pages/PersonalTasksPage"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider>
        <React.Fragment> {/* Adicionado React.Fragment aqui */}
          <Toaster />
          <Sonner position="top-center" duration={7000} />
          <TooltipProvider>
            <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Carregando...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/approve/:token" element={<PublicApprovalPage />} />
                <Route path="/client-dashboard/:token" element={<PublicClientDashboardPage />} />
                <Route path="/briefings/public/:formId" element={<PublicBriefingPage />} />
                <Route path="/onboarding/:publicToken" element={<PublicClientOnboardingPage />} />
                <Route path="/onboarding/preview" element={<PublicClientOnboardingPage />} />
                <Route
                  path="/"
                  element={
                    <Layout>
                      <Dashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/client-dashboard"
                  element={
                    <Layout pageTitle="Meus Projetos">
                      <ClientDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/workspace/:workspaceId"
                  element={
                    <Layout>
                      <WorkspacePage />
                    </Layout>
                  }
                />
                <Route
                  path="/workspace/:workspaceId/playbook"
                  element={
                    <Layout pageTitle="Playbook do Cliente">
                      <PlaybookPage />
                    </Layout>
                  }
                />
                <Route
                  path="/workspace/:workspaceId/instagram-insights"
                  element={
                    <Layout pageTitle="Insights do Instagram">
                      <InstagramInsightsDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Layout>
                      <AdminPage />
                    </Layout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Layout>
                      <SettingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/financial"
                  element={
                    <Layout>
                      <FinancialDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/second-brain"
                  element={
                    <Layout>
                      <SecondBrainDashboard />
                    </Layout>
                  }
                />
                <Route
                  path="/second-brain/:clientId"
                  element={
                    <Layout pageTitle="Prompts do Cliente">
                      <ClientPromptsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <Layout>
                      <EmployeeDashboardPage />
                    </Layout>
                  }
                />
                <Route
                  path="/employees/:employeeId"
                  element={
                    <Layout pageTitle="Detalhes do Funcionário">
                      <EmployeeDetailsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/agency-playbook"
                  element={
                    <Layout>
                      <AgencyPlaybookPage />
                    </Layout>
                  }
                />
                <Route
                  path="/briefings"
                  element={
                    <Layout pageTitle="Gerenciar Briefings">
                      <BriefingsPage />
                    </Layout>
                  }
                />
                <Route
                  path="/briefings/new"
                  element={
                    <Layout pageTitle="Novo Formulário de Briefing">
                      <BriefingFormEditor />
                    </Layout>
                  }
                />
                <Route
                  path="/briefings/:formId/edit"
                  element={
                    <Layout pageTitle="Editar Formulário de Briefing">
                      <BriefingFormEditor />
                    </Layout>
                  }
                />
                <Route
                  path="/briefings/:formId/responses"
                  element={
                    <Layout pageTitle="Respostas do Briefing">
                      <BriefingResponsesPage />
                    </Layout>
                  }
                />
                <Route
                  path="/onboarding-templates"
                  element={
                    <Layout pageTitle="Templates de Onboarding">
                      <OnboardingTemplatesPage />
                    </Layout>
                  }
                />
                <Route
                  path="/personal-tasks"
                  element={
                    <Layout pageTitle="Todoist">
                      <PersonalTasksPage />
                    </Layout>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </React.Fragment>
      </SettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;