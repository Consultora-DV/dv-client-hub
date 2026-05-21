import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FilePlus, RefreshCw, Video as VideoIcon, ExternalLink, Eye, CheckCircle2, Globe, ListChecks, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchEditorVideos, fetchEditorClients, fetchEditorPreferences, deleteVideo,
  EditorVideo, EditorClient, EditorPreferences, DEFAULT_EDITOR_PREFS,
} from "@/services/editorPortalService";

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; emoji: string }> = {
    pending:   { label: "Por hacer",   cls: "bg-secondary text-muted-foreground border-border/30", emoji: "📝" },
    in_review: { label: "En revisión", cls: "bg-status-pending/20 text-status-pending border-status-pending/30", emoji: "👀" },
    approved:  { label: "Aprobado",    cls: "bg-status-approved/20 text-status-approved border-status-approved/30", emoji: "✅" },
    changes:   { label: "Cambios",     cls: "bg-orange-500/20 text-orange-400 border-orange-500/30", emoji: "✏️" },
    published: { label: "Publicado",   cls: "bg-teal-500/20 text-teal-400 border-teal-500/30", emoji: "🌐" },
    entregado: { label: "Entregado",   cls: "bg-purple-500/20 text-purple-400 border-purple-500/30", emoji: "📦" },
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
  const [prefs, setPrefs] = useState<EditorPreferences>({ editorId: "", ...DEFAULT_EDITOR_PREFS });
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [vids, cls, p] = await Promise.all([
      fetchEditorVideos(user.id),
      fetchEditorClients(user.id),
      fetchEditorPreferences(user.id),
    ]);
    setVideos(vids);
    setClients(cls);
    setPrefs(p);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleDelete = async (videoId: string, recDisplay: string) => {
    if (!confirm(`¿Eliminar la entrega ${recDisplay}? Solo puedes borrar entregas que estén en revisión. Esta acción no se puede deshacer.`)) return;
    const result = await deleteVideo(videoId);
    if (result.ok) {
      toast.success("Entrega eliminada");
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } else {
      toast.error(result.error || "Error al eliminar");
    }
  };

  const visible = videos.filter((v) =>
    (filterClient === "all" || v.clienteId === filterClient) &&
    (filterStatus === "all" || v.status === filterStatus)
  );

  const counters = {
    total:     videos.length,
    enRevision: videos.filter((v) => v.status === "in_review").length,
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

      {/* Mi info — payment scheme summary */}
      {!loading && clients.length > 0 && (
        <div className="glass gold-border rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tu esquema:</span>
            <span className="text-foreground font-medium">
              {prefs.paymentScheme === "per_video"      && "💰 Pago por video"}
              {prefs.paymentScheme === "fixed_monthly"  && `💼 Fijo mensual${prefs.fixedAmount ? ` · ${prefs.fixedCurrency} ${prefs.fixedAmount}` : ""}`}
              {prefs.paymentScheme === "fixed_biweekly" && `💼 Fijo quincenal${prefs.fixedAmount ? ` · ${prefs.fixedCurrency} ${prefs.fixedAmount}` : ""}`}
              {prefs.paymentScheme === "fixed_weekly"   && `💼 Fijo semanal${prefs.fixedAmount ? ` · ${prefs.fixedCurrency} ${prefs.fixedAmount}` : ""}`}
              {prefs.paymentScheme === "none"           && "Sin pago configurado"}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Si necesitas cambiar algo, contacta al admin.</span>
        </div>
      )}

      {/* Counters — colored by status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass gold-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total</p>
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground/60" />
          </div>
          <p className="text-2xl font-bold text-primary mt-1">{counters.total}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-status-pending/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-status-pending">En revisión</p>
            <Eye className="h-3.5 w-3.5 text-status-pending/60" />
          </div>
          <p className="text-2xl font-bold text-status-pending mt-1">{counters.enRevision}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-status-approved/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-status-approved">Aprobados</p>
            <CheckCircle2 className="h-3.5 w-3.5 text-status-approved/60" />
          </div>
          <p className="text-2xl font-bold text-status-approved mt-1">{counters.aprobados}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-teal-500/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-teal-400">Publicados</p>
            <Globe className="h-3.5 w-3.5 text-teal-400/60" />
          </div>
          <p className="text-2xl font-bold text-teal-400 mt-1">{counters.publicados}</p>
        </div>
      </div>

      {/* Filters — dropdowns, consistent with admin */}
      {videos.length > 0 && (
        <div className="glass gold-border rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Cliente</label>
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
              className={`w-full text-xs px-2 py-1.5 rounded-lg border bg-transparent ${
                filterClient !== "all" ? "border-primary text-primary" : "border-border/40 text-foreground"
              }`}>
              <option value="all" className="bg-background">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.clienteId} value={c.clienteId} className="bg-background">{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Estado</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full text-xs px-2 py-1.5 rounded-lg border bg-transparent ${
                filterStatus !== "all" ? "border-primary text-primary" : "border-border/40 text-foreground"
              }`}>
              <option value="all" className="bg-background">Todos los estados</option>
              <option value="in_review" className="bg-background">En revisión</option>
              <option value="approved" className="bg-background">Aprobados</option>
              <option value="changes" className="bg-background">Cambios</option>
              <option value="published" className="bg-background">Publicados</option>
            </select>
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1 text-xs text-muted-foreground self-end pb-1">
            Mostrando <span className="text-foreground font-semibold">{visible.length}</span> de {videos.length}
          </div>
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
                        {v.categoria !== null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border/40 text-foreground font-semibold">
                            Cat. {v.categoria}
                          </span>
                        )}
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
                    {/* Acciones del editor cuando está en revisión */}
                    {v.status === "in_review" && (
                      <div className="ml-auto flex items-center gap-1">
                        <Link to={`/editor/nueva?id=${v.id}`}
                          className="flex items-center gap-1 px-2 py-1 rounded border border-border/40 hover:border-primary/50 hover:text-primary transition-colors">
                          <Edit3 className="h-3 w-3" /> Editar
                        </Link>
                        <button onClick={() => handleDelete(v.id, v.recDisplay)}
                          className="flex items-center gap-1 px-2 py-1 rounded border border-border/40 hover:border-destructive/50 hover:text-destructive transition-colors">
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </button>
                      </div>
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
