import { Bell, Video, FileText, BarChart3, File, ThumbsUp, AlertCircle, FileCheck, FilePen, Download } from "lucide-react";
import { useAppState } from "@/contexts/AppStateContext";
import { NotificationType } from "@/data/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

const typeIcons: Record<NotificationType, typeof Video> = {
  video_ready: Video,
  guion_nuevo: FileText,
  metricas_actualizadas: BarChart3,
  documento_nuevo: File,
  video_aprobado: ThumbsUp,
  video_cambios: AlertCircle,
  script_aprobado: FileCheck,
  script_cambios: FilePen,
  import_completado: Download,
};

const typeColors: Record<NotificationType, string> = {
  video_ready: "text-primary",
  guion_nuevo: "text-primary",
  metricas_actualizadas: "text-primary",
  documento_nuevo: "text-primary",
  video_aprobado: "text-status-approved",
  video_cambios: "text-destructive",
  script_aprobado: "text-status-approved",
  script_cambios: "text-destructive",
  import_completado: "text-status-published",
};

export function NotificationBell() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppState();
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = async (id: string, link: string) => {
    await markNotificationRead(id);
    navigate(link);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Hace unos minutos";
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ayer";
    return `Hace ${days} días`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass gold-border" align="end">
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <h4 className="font-semibold text-sm text-foreground">Notificaciones</h4>
          {unreadCount > 0 && (
            <button onClick={markAllNotificationsRead} className="text-xs text-primary hover:underline">
              Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">Sin notificaciones</p>
          )}
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || File;
            const colorClass = typeColors[n.type] || "text-primary";
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n.id, n.link)}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 flex gap-3 items-start ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${!n.read ? colorClass : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className={`text-sm ${!n.read ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(n.date)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
