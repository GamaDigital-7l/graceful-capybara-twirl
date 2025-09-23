import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Dashboard from "./pages/Dashboard";
import WorkspacePage from "./pages/Workspace";
import PlaybookPage from "./pages/Playbook";
import AdminPage from "./pages/Admin";
import SettingsPage from "./pages/Settings";
import FinancialDashboard from "./pages/FinancialDashboard";
import SecondBrainDashboard from "./pages/SecondBrainDashboard";
import ClientPromptsPage from "./pages/ClientPromptsPage";
import PublicApprovalPage from "./pages/PublicApprovalPage";
import EmployeeDashboardPage from "./pages/EmployeeDashboardPage";
import EmployeeDetailsPage from "./pages/EmployeeDetailsPage";
import InstagramInsightsDashboard from "./pages/InstagramInsightsDashboard";
import PublicClientDashboardPage from "./pages/PublicClientDashboardPage";
import ClientDashboard from "./pages/ClientDashboard";
import BriefingsPage from "./pages/BriefingsPage";
import PublicBriefingPage from "./pages/PublicBriefingPage";
import { BriefingFormEditor } from "./components/BriefingFormEditor";
import BriefingResponsesPage from "./pages/BriefingResponsesPage";
import PublicClientOnboardingPage from "./pages/PublicClientOnboardingPage";
import OnboardingTemplatesPage from "./pages/OnboardingTemplatesPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { Layout } from "./components/Layout";
import AgencyPlaybookPage from "./pages/AgencyPlaybookPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" duration={7000} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/approve/:token" element={<PublicApprovalPage />} />
            <Route path="/client-dashboard/:token" element={<PublicClientDashboardPage />} />
            <Route path="/briefings/public/:formId" element={<PublicBriefingPage />} />
            <Route path="/onboarding/:publicToken" element={<PublicClientOnboardingPage />} />
            <Route path="/onboarding/preview" element={<PublicClientOnboardingPage />} /> {/* Nova rota de pré-visualização */}
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;