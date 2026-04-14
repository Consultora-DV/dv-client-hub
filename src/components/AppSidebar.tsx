import { LayoutDashboard, Video, FileText, Calendar, BarChart3, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { videos } from "@/data/mockData";
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

const pendingCount = videos.filter((v) => v.status === "pending").length;

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Videos", url: "/videos", icon: Video, badge: pendingCount },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Calendario", url: "/calendario", icon: Calendar },
  { title: "Métricas", url: "/metricas", icon: BarChart3 },
];

export function AppSidebar() {
  const { user, logout } = useAuth();

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
