import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FilePlus, RefreshCw, Video as VideoIcon, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchEditorVideos, fetchEditorClients,
  EditorVideo, EditorClient,
} from "@/services/editorPortalService";

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; emoji: string }> = {
    pending:   { label: "Pendiente",  cls: "bg-status-pending/20 text-status-pending border-status-pending/30", emoji: "⏳" },
    approved:  { label: "Aprobado",   cls: "bg-status-approved/20 text-status-approved border-status-approved/30", emoji: "✅" },
    changes:   { label: "Cambios",    cls: "bg-orange-500/20 text-orange-400 border-orange-500/30", emoji: "✏️" },
    published: { label: "Publicado",  cls: "bg-teal-500/20 text-teal-400 border-teal-500/30", emoji: "🌐" },
    entregado: { label: "Entregado",  cls: "bg-purple-500/20 text-purple-400 border-purple-500/30", emoji: "📦" },
  };
  return map[status] || { label: status, cls: "bg-secondary text-muted-foreground border-border/30", emoji: "" };
}

function priorityBadge(p: "alta" | "normal" | "baja") {
  if (p === "alta")  return { label: "🔥 Alta",  cls: "text-destructive" };
  if (p === "baja")  return { label: "Baja",     cls: "text-muted-foreground" };
  return { label: "Normal", cls: "text-foreground" };
}

export default function EditorDashboardPage() {
  const { user } = useAuth();
  const [videos, setVideos]   = useState<EditorVideo[]>([]);
  const [clients, setClients] = useState<EditorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [vids, cls] = await Promise.all([
      fetchEditorVideos(user.id),
      fetchEditorClients(user.id),
    ]);
    setVideos(vids);
    setClients(cls);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const visible = videos.filter((v) =>
    (filterClient === "all" || v.clienteId === filterClient) &&
    (filterStatus === "all" || v.status === filterStatus)
  );

  const counters = {
    total:     videos.length,
    pendientes: videos.filter((v) => v.status === "pending").length,
    aprobados:  videos.filter((v) => v.status === "approved").length,
    publicados: videos.filter((v) => v.status === "published").length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <VideoIcon className="h-6 w-6 text-primary" /> Mis entregas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length === 0
              ? "Aún no tienes clientes asignados."
              : `Trabajando con ${clients.length} cliente${clients.length === 1 ? "" : "s"}: ${clients.map((c) => c.nombre).join(", ")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
          <Link to="/editor/nueva">
            <Button size="sm" className="gold-gradient text-primary-foreground gap-1.5">
              <FilePlus className="h-4 w-4" /> Nueva entrega
            </Button>
          </Link>
        </div>
      </div>

      {/* Banner cuando no hay clientes — guía clara para el editor */}
      {!loading && clients.length === 0 && (
        <div className="glass border border-status-pending/30 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⏳</div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Esperando asignación de clientes</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para que puedas subir entregas, el administrador debe asignarte al menos un cliente.
              </p>
              <div className="mt-3 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2 border border-border/30">
                <p className="mb-1">Si crees que ya te asignaron clientes:</p>
                <ul className="list-disc list-inside space-y-0.5 opacity-80">
                  <li>Dale click a "Refrescar" arriba</li>
                  <li>Si sigue vacío, cierra sesión y vuelve a entrar</li>
                  <li>Si persiste, contacta al admin con tu email para verificar</li>
                </ul>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                ID de usuario: <span className="font-mono">{user?.id || "?"}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: counters.total },
          { label: "Pendientes",  value: counters.pendientes },
          { label: "Aprobados",   value: counters.aprobados },
          { label: "Publicados",  value: counters.publicados },
        ].map((k) => (
          <div key={k.label} className="glass gold-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold text-primary mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      {videos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Cliente:</span>
          <button
            onClick={() => setFilterClient("all")}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              filterClient === "all" ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >Todos</button>
          {clients.map((c) => (
            <button
              key={c.clienteId}
              onClick={() => setFilterClient(c.clienteId)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                filterClient === c.clienteId ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >{c.nombre}</button>
          ))}
          <span className="text-xs text-muted-foreground ml-3">Estado:</span>
          {[
            { k: "all",       l: "Todos" },
            { k: "pending",   l: "Pendientes" },
            { k: "approved",  l: "Aprobados" },
            { k: "changes",   l: "Cambios" },
            { k: "published", l: "Publicados" },
          ].map((s) => (
            <button
              key={s.k}
              onClick={() => setFilterStatus(s.k)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                filterStatus === s.k ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >{s.l}</button>
          ))}
        </div>
      )}

      {/* Videos list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /> Cargando entregas…
        </div>
      ) : visible.length === 0 ? (
        <div className="glass gold-border rounded-xl p-12 text-center space-y-3">
          <VideoIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-foreground font-medium">
            {videos.length === 0 ? "Aún no tienes entregas" : "No hay entregas con esos filtros"}
          </p>
          {videos.length === 0 && clients.length > 0 && (
            <Link to="/editor/nueva">
              <Button size="sm" className="gold-gradient text-primary-foreground mt-2">Crear primera entrega</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((v) => {
            const sb = statusBadge(v.status);
            const pb = priorityBadge(v.priority);
            return (
              <div key={v.id} className="glass gold-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                {/* Thumbnail */}
                <div className="w-full sm:w-32 h-32 sm:h-20 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <VideoIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-primary font-semibold">{v.recDisplay}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{v.clienteName}</span>
                      </div>
                      <h3 className="font-medium text-foreground truncate mt-0.5">{v.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[10px] ${sb.cls}`}>{sb.emoji} {sb.label}</Badge>
                      <span className={`text-[10px] ${pb.cls}`}>{pb.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>📅 {v.deliveryDate ? new Date(v.deliveryDate).toLocaleDateString("es-MX") : "—"}</span>
                    {v.costo != null && (
                      <span className={v.pagado ? "text-status-approved" : "text-status-pending"}>
                        💰 {v.moneda || ""} {v.costo.toFixed(2)} · {v.pagado ? "Pagado" : "Pendiente"}
                      </span>
                    )}
                    {v.driveLink && (
                      <a href={v.driveLink} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors">
                        <ExternalLink className="h-3 w-3" /> Drive
                      </a>
                    )}
                    {v.referenciaGuion && (
                      <a href={v.referenciaGuion} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 hover:text-primary transition-colors">
                        📄 Guion
                      </a>
                    )}
                    {v.linkPublicado && (
                      <a href={v.linkPublicado} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 hover:text-teal-400 transition-colors">
                        🌐 Publicado
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
