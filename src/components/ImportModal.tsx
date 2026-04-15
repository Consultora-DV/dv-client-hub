import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Check, AlertTriangle, ExternalLink, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { clients } from "@/data/mockData";
import { useAppState } from "@/contexts/AppStateContext";
import { useNavigate } from "react-router-dom";
import { scrapeInstagramPosts, ApifyInstagramPost } from "@/services/apifyService";
import { mapPostsToAppData } from "@/services/importMapper";
import { useApifyToken } from "@/hooks/useApifyToken";

type Step = "input" | "loading" | "preview" | "success";

const loadingMessages = [
  "Conectando con Instagram...",
  "Extrayendo datos de los posts...",
  "Procesando información...",
  "Casi listo...",
];

function isValidInstagramUrl(url: string): boolean {
  return /instagram\.com\/.+\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(url) ||
    /instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(url) ||
    /instagram\.com\/[A-Za-z0-9_.]+\/?$/i.test(url);
}

export function ImportModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { importFromApify, allVideos } = useAppState();
  const { token: localToken } = useApifyToken();
  const apiKey = import.meta.env.VITE_APIFY_API_KEY || localToken;

  const [step, setStep] = useState<Step>("input");
  const [urlText, setUrlText] = useState("");
  const [clienteId, setClienteId] = useState(clients[0]?.id || "");
  const [posts, setPosts] = useState<ApifyInstagramPost[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ videosAdded: number; eventsAdded: number; skipped: number; errors: string[]; metricsUpdated: number; metricsSkipped: number } | null>(null);
  const cancelRef = useRef(false);

  const urls = urlText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const validUrls = urls.filter(isValidInstagramUrl);
  const invalidUrls = urls.filter((u) => !isValidInstagramUrl(u));

  // Loading message rotation
  useEffect(() => {
    if (step !== "loading") return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % loadingMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [step]);

  const handleAnalyze = useCallback(async () => {
    if (!apiKey) return;
    setStep("loading");
    setError(null);
    cancelRef.current = false;
    setLoadingMsgIdx(0);

    try {
      const results = await scrapeInstagramPosts(validUrls, apiKey);
      if (cancelRef.current) return;
      setPosts(results);
      setSelectedPosts(new Set(results.map((p) => p.shortCode)));
      setStep("preview");
    } catch (err: any) {
      if (cancelRef.current) return;
      setError(err.message || "Error desconocido");
      setStep("input");
    }
  }, [apiKey, validUrls]);

  const handleCancel = () => {
    cancelRef.current = true;
    setStep("input");
  };

  const handleImport = () => {
    const selected = posts.filter((p) => selectedPosts.has(p.shortCode));
    const client = clients.find((c) => c.id === clienteId);
    const { videos, events } = mapPostsToAppData(selected, clienteId, client?.nombre || "");

    // importFromApify now handles all deduplication internally
    const result = importFromApify(videos, events);

    setResult({
      videosAdded: result.videosAdded,
      eventsAdded: result.eventsAdded,
      skipped: result.videosSkipped + result.eventsSkipped,
      errors: [],
      metricsUpdated: result.metricsAdded,
      metricsSkipped: result.metricsSkipped,
    });
    setStep("success");
  };

  const togglePost = (shortCode: string) => {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(shortCode)) next.delete(shortCode);
      else next.add(shortCode);
      return next;
    });
  };

  const videoCount = posts.filter((p) => p.isVideo || p.type === "Video").length;
  const imageCount = posts.length - videoCount;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass gold-border gold-glow rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Importar desde Instagram</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* STEP 1: Input */}
            {step === "input" && (
              <motion.div key="input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                {!apiKey && (
                  <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-4 space-y-2">
                    <p className="text-sm text-destructive font-medium">API key de Apify no configurada</p>
                    <p className="text-xs text-destructive/80">
                      Agrega <code className="bg-destructive/20 px-1 rounded">VITE_APIFY_API_KEY</code> en las variables de entorno, o configúrala desde el panel de Configuración.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-4">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                    <Button size="sm" variant="outline" className="mt-2 border-destructive/50 text-destructive" onClick={() => { setError(null); handleAnalyze(); }}>
                      Reintentar
                    </Button>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Links de Instagram</label>
                  <Textarea
                    value={urlText}
                    onChange={(e) => setUrlText(e.target.value)}
                    placeholder={"Pega aquí los links de Instagram, uno por línea:\nhttps://www.instagram.com/p/ABC123/\nhttps://www.instagram.com/reel/XYZ789/"}
                    className="bg-secondary border-border/50 rounded-xl resize-none min-h-[140px] font-mono text-xs"
                    rows={6}
                  />
                  <div className="flex items-center gap-3 mt-2">
                    {urls.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {validUrls.length} link{validUrls.length !== 1 ? "s" : ""} detectado{validUrls.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {invalidUrls.length > 0 && (
                      <span className="text-xs text-destructive">
                        {invalidUrls.length} URL{invalidUrls.length !== 1 ? "s" : ""} inválida{invalidUrls.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {invalidUrls.length > 0 && (
                  <div className="space-y-1">
                    {invalidUrls.map((u, i) => (
                      <div key={i} className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-1.5 truncate">
                        ✕ {u} — URL inválida
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Asignar a cliente</label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger className="bg-secondary border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass gold-border">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.colorAccent }} />
                            {c.nombre}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={validUrls.length === 0 || !clienteId || !apiKey}
                  className="w-full gold-gradient text-primary-foreground rounded-xl h-11"
                >
                  Analizar posts →
                </Button>
              </motion.div>
            )}

            {/* STEP 2: Loading */}
            {step === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground"
                  >
                    {loadingMessages[loadingMsgIdx]}
                  </motion.p>
                </AnimatePresence>
                <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-1/2 rounded-full gold-gradient animate-pulse" style={{ animation: "pulse 1.5s ease-in-out infinite, shimmer 2s linear infinite" }} />
                </div>
                <Button variant="outline" size="sm" onClick={handleCancel} className="border-border/50 text-muted-foreground">
                  Cancelar
                </Button>
              </motion.div>
            )}

            {/* STEP 3: Preview */}
            {step === "preview" && (
              <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {/* Summary card */}
                <div className="flex gap-4 p-4 rounded-xl bg-secondary/50 border border-border/50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{posts.length}</p>
                    <p className="text-xs text-muted-foreground">posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{videoCount}</p>
                    <p className="text-xs text-muted-foreground">videos/reels</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{imageCount}</p>
                    <p className="text-xs text-muted-foreground">imágenes</p>
                  </div>
                </div>

                {/* Posts list */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {posts.map((post) => {
                    const typeBadge = post.type === "Video"
                      ? { label: "REEL", cls: "bg-purple-500/20 text-purple-400" }
                      : post.type === "Sidecar"
                      ? { label: "CARRUSEL", cls: "bg-orange-500/20 text-orange-400" }
                      : { label: "POST", cls: "bg-blue-500/20 text-blue-400" };

                    return (
                      <div key={post.shortCode} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30 hover:border-primary/30 transition-colors">
                        <img
                          src={post.displayUrl}
                          alt=""
                          className="w-[60px] h-[60px] rounded-lg object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${typeBadge.cls}`}>{typeBadge.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground truncate">
                            {post.caption?.slice(0, 80) || "Sin descripción"}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>❤️ {post.likesCount.toLocaleString()}</span>
                            <span>💬 {post.commentsCount.toLocaleString()}</span>
                            {post.isVideo && post.videoViewCount && (
                              <span>👁 {post.videoViewCount >= 1000 ? `${(post.videoViewCount / 1000).toFixed(1)}K` : post.videoViewCount}</span>
                            )}
                          </div>
                        </div>
                        <Checkbox
                          checked={selectedPosts.has(post.shortCode)}
                          onCheckedChange={() => togglePost(post.shortCode)}
                          className="shrink-0 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("input")} className="border-border/50">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Volver
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedPosts.size === 0}
                    className="flex-1 gold-gradient text-primary-foreground rounded-xl"
                  >
                    Importar seleccionados ({selectedPosts.size})
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Success */}
            {step === "success" && result && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-10 space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center"
                >
                  <Check className="h-8 w-8 text-primary-foreground" />
                </motion.div>

                <h3 className="text-xl font-display font-bold text-foreground">¡Importación completada!</h3>

                <div className="space-y-2 text-sm text-center">
                  <p className="text-status-approved">✓ {result.videosAdded} videos añadidos al historial</p>
                  <p className="text-status-approved">✓ {result.eventsAdded} eventos creados en el calendario</p>
                  {result.metricsUpdated > 0 && (
                    <p className="text-status-approved">✓ Métricas de Instagram actualizadas con {result.metricsUpdated} posts</p>
                  )}
                  {result.skipped > 0 && (
                    <p className="text-status-pending">⚠ {result.skipped} posts ya existían (omitidos)</p>
                  )}
                  {result.errors.length > 0 && (
                    <p className="text-status-changes">⚠ {result.errors.length} posts no pudieron importarse</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { navigate("/videos"); onClose(); }} className="border-border/50">
                    Ver videos
                  </Button>
                  <Button variant="outline" onClick={() => { navigate("/calendario"); onClose(); }} className="border-border/50">
                    Ver calendario
                  </Button>
                  <Button onClick={onClose} className="gold-gradient text-primary-foreground">
                    Cerrar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
