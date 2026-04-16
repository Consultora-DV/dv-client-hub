import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClientSelector } from "@/components/ClientSelector";
import { ClientSocialLinks } from "@/components/ClientSocialLinks";
import { ImportModal } from "@/components/ImportModal";
import { GlobalSearch } from "@/components/GlobalSearch";
import { MessageCircle, Download } from "lucide-react";
import { Outlet } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AppLayout() {
  const [showImport, setShowImport] = useState(false);
  const { isAdmin, role } = usePermissions();
  const canImport = isAdmin || role === "editor";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        {/* Sidebar: hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-3 md:px-4 shrink-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden md:flex" />
              <ClientSelector />
              <div className="hidden md:block">
                <ClientSocialLinks />
              </div>
            </div>
            <div className="flex items-center gap-0.5 md:gap-1">
              <GlobalSearch />
              {canImport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowImport(true)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Importar desde Instagram</TooltipContent>
                </Tooltip>
              )}
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>
        {/* WhatsApp FAB */}
        <a
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "5216682343672"}?text=Hola%20Dante%2C%20tengo%20una%20pregunta`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          style={{ backgroundColor: "#25D366" }}
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle className="w-7 h-7 md:w-6 md:h-6 text-white fill-white" />
        </a>
        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>

      <AnimatePresence>
        {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      </AnimatePresence>
    </SidebarProvider>
  );
}
