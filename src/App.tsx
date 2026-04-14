import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { AppLayout } from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import VideosPage from "@/pages/VideosPage";
import DocumentsPage from "@/pages/DocumentsPage";
import CalendarPage from "@/pages/CalendarPage";
import MetricsPage from "@/pages/MetricsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <AppStateProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/metricas" element={<MetricsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppStateProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
