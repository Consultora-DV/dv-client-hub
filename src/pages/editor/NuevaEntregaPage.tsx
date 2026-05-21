import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Send, RefreshCw, FilePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchEditorClients, suggestNextRec, submitVideoDelivery,
  recDisplay, EditorClient,
} from "@/services/editorPortalService";

export default function NuevaEntregaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<EditorClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // form state
  const [clienteId, setClienteId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [recNumber, setRecNumber] = useState<number>(1);
  const [recOrder,  setRecOrder]  = useState<number>(1);
  const [driveLink, setDriveLink] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [embedUrl,  setEmbedUrl]  = useState("");
  const [priority,  setPriority]  = useState<"alta" | "normal" | "baja">("normal");
  const [submitting, setSubmitting] = useState(false);

  // ── Load clients ──
  useEffect(() => {
    if (!user) return;
    fetchEditorClients(user.id).then((cls) => {
      setClients(cls);
      if (cls.length === 1) setClienteId(cls[0].clienteId);
      setLoadingClients(false);
    });
  }, [user?.id]);

  // ── Pre-fill REC suggestion on mount ──
  useEffect(() => {
    suggestNextRec().then(({ recNumber, recOrder }) => {
      setRecNumber(recNumber);
      setRecOrder(recOrder);
    });
  }, []);

  const refreshRec = async () => {
    const { recNumber, recOrder } = await suggestNextRec();
    setRecNumber(recNumber);
    setRecOrder(recOrder);
    toast.success(`Sugerencia actualizada: ${recDisplay(recNumber, recOrder)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate
    if (!clienteId)           { toast.error("Selecciona un cliente");      return; }
    if (!title.trim())        { toast.error("El título es obligatorio");    return; }
    if (!driveLink.trim())    { toast.error("El link de Drive es obligatorio"); return; }
    if (recNumber < 1 || recOrder < 1) {
      toast.error("REC inválido"); return;
    }

    setSubmitting(true);
    const result = await submitVideoDelivery(user.id, {
      clienteId,
      title: title.trim(),
      recNumber, recOrder,
      driveLink: driveLink.trim(),
      thumbnail: thumbnail.trim() || null,
      embedUrl:  embedUrl.trim() || null,
      priority,
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success(`Entrega ${recDisplay(recNumber, recOrder)} registrada`);
      navigate("/editor/dashboard");
    } else {
      toast.error(result.error);
    }
  };

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <RefreshCw className="h-5 w-5 animate-spin" /> Cargando…
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="glass gold-border rounded-xl p-10 text-center space-y-3 max-w-lg mx-auto">
        <FilePlus className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <p className="text-foreground font-medium">No tienes clientes asignados</p>
        <p className="text-sm text-muted-foreground">
          Pídele al admin que te asigne al menos un cliente antes de subir entregas.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <FilePlus className="h-6 w-6 text-primary" /> Nueva entrega
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra un video editado para revisión del cliente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 glass gold-border rounded-xl p-6">
        {/* Cliente */}
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente <span className="text-destructive">*</span></Label>
          <div className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <button
                key={c.clienteId}
                type="button"
                onClick={() => setClienteId(c.clienteId)}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  clienteId === c.clienteId
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/40 text-foreground hover:border-primary/50"
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* REC */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>REC <span className="text-destructive">*</span></Label>
            <button
              type="button"
              onClick={refreshRec}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" /> Sugerir
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-foreground font-mono text-sm">R</span>
              <Input
                type="number" min={1}
                value={recNumber}
                onChange={(e) => setRecNumber(parseInt(e.target.value) || 1)}
                className="w-20 text-center font-mono"
              />
            </div>
            <span className="text-muted-foreground">—</span>
            <Input
              type="number" min={1}
              value={recOrder}
              onChange={(e) => setRecOrder(parseInt(e.target.value) || 1)}
              className="w-20 text-center font-mono"
            />
            <span className="ml-3 text-sm text-muted-foreground">
              ID: <span className="font-mono text-primary font-semibold">{recDisplay(recNumber, recOrder)}</span>
            </span>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Nombre del video <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ej. 5 mitos sobre tratamientos láser"
            required
          />
        </div>

        {/* Drive link */}
        <div className="space-y-2">
          <Label htmlFor="drive">Link de Drive <span className="text-destructive">*</span></Label>
          <Input
            id="drive"
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            required
          />
        </div>

        {/* Thumbnail (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="thumb">Miniatura (URL — opcional)</Label>
          <Input
            id="thumb"
            type="url"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://… (si no hay miniatura, déjalo vacío)"
          />
        </div>

        {/* Embed URL (opcional, para preview) */}
        <div className="space-y-2">
          <Label htmlFor="embed">Embed URL (opcional)</Label>
          <Input
            id="embed"
            type="url"
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="Para reproducir directo en el panel del cliente"
          />
        </div>

        {/* Prioridad */}
        <div className="space-y-2">
          <Label>Prioridad</Label>
          <div className="flex gap-2">
            {(["alta", "normal", "baja"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm transition-colors capitalize ${
                  priority === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/40 text-foreground hover:border-primary/50"
                }`}
              >
                {p === "alta" ? "🔥 " : ""}{p}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/30">
          <Button type="button" variant="ghost" onClick={() => navigate("/editor/dashboard")}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="gold-gradient text-primary-foreground gap-1.5"
          >
            {submitting ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Guardando…</>
            ) : (
              <><Send className="h-4 w-4" /> Registrar entrega</>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
