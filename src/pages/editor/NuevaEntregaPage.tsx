import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, RefreshCw, FilePlus, Sparkles, ChevronDown, ChevronUp, Hash, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchEditorClients, suggestNextRec, submitVideoDelivery, updateVideoFields,
  fetchEditorPreferences, fetchVideoById, recDisplay,
  EditorClient, Moneda, Categoria, EditorPreferences, DEFAULT_EDITOR_PREFS,
} from "@/services/editorPortalService";

// Parse "R3-02", "R3 02", "3-02", "r3.02" etc → { rec_number, rec_order }
function parseRecInput(s: string): { recNumber: number; recOrder: number } | null {
  const m = (s || "").trim().match(/^[Rr]?\s*(\d+)\s*[-—–.\s]\s*(\d+)\s*$/);
  if (!m) return null;
  const recNumber = parseInt(m[1]);
  const recOrder  = parseInt(m[2]);
  if (recNumber < 1 || recOrder < 0) return null;
  return { recNumber, recOrder };
}

export default function NuevaEntregaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEditMode = !!editId;

  const [clients, setClients] = useState<EditorClient[]>([]);
  const [prefs, setPrefs] = useState<EditorPreferences>({ editorId: "", ...DEFAULT_EDITOR_PREFS });
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // form state
  const [clienteId, setClienteId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [recInput, setRecInput] = useState<string>("");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [suggested, setSuggested] = useState<{ recNumber: number; recOrder: number } | null>(null);
  const [driveLink, setDriveLink] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [embedUrl,  setEmbedUrl]  = useState("");
  const [costo, setCosto]   = useState<string>("");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [submitting, setSubmitting] = useState(false);

  // Parsed REC values (derived from text input)
  const parsedRec = parseRecInput(recInput);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchEditorClients(user.id),
      fetchEditorPreferences(user.id),
    ]).then(([cls, p]) => {
      setClients(cls);
      setPrefs(p);
      if (cls.length === 1) setClienteId(cls[0].clienteId);
      // If editor scheme is fixed/none, force costo blank
      if (p.paymentScheme !== "per_video") setCosto("");
      setLoadingClients(false);
    });
  }, [user?.id]);

  useEffect(() => {
    // En modo edición no pre-llenamos con sugerencia; cargamos la entrega existente
    if (isEditMode) return;
    suggestNextRec().then(({ recNumber, recOrder }) => {
      setSuggested({ recNumber, recOrder });
      setRecInput(recDisplay(recNumber, recOrder));
    });
  }, [isEditMode]);

  // Load existing video in edit mode
  useEffect(() => {
    if (!isEditMode || !editId) return;
    fetchVideoById(editId).then((v) => {
      if (!v) {
        toast.error("No se encontró la entrega");
        navigate("/editor/dashboard");
        return;
      }
      if (v.status !== "in_review") {
        toast.error("Solo puedes editar entregas en revisión");
        navigate("/editor/dashboard");
        return;
      }
      setClienteId(v.clienteId);
      setTitle(v.title);
      setCategoria(v.categoria);
      setRecInput(recDisplay(v.recNumber, v.recOrder));
      setDriveLink(v.driveLink || "");
      setThumbnail(v.thumbnail || "");
      setEmbedUrl(v.embedUrl || "");
      if (v.costo != null) setCosto(String(v.costo));
      if (v.moneda) setMoneda(v.moneda);
      setLoadingEdit(false);
    });
  }, [isEditMode, editId, navigate]);

  const useSuggested = () => {
    if (suggested) setRecInput(recDisplay(suggested.recNumber, suggested.recOrder));
  };

  const refreshRec = async () => {
    const { recNumber, recOrder } = await suggestNextRec();
    setSuggested({ recNumber, recOrder });
    setRecInput(recDisplay(recNumber, recOrder));
    toast.success(`Sugerido: ${recDisplay(recNumber, recOrder)}`);
  };

  // Increment helpers
  const bumpOrder = (delta: number) => {
    const p = parsedRec || suggested;
    if (!p) return;
    const next = Math.max(0, p.recOrder + delta);
    setRecInput(recDisplay(p.recNumber, next));
  };
  const bumpRec = (delta: number) => {
    const p = parsedRec || suggested;
    if (!p) return;
    const nextNum = Math.max(1, p.recNumber + delta);
    setRecInput(recDisplay(nextNum, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!clienteId)              { toast.error("Selecciona un cliente"); return; }
    if (!title.trim())           { toast.error("El título es obligatorio"); return; }
    if (!driveLink.trim())       { toast.error("El link del video es obligatorio"); return; }
    if (!parsedRec)              { toast.error("ID de entrega inválido. Usa el formato R3-02"); return; }
    if (categoria === null)      { toast.error("Selecciona la categoría del video"); return; }

    setSubmitting(true);

    if (isEditMode && editId) {
      // EDIT MODE — update existing video
      const result = await updateVideoFields(editId, {
        title: title.trim(),
        recNumber: parsedRec.recNumber,
        recOrder:  parsedRec.recOrder,
        categoria,
        driveLink: driveLink.trim(),
        thumbnail: thumbnail.trim() || null,
        embedUrl:  embedUrl.trim() || null,
        costo: prefs.paymentScheme === "per_video" && costo.trim() ? parseFloat(costo) : null,
        moneda: prefs.paymentScheme === "per_video" ? moneda : null,
      });
      setSubmitting(false);
      if (result.ok) {
        toast.success("Entrega actualizada");
        navigate("/editor/dashboard");
      } else {
        toast.error(result.error || "Error al guardar cambios");
      }
      return;
    }

    // CREATE MODE
    const result = await submitVideoDelivery(user.id, user.name, {
      clienteId,
      title: title.trim(),
      recNumber: parsedRec.recNumber,
      recOrder:  parsedRec.recOrder,
      categoria,
      driveLink: driveLink.trim(),
      thumbnail: thumbnail.trim() || null,
      embedUrl:  embedUrl.trim() || null,
      referenciaGuion: null,
      priority: "normal",
      costo: prefs.paymentScheme === "per_video" && costo.trim() ? parseFloat(costo) : null,
      moneda: prefs.paymentScheme === "per_video" ? moneda : null,
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success(`Entrega ${recDisplay(parsedRec.recNumber, parsedRec.recOrder)} registrada — en revisión`);
      navigate("/editor/dashboard");
    } else {
      toast.error(result.error);
    }
  };

  if (loadingClients || loadingEdit) {
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          {isEditMode ? <><Edit3 className="h-6 w-6 text-primary" /> Editar entrega</> : <><FilePlus className="h-6 w-6 text-primary" /> Nueva entrega</>}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEditMode
            ? "Modifica los datos de tu entrega. Solo se permite mientras esté en revisión."
            : "Registra un video editado para revisión del cliente."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 glass gold-border rounded-xl p-4 sm:p-6">
        {/* Cliente — pills si pocos, dropdown si muchos. Bloqueado en modo edición. */}
        <div className="space-y-2">
          <Label htmlFor="cliente-select">Cliente <span className="text-destructive">*</span></Label>
          {isEditMode ? (
            <div className="px-3 py-2 rounded-lg border border-border/40 bg-secondary/20 text-sm text-foreground">
              {clients.find((c) => c.clienteId === clienteId)?.nombre || "Cliente"}
              <span className="ml-2 text-[10px] text-muted-foreground">(no editable)</span>
            </div>
          ) : clients.length <= 4 ? (
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <button key={c.clienteId} type="button"
                  onClick={() => setClienteId(c.clienteId)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    clienteId === c.clienteId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-foreground hover:border-primary/50"
                  }`}>
                  {c.nombre}
                </button>
              ))}
            </div>
          ) : (
            <select id="cliente-select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/30 border border-border/40 rounded-lg text-sm focus:outline-none focus:border-primary/50">
              <option value="" className="bg-background">— Selecciona un cliente —</option>
              {clients.map((c) => (
                <option key={c.clienteId} value={c.clienteId} className="bg-background">{c.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* REC — single text input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="rec">ID de la entrega <span className="text-destructive">*</span></Label>
            {suggested && (
              <button type="button" onClick={useSuggested}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Usar sugerido: {recDisplay(suggested.recNumber, suggested.recOrder)}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[140px]">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="rec" value={recInput}
                onChange={(e) => setRecInput(e.target.value)}
                placeholder="R3-02"
                className="pl-9 font-mono text-base"
                autoComplete="off" />
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => bumpOrder(-1)}
                className="w-9 h-9 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm font-semibold"
                title="Restar 1 al orden">−</button>
              <button type="button" onClick={() => bumpOrder(1)}
                className="w-9 h-9 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm font-semibold"
                title="Sumar 1 al orden">+</button>
              <button type="button" onClick={() => bumpRec(1)}
                className="h-9 px-2 rounded-lg border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors text-xs whitespace-nowrap font-medium"
                title="Nuevo REC (siguiente sesión)">+REC</button>
              <button type="button" onClick={refreshRec}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                title="Recalcular sugerencia">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {parsedRec
              ? <>✓ Quedará como <span className="font-mono text-primary font-semibold">{recDisplay(parsedRec.recNumber, parsedRec.recOrder)}</span></>
              : recInput
                ? <span className="text-destructive">Formato inválido. Usa: R3-02, R3 02, o 3-02</span>
                : <>Formato: <span className="font-mono">R&#123;sesión&#125;-&#123;orden&#125;</span>, ej. R3-02</>}
          </p>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Nombre del video <span className="text-destructive">*</span></Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="ej. PIZARRON, COMPARATIVA ALIMENTOS, LICUADO…" required />
        </div>

        {/* Categoría 0-4 */}
        <div className="space-y-2">
          <Label>Categoría <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-5 gap-2">
            {([0, 1, 2, 3, 4] as const).map((cat) => (
              <button key={cat} type="button"
                onClick={() => setCategoria(cat)}
                className={`h-14 rounded-lg border-2 font-bold text-xl transition-all ${
                  categoria === cat
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_rgba(212,175,55,0.15)]"
                    : "border-border/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}>
                {cat}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Selecciona la categoría según las indicaciones del admin.
          </p>
        </div>

        {/* Drive link — el campo principal del editor */}
        <div className="space-y-2">
          <Label htmlFor="drive">Link del material entregado <span className="text-destructive">*</span></Label>
          <Input id="drive" type="url" value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/... (donde alojaste el video editado)" required />
          <p className="text-[11px] text-muted-foreground">
            Pega el link de Drive, WeTransfer, Dropbox o donde hayas subido el material final.
          </p>
        </div>

        {(prefs.showThumbnail || (prefs.showCosto && prefs.paymentScheme === "per_video") || prefs.showEmbed) && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border/30 pt-4"
            >
              <span>Opcional</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2">
                {prefs.showThumbnail && (
                  <div className="space-y-2">
                    <Label htmlFor="thumb">Miniatura (URL)</Label>
                    <Input id="thumb" type="url" value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="https://… (si no hay miniatura, déjalo vacío)" />
                  </div>
                )}

                {prefs.showCosto && prefs.paymentScheme === "per_video" && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="costo">Costo de edición</Label>
                      <Input id="costo" type="number" min={0} step="0.01" value={costo}
                        onChange={(e) => setCosto(e.target.value)}
                        placeholder="ej. 26" />
                    </div>
                    <div className="space-y-2">
                      <Label>Moneda</Label>
                      <div className="flex gap-1">
                        {(["USD", "MXN"] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setMoneda(m)}
                            className={`flex-1 px-2 py-2 rounded-lg border text-xs transition-colors ${
                              moneda === m
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/40 text-foreground hover:border-primary/50"
                            }`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {prefs.showEmbed && (
                  <div className="space-y-2">
                    <Label htmlFor="embed">Embed URL</Label>
                    <Input id="embed" type="url" value={embedUrl}
                      onChange={(e) => setEmbedUrl(e.target.value)}
                      placeholder="Para reproducir directo en el panel del cliente" />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Si paga fijo, mostrar info al editor */}
        {prefs.paymentScheme !== "per_video" && prefs.paymentScheme !== "none" && (
          <div className="text-xs text-muted-foreground bg-secondary/30 border border-border/30 rounded-lg p-3">
            💼 Tu esquema de pago es <strong className="text-foreground">{
              prefs.paymentScheme === "fixed_monthly" ? "mensual fijo"
              : prefs.paymentScheme === "fixed_weekly" ? "semanal fijo"
              : "quincenal fijo"
            }</strong>. No necesitas registrar costo por video.
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/30">
          <Button type="button" variant="ghost" onClick={() => navigate("/editor/dashboard")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}
            className="gold-gradient text-primary-foreground gap-1.5">
            {submitting ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Guardando…</>
            ) : isEditMode ? (
              <><Send className="h-4 w-4" /> Guardar cambios</>
            ) : (
              <><Send className="h-4 w-4" /> Registrar entrega</>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
