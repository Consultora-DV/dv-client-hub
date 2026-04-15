import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Video as VideoIcon, FileText, File, CalendarDays, Clock, Inbox, CheckCircle, FileCheck, FolderOpen, CalendarX, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function DashboardPage() {
  const { user } = useAuth();
  const { videos, documents, notifications, scripts, clients, allVideos, allDocuments, setSelectedClienteId, calendarEvents } = useAppState();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const fadeUp = reduced
    ? { initial: {}, animate: {} }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const pendingVideos = videos.filter((v) => v.status === "pending").length;
  const newScripts = scripts.filter((s) => s.isNew).length;
  const recentDocs = documents.filter((d) => d.isNew).length;
  const nextPub = calendarEvents
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const summaryCards = [
    {
      label: "Videos pendientes",
      value: pendingVideos,
      icon: pendingVideos === 0 ? CheckCircle : VideoIcon,
      color: pendingVideos === 0 ? "text-status-approved" : "text-status-pending",
      emptyText: "Sin pendientes",
      link: "/videos",
    },
    {
      label: "Guiones nuevos",
      value: newScripts,
      icon: newScripts === 0 ? FileCheck : FileText,
      color: newScripts === 0 ? "text-status-approved" : "text-primary",
      emptyText: "Al día",
      link: "/documentos",
    },
    {
      label: "Documentos recientes",
      value: recentDocs,
      icon: recentDocs === 0 ? FolderOpen : File,
      color: recentDocs === 0 ? "text-muted-foreground" : "text-status-published",
      emptyText: "Sin documentos nuevos",
      link: "/documentos",
    },
    {
      label: "Próxima publicación",
      value: nextPub?.date ? new Date(nextPub.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : null,
      icon: nextPub ? CalendarDays : CalendarX,
      color: nextPub ? "text-status-approved" : "text-muted-foreground",
      emptyText: "Sin publicaciones programadas",
      link: "/calendario",
    },
  ];

  const feed = notifications.slice(0, 6).map((n) => ({
    text: n.message,
    time: formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: es }),
    link: n.link,
  }));

  const handleClientNav = (clientId: string, path: string) => {
    setSelectedClienteId(clientId);
    navigate(path);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Hola, <span className="gold-text">{user?.name}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{today}</p>
      </motion.div>

      {isAdmin && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Resumen por cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clients.map((client) => {
              const cv = allVideos.filter((v) => v.clienteId === client.id);
              const cd = allDocuments.filter((d) => d.clienteId === client.id);
              const pending = cv.filter((v) => v.status === "pending").length;
              const newDocs = cd.filter((d) => d.isNew).length;
              const next = cv.filter((v) => v.status !== "published").sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0];
              return (
                <div
                  key={client.id}
                  className="glass gold-border rounded-xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-foreground" style={{ backgroundColor: client.colorAccent + "33" }}>
                      {client.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{client.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">{client.empresa}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <p className="text-lg font-bold text-status-pending">{pending}</p>
                      <p className="text-[10px] text-muted-foreground">Pendientes</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-status-published">{newDocs}</p>
                      <p className="text-[10px] text-muted-foreground">Docs nuevos</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-status-approved">{next ? new Date(next.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Próxima pub.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleClientNav(client.id, "/videos")}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Videos →
                    </button>
                    <button
                      onClick={() => handleClientNav(client.id, "/documentos")}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Documentos →
                    </button>
                    <button
                      onClick={() => handleClientNav(client.id, "/metricas")}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Métricas →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.button
            key={card.label}
            {...fadeUp}
            transition={{ delay: 0.2 + i * 0.05 }}
            onClick={() => navigate(card.link)}
            className="glass gold-border glass-hover rounded-xl p-5 text-left"
          >
            <card.icon className={`h-5 w-5 ${card.color} mb-3`} />
            {card.value != null ? (
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{card.emptyText}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </motion.button>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Actividad reciente</h2>
        <div className="glass gold-border rounded-xl overflow-hidden">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Inbox className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground text-center px-4">La actividad aparecerá aquí cuando empieces a trabajar con tus clientes</p>
            </div>
          ) : (
            feed.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.link)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 text-left"
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.text}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
