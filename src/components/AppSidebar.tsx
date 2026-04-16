import { useState } from "react";
import { LayoutDashboard, Video, FileText, Calendar, BarChart3, MessageCircle, Users, Settings, Cog, User, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ProfileModal } from "@/components/ProfileModal";
import { SettingsModal } from "@/components/SettingsModal";
import { AnimatePresence } from "framer-motion";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const roleBadges: Record<string, { label: string; class: string }> = {
  admin: { label: "ADMIN", class: "gold-gradient text-primary-foreground" },
  editor: { label: "EDITOR", class: "bg-status-published/20 text-status-published border-status-published/30" },
  "diseñador": { label: "DISEÑADOR", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  cliente: { label: "CLIENTE", class: "bg-secondary text-muted-foreground" },
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { videos } = useAppState();
  const { isClient, isAdmin, role } = usePermissions();
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const videoCount = videos.length;
  const pendingCount = videos.filter((v) => v.status === "pending").length;

  const allItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: isClient ? "Mis Videos" : "Videos", url: "/videos", icon: Video, badge: videoCount },
    { title: isClient ? "Mis Documentos" : "Documentos", url: "/documentos", icon: FileText },
    { title: "Calendario", url: "/calendario", icon: Calendar },
    { title: "Métricas", url: "/metricas", icon: BarChart3 },
    { title: isClient ? "Mi Perfil" : "Perfil del cliente", url: "/perfil", icon: User },
    ...(isAdmin ? [{ title: "Usuarios", url: "/usuarios", icon: Users }] : []),
  ];

  const badge = roleBadges[role];

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border/50">
        <SidebarHeader className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/50">
              {(() => {
                const photo = user?.id ? localStorage.getItem(`dv_user_profile_photo_${user.id}`) : null;
                return photo ? (
                  <AvatarImage src={photo} alt={user?.name} />
                ) : (
                  <AvatarFallback className={`${isAdmin ? 'gold-gradient' : 'bg-primary/20'} text-primary-foreground font-semibold text-sm`}>
                    {user?.avatar}
                  </AvatarFallback>
                );
              })()}
            </Avatar>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.business}</span>
              {badge && (
                <Badge className={`mt-1 text-[9px] w-fit ${badge.class}`}>{badge.label}</Badge>
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {allItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-11">
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        activeClassName="bg-primary/10 text-primary border border-primary/20"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        {item.badge != null && item.badge > 0 && (
                          <Badge className={`ml-auto text-xs px-1.5 py-0.5 group-data-[collapsible=icon]:hidden ${
                            item.url === "/videos" && pendingCount > 0
                              ? "bg-status-pending text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-border/50 space-y-2">
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left text-sm group-data-[collapsible=icon]:justify-center"
              title="Configuración"
            >
              <Cog className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
            </button>
          )}
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left text-sm group-data-[collapsible=icon]:justify-center"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Mi Perfil</span>
          </button>
          <a
            href="https://wa.me/5216682343672"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-status-approved/15 text-status-approved hover:bg-status-approved/25 transition-colors group-data-[collapsible=icon]:justify-center"
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Contactar consultor</span>
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left text-sm group-data-[collapsible=icon]:justify-center"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
          </button>
        </SidebarFooter>
      </Sidebar>

      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </>
  );
}
