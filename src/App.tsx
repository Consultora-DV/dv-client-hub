import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { AppLayout } from "@/components/AppLayout";
import { EditorLayout } from "@/layouts/EditorLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import VideosPage from "@/pages/VideosPage";
import DocumentsPage from "@/pages/DocumentsPage";
import CalendarPage from "@/pages/CalendarPage";
import MetricsPage from "@/pages/MetricsPage";
import AdsPage from "@/pages/AdsPage";
import UsersPage from "@/pages/UsersPage";

import ProfilePage from "@/pages/ProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ClientWelcomePage from "@/pages/ClientWelcomePage";
import NotFound from "@/pages/NotFound";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import EditorDashboardPage from "@/pages/editor/EditorDashboardPage";
import NuevaEntregaPage from "@/pages/editor/NuevaEntregaPage";
import AdminEntregasPage from "@/pages/AdminEntregasPage";
import AdminNotificacionesPage from "@/pages/AdminNotificacionesPage";

const queryClient = new QueryClient();

function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "admin") return <>{children}</>;
  if (user && user.approvalStatus !== "approved") {
    return <PendingApprovalPage />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function EditorRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "editor" && user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// Bounces editors out of the client/admin shell to their own portal.
// Admins, designers, and clients pass through unchanged.
function NotEditorRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "editor") return <Navigate to="/editor/dashboard" replace />;
  return <>{children}</>;
}

function RoleBasedHome() {
  const { user } = useAuth();
  if (user?.role === "editor") return <Navigate to="/editor/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
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

  // Public routes available regardless of auth state
  return (
    <Routes>
      <Route path="/bienvenido" element={<ClientWelcomePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {!isAuthenticated ? (
        <Route path="*" element={<AuthPage />} />
      ) : (
        <Route
          path="*"
          element={
            <AppStateProvider>
              <Routes>
                <Route path="/" element={<RoleBasedHome />} />
                <Route path="/auth" element={<RoleBasedHome />} />

                {/* Editor portal */}
                <Route element={<ApprovalGuard><EditorRoute><EditorLayout /></EditorRoute></ApprovalGuard>}>
                  <Route path="/editor" element={<Navigate to="/editor/dashboard" replace />} />
                  <Route path="/editor/dashboard" element={<EditorDashboardPage />} />
                  <Route path="/editor/nueva" element={<NuevaEntregaPage />} />
                </Route>

                {/* Client / admin portal — editors are bounced to /editor/dashboard */}
                <Route element={<ApprovalGuard><NotEditorRoute><AppLayout /></NotEditorRoute></ApprovalGuard>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/videos" element={<VideosPage />} />
                  <Route path="/documentos" element={<DocumentsPage />} />
                  <Route path="/calendario" element={<CalendarPage />} />
                  <Route path="/metricas" element={<MetricsPage />} />
                  <Route path="/ads" element={<AdsPage />} />
                  <Route path="/usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
                  <Route path="/admin/entregas" element={<AdminRoute><AdminEntregasPage /></AdminRoute>} />
                  <Route path="/admin/notificaciones" element={<AdminRoute><AdminNotificacionesPage /></AdminRoute>} />
                  <Route path="/perfil" element={<ProfilePage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppStateProvider>
          }
        />
      )}
    </Routes>
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
