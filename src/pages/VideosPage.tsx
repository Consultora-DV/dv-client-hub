import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, clients } from "@/data/mockData";
import { X, ExternalLink, Check, AlertTriangle, Plus, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { CalendarIcon } from "lucide-react";

const platformColors: Record<string, string> = {
  instagram: "bg-instagram",
  tiktok: "bg-foreground text-background",
  youtube: "bg-youtube",
  facebook: "bg-status-published",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
};

const allPlatforms = ["instagram", "tiktok", "youtube", "facebook"];

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: "Pendiente", class: "bg-status-pending/20 text-status-pending border-status-pending/30" },
  approved: { label: "Aprobado", class: "bg-status-approved/20 text-status-approved border-status-approved/30" },
  changes: { label: "Cambios solicitados", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  published: { label: "Publicado", class: "bg-status-published/20 text-status-published border-status-published/30" },
};

function PlatformPills({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {platforms.map((p) => (
        <Badge key={p} className={`${platformColors[p] || "bg-secondary"} text-xs`}>
          {platformLabels[p] || p}
        </Badge>
      ))}
    </div>
  );
}

function VideoCard({ video, commentCount, onClick }: { video: Video; commentCount: number; onClick: () => void }) {
  const status = statusConfig[video.status];
  const client = clients.find((c) => c.id === video.clienteId);
  const isImported = !!video.igShortCode;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="glass gold-border glass-hover rounded-xl overflow-hidden text-left w-full"
    >
      <div className="aspect-video relative overflow-hidden">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
        <div className="absolute top-3 left-3 flex gap-1 flex-wrap">
          <PlatformPills platforms={video.platform} />
        </div>
        {isImported && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">📥 Instagram</Badge>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.title}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-xs border ${status.class}`}>{status.label}</Badge>
          <div className="flex items-center gap-2">
            {client && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: client.colorAccent + "22", color: client.colorAccent }}>
                {client.avatar}
              </span>
            )}
            {commentCount > 0 && <span className="text-xs text-muted-foreground">💬 {commentCount}</span>}
            <span className="text-xs text-muted-foreground">
              {new Date(video.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function InstagramDataSection({ video }: { video: Video }) {
  const [expanded, setExpanded] = useState(false);
  const caption = video.igCaption || "";
  const isLong = caption.length > 150;

  return (
    <div className="rounded-xl bg-secondary/50 border border-border/50 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Instagram className="h-4 w-4 text-pink-400" />
        Datos de Instagram
      </h4>
      {caption && (
        <div className="text-xs text-muted-foreground">
          <p>{expanded || !isLong ? caption : caption.slice(0, 150) + "..."}</p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="text-primary hover:underline mt-1 text-[11px]">
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}
      {video.igHashtags && video.igHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {video.igHashtags.map((h, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{h}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>❤️ {(video.igLikes || 0).toLocaleString()}</span>
        <span>💬 {(video.igComments || 0).toLocaleString()}</span>
        {(video.igViews || 0) > 0 && <span>👁 {(video.igViews! >= 1000 ? `${(video.igViews! / 1000).toFixed(1)}K` : video.igViews)}</span>}
      </div>
      {video.embedUrl && (
        <a href={video.embedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          Ver en Instagram <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function VideoDetail({ video, onClose }: { video: Video; onClose: () => void }) {
  const [newComment, setNewComment] = useState("");
  const [showChangesInput, setShowChangesInput] = useState(false);
  const [changesText, setChangesText] = useState("");
  const { approveVideo, requestChanges, addComment, comments } = useAppState();
  const { canApprove } = usePermissions();
  const status = statusConfig[video.status];
  const videoComments = comments[video.id] || [];
  const client = clients.find((c) => c.id === video.clienteId);

  const handleApprove = () => { approveVideo(video.id); onClose(); };
  const handleRequestChanges = () => {
    if (showChangesInput && changesText.trim()) { requestChanges(video.id, changesText.trim()); onClose(); }
    else setShowChangesInput(true);
  };
  const handleSendComment = () => {
    if (!newComment.trim()) return;
    addComment(video.id, newComment.trim());
    setNewComment("");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-xl font-semibold text-foreground">{video.title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-6">
          {video.embedUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe src={video.embedUrl} className="w-full h-full border-0" allowFullScreen />
            </div>
          ) : (
            <img src={video.thumbnail} alt={video.title} className="w-full rounded-xl aspect-video object-cover" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <PlatformPills platforms={video.platform} />
            <Badge variant="outline" className={`border ${status.class} text-xs`}>{status.label}</Badge>
            {client && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: client.colorAccent + "22", color: client.colorAccent }}>{client.nombre}</span>}
            <span className="text-xs text-muted-foreground">Entrega: {new Date(video.deliveryDate).toLocaleDateString("es-MX")}</span>
          </div>
          {canApprove && (video.status === "pending" || video.status === "changes") && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button onClick={handleApprove} className="bg-status-approved hover:bg-status-approved/80 text-foreground"><Check className="h-4 w-4 mr-2" /> Aprobar</Button>
                <Button onClick={handleRequestChanges} variant="outline" className="border-status-changes/50 text-status-changes hover:bg-status-changes/10"><AlertTriangle className="h-4 w-4 mr-2" /> Solicitar cambios</Button>
              </div>
              {showChangesInput && (
                <div className="space-y-2">
                  <Textarea value={changesText} onChange={(e) => setChangesText(e.target.value)} placeholder="Describe los cambios..." className="bg-secondary border-border/50 rounded-xl resize-none" rows={3} />
                  <Button onClick={handleRequestChanges} disabled={!changesText.trim()} size="sm" className="gold-gradient text-primary-foreground">Confirmar cambios</Button>
                </div>
              )}
            </div>
          )}
          <a href={video.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ExternalLink className="h-4 w-4" /> Ver guión en Drive
          </a>

          {/* Instagram Data Section */}
          {video.igShortCode && (
            <InstagramDataSection video={video} />
          )}

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Comentarios ({videoComments.length})</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {videoComments.length === 0 && <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>}
              {videoComments.map((c) => (
                <div key={c.id} className={`rounded-xl p-3 text-sm ${
                  c.isClient
                    ? `ml-8 border-l-2`
                    : "bg-secondary mr-8 border-l-2 border-l-primary/50"
                }`} style={c.isClient && client ? { backgroundColor: client.colorAccent + "15", borderLeftColor: client.colorAccent } : undefined}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{c.author}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true, locale: es })}</span>
                  </div>
                  <p className="text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="bg-secondary border-border/50 rounded-xl resize-none" rows={2} />
              <Button onClick={handleSendComment} size="sm" className="self-end gold-gradient text-primary-foreground shrink-0">Enviar</Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Historial</h3>
            <div className="space-y-2">
              {video.statusHistory.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-muted-foreground">{s.date}</span>
                  <span className="text-foreground">{s.status}</span>
                  <span className="text-muted-foreground">— {s.by}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddVideoModal({ onClose }: { onClose: () => void }) {
  const { setVideos } = useAppState();
  const [title, setTitle] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [embedUrl, setEmbedUrl] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [clienteId, setClienteId] = useState(clients[0].id);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleSave = () => {
    if (!title.trim() || !deliveryDate || platforms.length === 0) return;
    const newVideo: Video = {
      id: `v_${Date.now()}`,
      clienteId,
      title: title.trim(),
      platform: platforms,
      status: "pending",
      thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
      deliveryDate: format(deliveryDate, "yyyy-MM-dd"),
      embedUrl: embedUrl || undefined,
      driveLink: driveLink || "#",
      comments: [],
      statusHistory: [{ status: "Pendiente de revisión", date: format(new Date(), "yyyy-MM-dd"), by: "Equipo DV" }],
    };
    setVideos((prev) => [newVideo, ...prev]);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Agregar Video</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="Nombre del video" /></div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Plataformas</label>
            <div className="flex gap-2 flex-wrap">
              {allPlatforms.map((p) => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    platforms.includes(p) ? `${platformColors[p]} border-transparent` : "bg-secondary text-muted-foreground border-border/50"
                  }`}>
                  {platformLabels[p]}
                </button>
              ))}
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">URL del video (embed)</label>
            <Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="https://..." /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Link guión en Drive</label>
            <Input value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="https://drive.google.com/..." /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Cliente asignado</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Fecha de entrega</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left bg-secondary border-border/50 rounded-xl", !deliveryDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 glass gold-border" align="start">
                <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover></div>
          <Button onClick={handleSave} disabled={!title.trim() || !deliveryDate || platforms.length === 0} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">Publicar para revisión</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function VideosPage() {
  const [selected, setSelected] = useState<Video | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { videos, comments } = useAppState();
  const { canAddVideos } = usePermissions();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Videos y Aprobaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Revisa, comenta y aprueba tus videos</p>
        </div>
        {canAddVideos && (
          <Button onClick={() => setShowAddModal(true)} className="gold-gradient text-primary-foreground rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Agregar video
          </Button>
        )}
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} commentCount={(comments[video.id] || []).length} onClick={() => setSelected(video)} />
        ))}
      </div>
      <AnimatePresence>
        {selected && <VideoDetail video={videos.find((v) => v.id === selected.id) || selected} onClose={() => setSelected(null)} />}
        {showAddModal && <AddVideoModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
