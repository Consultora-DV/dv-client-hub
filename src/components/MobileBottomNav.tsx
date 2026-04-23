import { LayoutDashboard, Video, FileText, Calendar, BarChart3, Users, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/hooks/usePermissions";

export function MobileBottomNav() {
  const { isAdmin } = usePermissions();

  const items = isAdmin
    ? [
        { title: "Inicio", url: "/dashboard", icon: LayoutDashboard },
        { title: "Videos", url: "/videos", icon: Video },
        { title: "Usuarios", url: "/usuarios", icon: Users },
        { title: "Métricas", url: "/metricas", icon: BarChart3 },
        { title: "Perfil", url: "/perfil", icon: User },
      ]
    : [
        { title: "Inicio", url: "/dashboard", icon: LayoutDashboard },
        { title: "Videos", url: "/videos", icon: Video },
        { title: "Docs", url: "/documentos", icon: FileText },
        { title: "Calendario", url: "/calendario", icon: Calendar },
        { title: "Métricas", url: "/metricas", icon: BarChart3 },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/dashboard"}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
