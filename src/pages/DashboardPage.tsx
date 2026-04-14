import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { scripts } from "@/data/mockData";
import { useAppState } from "@/contexts/AppStateContext";
import { Video, FileText, File, CalendarDays, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { videos, documents, notifications } = useAppState();
  const navigate = useNavigate();

  const pendingVideos = videos.filter((v) => v.status === "pending").length;
  const newScripts = scripts.filter((s) => s.isNew).length;
  const recentDocs = documents.filter((d) => d.isNew).length;
  const nextPub = videos
    .filter((v) => v.status !== "published")
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0];

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const summaryCards = [
    { label: "Videos pendientes", value: pendingVideos, icon: Video, color: "text-status-pending", link: "/videos" },
    { label: "Guiones nuevos", value: newScripts, icon: FileText, color: "text-primary", link: "/documentos" },
    { label: "Documentos recientes", value: recentDocs, icon: File, color: "text-status-published", link: "/documentos" },
    { label: "Próxima publicación", value: nextPub?.deliveryDate ? new Date(nextPub.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—", icon: CalendarDays, color: "text-status-approved", link: "/calendario" },
  ];

  const feed = notifications.slice(0, 6).map((n) => ({
    text: n.message,
    time: formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: es }),
    link: n.link,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Hola, <span className="gold-text">{user?.name}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{today}</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.button
            key={card.label}
            {...fadeUp}
            transition={{ delay: 0.15 + i * 0.05 }}
            onClick={() => navigate(card.link)}
            className="glass gold-border glass-hover rounded-xl p-5 text-left"
          >
            <card.icon className={`h-5 w-5 ${card.color} mb-3`} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </motion.button>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Actividad reciente</h2>
        <div className="glass gold-border rounded-xl overflow-hidden">
          {feed.map((item, i) => (
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
          ))}
        </div>
      </motion.div>
    </div>
  );
}
