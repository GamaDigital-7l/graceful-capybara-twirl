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
import PublicClientDashboardPage from "./pages/PublicClientDashboardPage"; // Novo import
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
            <Route path="/client-dashboard/:token" element={<PublicClientDashboardPage />} /> {/* Nova rota */}
            {/* Wrap all protected routes with the new Layout component */}
            <Route
              path="/"
              element={
                <Layout>
                  <Dashboard />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;