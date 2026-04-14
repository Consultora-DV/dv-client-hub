import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { videos as allVideos, Video } from "@/data/mockData";
import { X, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const platformColors: Record<string, string> = {
  instagram: "bg-instagram",
  tiktok: "bg-foreground text-background",
  youtube: "bg-youtube",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: "Pendiente de revisión", class: "bg-status-pending/20 text-status-pending border-status-pending/30" },
  approved: { label: "Aprobado", class: "bg-status-approved/20 text-status-approved border-status-approved/30" },
  changes: { label: "Cambios solicitados", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  published: { label: "Publicado", class: "bg-status-published/20 text-status-published border-status-published/30" },
};

function VideoCard({ video, onClick }: { video: Video; onClick: () => void }) {
  const status = statusConfig[video.status];
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="glass gold-border glass-hover rounded-xl overflow-hidden text-left w-full"
    >
      <div className="aspect-video relative overflow-hidden">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
        <Badge className={`absolute top-3 left-3 ${platformColors[video.platform]} text-xs`}>
          {platformLabels[video.platform]}
        </Badge>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.title}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-xs border ${status.class}`}>
            {status.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(video.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function VideoDetail({ video, onClose }: { video: Video; onClose: () => void }) {
  const [newComment, setNewComment] = useState("");
  const status = statusConfig[video.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass gold-border gold-glow rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-xl font-semibold text-foreground">{video.title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Preview */}
          {video.embedUrl ? (
            <div className="aspect-video bg-secondary rounded-xl flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Vista previa del video</p>
            </div>
          ) : (
            <img src={video.thumbnail} alt={video.title} className="w-full rounded-xl aspect-video object-cover" />
          )}

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`${platformColors[video.platform]} text-xs`}>
              {platformLabels[video.platform]}
            </Badge>
            <Badge variant="outline" className={`border ${status.class} text-xs`}>
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Entrega: {new Date(video.deliveryDate).toLocaleDateString("es-MX")}
            </span>
          </div>

          {/* Actions */}
          {(video.status === "pending" || video.status === "changes") && (
            <div className="flex gap-3">
              <Button className="bg-status-approved hover:bg-status-approved/80 text-foreground">
                <Check className="h-4 w-4 mr-2" /> Aprobar
              </Button>
              <Button variant="outline" className="border-status-changes/50 text-status-changes hover:bg-status-changes/10">
                <AlertTriangle className="h-4 w-4 mr-2" /> Solicitar cambios
              </Button>
            </div>
          )}

          {/* Drive link */}
          <a
            href={video.driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Ver guión en Drive
          </a>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Comentarios</h3>
            <div className="space-y-3 mb-4">
              {video.comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>
              )}
              {video.comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl p-3 text-sm ${
                    c.isClient ? "bg-primary/10 border border-primary/20 ml-8" : "bg-secondary mr-8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{c.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.date).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="bg-secondary border-border/50 rounded-xl resize-none"
                rows={2}
              />
              <Button size="sm" className="self-end gold-gradient text-primary-foreground shrink-0">
                Enviar
              </Button>
            </div>
          </div>

          {/* Status History */}
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

export default function VideosPage() {
  const [selected, setSelected] = useState<Video | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Videos y Aprobaciones</h1>
        <p className="text-sm text-muted-foreground mt-1">Revisa, comenta y aprueba tus videos</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {allVideos.map((video) => (
          <VideoCard key={video.id} video={video} onClick={() => setSelected(video)} />
        ))}
      </div>

      <AnimatePresence>
        {selected && <VideoDetail video={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
