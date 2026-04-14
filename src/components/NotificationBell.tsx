import { useState } from "react";
import { Bell } from "lucide-react";
import { notifications as initialNotifications } from "@/data/mockData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass gold-border" align="end">
        <div className="p-3 border-b border-border/50">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n.id, n.link)}
              className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 ${
                !n.read ? "bg-primary/5" : ""
              }`}
            >
              <p className={`text-sm ${!n.read ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {n.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(n.date)}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
