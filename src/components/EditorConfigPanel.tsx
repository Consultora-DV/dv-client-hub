import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Save, RefreshCw, Users as UsersIcon, DollarSign, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import {
  fetchEditorPreferences, upsertEditorPreferences,
  fetchEditorAssignedClientIds, setEditorAssignment,
  EditorPreferences, PaymentScheme, DEFAULT_EDITOR_PREFS,
} from "@/services/editorPortalService";

interface Props {
  editorId: string;
  editorName: string;
  onClose: () => void;
}

const PAYMENT_SCHEMES: { value: PaymentScheme; label: string; helper: string }[] = [
  { value: "per_video",      label: "Por video",       helper: "Cada entrega tiene su costo individual" },
  { value: "fixed_monthly",  label: "Fijo mensual",    helper: "Monto fijo al mes, sin costo por video" },
  { value: "fixed_biweekly", label: "Fijo quincenal",  helper: "Monto fijo cada 15 días" },
  { value: "fixed_weekly",   label: "Fijo semanal",    helper: "Monto fijo cada semana" },
  { value: "none",           label: "Sin pago",        helper: "Editor interno / no se paga por trabajo" },
];

export function EditorConfigPanel({ editorId, editorName, onClose }: Props) {
  const { user: currentUser } = useAuth();
  const { clients } = useAppState();

  const [prefs, setPrefs] = useState<EditorPreferences>({ editorId, ...DEFAULT_EDITOR_PREFS });
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchEditorPreferences(editorId),
      fetchEditorAssignedClientIds(editorId),
    ]).then(([p, a]) => {
      setPrefs(p);
      setAssigned(a);
      setLoading(false);
    });
  }, [editorId]);

  const toggleClient = async (clienteId: string) => {
    if (!currentUser) return;
    const willAssign = !assigned.has(clienteId);
    // optimistic
    const next = new Set(assigned);
    if (willAssign) next.add(clienteId); else next.delete(clienteId);
    setAssigned(next);

    const result = await setEditorAssignment(editorId, clienteId, willAssign, currentUser.id);
    if (!result.ok) {
      toast.error(result.error || "Error");
      // revert
      const revert = new Set(assigned);
      setAssigned(revert);
    } else {
      toast.success(willAssign ? "Cliente asignado" : "Cliente desasignado");
    }
  };

  const handleSavePrefs = async () => {
    if (!currentUser) return;
    setSaving(true);
    const result = await upsertEditorPreferences(prefs, currentUser.id);
    setSaving(false);
    if (result.ok) toast.success("Preferencias guardadas");
    else toast.error(result.error || "Error al guardar");
  };

  const needsFixed = prefs.paymentScheme !== "per_video" && prefs.paymentScheme !== "none";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm overlay-safe"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass gold-border gold-glow rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Configurar editor</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{editorName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* ── Clientes asignados ───────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Clientes asignados</h3>
                <span className="text-xs text-muted-foreground">({assigned.size} de {clients.length})</span>
              </div>
              <p className="text-xs text-muted-foreground">
                El editor solo verá los clientes marcados aquí en su formulario de entrega.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clients.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic col-span-full">
                    No hay clientes creados aún.
                  </p>
                ) : (
                  clients.map((c) => {
                    const isOn = assigned.has(c.id);
                    return (
                      <button key={c.id} onClick={() => toggleClient(c.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                          isOn
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/40 text-foreground hover:border-primary/50"
                        }`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          isOn ? "bg-primary border-primary text-primary-foreground" : "border-border/60"
                        }`}>
                          {isOn ? "✓" : ""}
                        </div>
                        <span className="truncate">{c.nombre}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* ── Esquema de pago ───────────────────────────── */}
            <section className="space-y-3 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Esquema de pago</h3>
              </div>
              <div className="space-y-2">
                {PAYMENT_SCHEMES.map((s) => {
                  const active = prefs.paymentScheme === s.value;
                  return (
                    <button key={s.value}
                      onClick={() => setPrefs({ ...prefs, paymentScheme: s.value, showCosto: s.value === "per_video" })}
                      className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border/40 hover:border-primary/50"
                      }`}>
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 ${
                        active ? "border-primary bg-primary" : "border-border/60"
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                          {s.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.helper}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {needsFixed && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="fixed_amount" className="text-xs">Monto fijo</Label>
                    <Input id="fixed_amount" type="number" min={0} step="0.01"
                      value={prefs.fixedAmount ?? ""}
                      onChange={(e) => setPrefs({ ...prefs, fixedAmount: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="ej. 800" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Moneda</Label>
                    <div className="flex gap-1">
                      {(["USD", "MXN"] as const).map((m) => (
                        <button key={m} type="button"
                          onClick={() => setPrefs({ ...prefs, fixedCurrency: m })}
                          className={`flex-1 px-2 py-2 rounded-lg border text-xs transition-colors ${
                            prefs.fixedCurrency === m
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/40 hover:border-primary/50"
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── Visibilidad de campos ─────────────────────── */}
            <section className="space-y-3 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">¿Qué campos ve el editor?</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Solo afecta a este editor. Las columnas ocultas no aparecen en su formulario ni en sus entregas.
              </p>
              <div className="space-y-1.5">
                {([
                  { key: "showThumbnail",   label: "Miniatura",            desc: "URL de la miniatura del video" },
                  { key: "showCosto",       label: "Costo por video",      desc: "Solo aplica si paga por video" },
                  { key: "showEmbed",       label: "Embed URL",            desc: "Para preview en panel cliente" },
                  { key: "showReferencia",  label: "Referencia / Guion",   desc: "Normalmente el admin lo agrega, no el editor" },
                  { key: "showPublicado",   label: "Link publicado",       desc: "Normalmente lo agrega admin tras publicar" },
                ] as const).map((f) => {
                  const on = prefs[f.key];
                  return (
                    <button key={f.key}
                      onClick={() => setPrefs({ ...prefs, [f.key]: !on })}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                        on
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-primary/30 opacity-60"
                      }`}>
                      <div>
                        <p className={`text-sm ${on ? "text-foreground" : "text-muted-foreground"}`}>{f.label}</p>
                        <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                      </div>
                      {on
                        ? <Eye className="h-4 w-4 text-primary" />
                        : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Notas ─────────────────────────────────────── */}
            <section className="space-y-2 pt-4 border-t border-border/30">
              <Label htmlFor="notes" className="text-xs">Notas (privadas — solo admin)</Label>
              <textarea id="notes"
                value={prefs.notes || ""}
                onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })}
                rows={3}
                placeholder="ej. Mojca pagos por PayPal, contacto: …"
                className="w-full px-3 py-2 bg-secondary/30 border border-border/40 rounded-lg text-sm resize-none focus:outline-none focus:border-primary/50" />
            </section>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border/30 bg-secondary/10">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleSavePrefs} disabled={saving || loading}
            className="gold-gradient text-primary-foreground gap-1.5">
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar preferencias"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
