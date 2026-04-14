import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { MessageCircle } from "lucide-react";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
        <a
          href="https://wa.me/5216682343672?text=Hola%20Dante%2C%20tengo%20una%20pregunta"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          style={{ backgroundColor: "#25D366" }}
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle className="w-7 h-7 md:w-6 md:h-6 text-white fill-white" />
        </a>
      </div>
    </SidebarProvider>
  );
}
