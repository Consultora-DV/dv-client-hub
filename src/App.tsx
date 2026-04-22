import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { AppLayout } from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import VideosPage from "@/pages/VideosPage";
import DocumentsPage from "@/pages/DocumentsPage";
import CalendarPage from "@/pages/CalendarPage";
import MetricsPage from "@/pages/MetricsPage";
import UsersPage from "@/pages/UsersPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ProfilePage from "@/pages/ProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ClientWelcomePage from "@/pages/ClientWelcomePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "cliente" && user?.id) {
    const done = localStorage.getItem(`dv_onboarding_complete_${user.id}`);
    if (done !== "true") {
      return <Navigate to="/onboarding" replace />;
    }
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <AppStateProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<OnboardingGuard><AppLayout /></OnboardingGuard>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/metricas" element={<MetricsPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
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
      <BrowserRouter>
        <ThemeProvider>
          <Sonner />
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
