import { LayoutDashboard, Video, FileText, Calendar, BarChart3, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const roleBadges: Record<string, { label: string; class: string }> = {
  admin: { label: "ADMIN", class: "gold-gradient text-primary-foreground" },
  editor: { label: "EDITOR", class: "bg-status-published/20 text-status-published border-status-published/30" },
  "diseñador": { label: "DISEÑADOR", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  cliente: { label: "CLIENTE", class: "bg-secondary text-muted-foreground" },
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { videos } = useAppState();
  const { isClient, role } = usePermissions();

  const pendingCount = videos.filter((v) => v.status === "pending").length;

  const allItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, showForClient: true },
    { title: isClient ? "Mis Videos" : "Videos", url: "/videos", icon: Video, badge: pendingCount, showForClient: true },
    { title: isClient ? "Mis Documentos" : "Documentos", url: "/documentos", icon: FileText, showForClient: true },
    { title: "Calendario", url: "/calendario", icon: Calendar, showForClient: true },
    { title: "Métricas", url: "/metricas", icon: BarChart3, showForClient: true },
  ];

  const items = isClient ? allItems.filter((i) => i.showForClient) : allItems;
  const badge = roleBadges[role];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
              {user?.avatar}
            </AvatarFallback>
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
              {items.map((item) => (
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
                      {item.badge && item.badge > 0 && (
                        <Badge className="ml-auto bg-status-pending text-primary-foreground text-xs px-1.5 py-0.5 group-data-[collapsible=icon]:hidden">
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
        <a
          href="https://wa.me/521XXXXXXXXXX"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-status-approved/15 text-status-approved hover:bg-status-approved/25 transition-colors group-data-[collapsible=icon]:justify-center"
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Contactar a mi consultor</span>
        </a>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left text-sm group-data-[collapsible=icon]:justify-center"
        >
          <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
