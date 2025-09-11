import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/contexts/SettingsContext"; // Importar SettingsProvider
import Dashboard from "./pages/Dashboard";
import WorkspacePage from "./pages/Workspace"; // Renomeado para WorkspacePage
import PlaybookPage from "./pages/Playbook";
import AdminPage from "./pages/Admin";
import SettingsPage from "./pages/Settings";
import FinancialDashboard from "./pages/FinancialDashboard";
import SecondBrainDashboard from "./pages/SecondBrainDashboard";
import ClientPromptsPage from "./pages/ClientPromptsPage";
import PublicApprovalPage from "./pages/PublicApprovalPage";
import EmployeeDetailsPage from "./pages/EmployeeDetailsPage"; // Importar a nova página de detalhes do funcionário
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider> {/* Envolver o aplicativo com SettingsProvider */}
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" duration={7000} /> {/* Ajustado aqui */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/approve/:token" element={<PublicApprovalPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:workspaceId"
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:workspaceId/playbook"
              element={
                <ProtectedRoute>
                  <PlaybookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financial"
              element={
                <ProtectedRoute>
                  <FinancialDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/second-brain"
              element={
                <ProtectedRoute>
                  <SecondBrainDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/second-brain/:clientId"
              element={
                <ProtectedRoute>
                  <ClientPromptsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees/:employeeId"
              element={
                <ProtectedRoute>
                  <EmployeeDetailsPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;