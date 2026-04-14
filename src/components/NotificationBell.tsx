import { useState } from "react";
import { Bell, Video, FileText, BarChart3, File } from "lucide-react";
import { notifications as initialNotifications, Notification } from "@/data/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

const typeIcons: Record<Notification["type"], typeof Video> = {
  video_ready: Video,
  guion_nuevo: FileText,
  metricas_actualizadas: BarChart3,
  documento_nuevo: File,
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (id: string, link: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    navigate(link);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n.id, n.link)}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 flex gap-3 items-start ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
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
