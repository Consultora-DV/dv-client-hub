import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Video as VideoIcon, ExternalLink, Trash2, Check, X,
  Edit3, DollarSign, SlidersHorizontal, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchAllVideos, updateVideoFields, deleteVideo,
  EditorVideo, Priority, Moneda,
} from "@/services/editorPortalService";
import { ImportEntregasModal } from "@/components/ImportEntregasModal";
import { useAppState } from "@/contexts/AppStateContext";

const STATUS_OPTIONS = [
  { value: "pending",   label: "Por hacer",  cls: "bg-status-pending/20 text-status-pending border-status-pending/30" },
  { value: "approved",  label: "Aprobado",   cls: "bg-status-approved/20 text-status-approved border-status-approved/30" },
  { value: "changes",   label: "Cambios",    cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "published", label: "Publicado",  cls: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
];

function statusInfo(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];
}

export default function AdminEntregasPage() {
  const { clients } = useAppState();
  const [videos, setVideos] = useState<EditorVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaid, setFilterPaid]     = useState<"all" | "yes" | "no">("all");
  const [filterRec, setFilterRec]       = useState<string>("all");
  const [filterEditor, setFilterEditor] = useState<string>("all");
  const [filterMonth, setFilterMonth]   = useState<string>("all"); // "YYYY-MM"
  const [sortBy, setSortBy] = useState<"rec_desc" | "rec_asc" | "date_desc" | "date_asc">("rec_desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    setVideos(await fetchAllVideos());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Derived: available filter options from current data
  const availableRecs = useMemo(() => {
    const s = new Set<number>();
    videos.forEach((v) => v.recNumber != null && s.add(v.recNumber));
    return Array.from(s).sort((a, b) => b - a);
  }, [videos]);

  const availableEditors = useMemo(() => {
    const s = new Set<string>();
    videos.forEach((v) => v.editorName && s.add(v.editorName));
    return Array.from(s).sort();
  }, [videos]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    videos.forEach((v) => {
      const d = v.createdAt;
      if (d) s.add(d.slice(0, 7)); // YYYY-MM
    });
    return Array.from(s).sort().reverse();
  }, [videos]);

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-");
    const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${names[parseInt(m) - 1]} ${y}`;
  };

  // Count active advanced filters
  const activeAdvanced = [
    filterRec !== "all", filterEditor !== "all", filterMonth !== "all"
  ].filter(Boolean).length;

  const visible = useMemo(() => {
    let list = videos.filter((v) =>
      (filterClient === "all" || v.clienteId === filterClient) &&
      (filterStatus === "all" || v.status === filterStatus) &&
      (filterPaid   === "all" || (filterPaid === "yes" ? v.pagado : !v.pagado)) &&
      (filterRec    === "all" || v.recNumber === parseInt(filterRec)) &&
      (filterEditor === "all" || v.editorName === filterEditor) &&
      (filterMonth  === "all" || (v.createdAt || "").startsWith(filterMonth))
    );
    list = list.sort((a, b) => {
      if (sortBy === "rec_desc") return (b.recNumber || 0) - (a.recNumber || 0) || (b.recOrder || 0) - (a.recOrder || 0);
      if (sortBy === "rec_asc")  return (a.recNumber || 0) - (b.recNumber || 0) || (a.recOrder || 0) - (b.recOrder || 0);
      if (sortBy === "date_desc") return (b.createdAt || "").localeCompare(a.createdAt || "");
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
    return list;
  }, [videos, filterClient, filterStatus, filterPaid, filterRec, filterEditor, filterMonth, sortBy]);

  const clearAdvancedFilters = () => {
    setFilterRec("all"); setFilterEditor("all"); setFilterMonth("all");
  };

  const totals = useMemo(() => {
    const t = { usd: 0, mxn: 0, usdPagado: 0, mxnPagado: 0 };
    for (const v of videos) {
      if (v.costo == null) continue;
      if (v.moneda === "USD") {
        t.usd += v.costo;
        if (v.pagado) t.usdPagado += v.costo;
      } else if (v.moneda === "MXN") {
        t.mxn += v.costo;
        if (v.pagado) t.mxnPagado += v.costo;
      }
    }
    return t;
  }, [videos]);

  const handleUpdate = async (id: string, field: string, value: any) => {
    const result = await updateVideoFields(id, { [field]: value } as any);
    if (result.ok) {
      setVideos((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } : v));
    } else {
      toast.error(result.error || "Error al guardar");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    const result = await deleteVideo(id);
    if (result.ok) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Entrega eliminada");
    } else {
      toast.error(result.error || "Error al eliminar");
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <VideoIcon className="h-6 w-6 text-primary" /> Entregas — Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión completa de videos. Edita inline, marca como pagado, borra.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
          📥 Importar entregas (CSV)
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass gold-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total entregas</p>
          <p className="text-2xl font-bold text-primary mt-1">{videos.length}</p>
        </div>
        <div className="glass gold-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">USD acumulado</p>
          <p className="text-lg font-bold text-foreground mt-1">${totals.usd.toFixed(2)}</p>
          <p className="text-[10px] text-status-approved">Pagado: ${totals.usdPagado.toFixed(2)}</p>
        </div>
        <div className="glass gold-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">MXN acumulado</p>
          <p className="text-lg font-bold text-foreground mt-1">${totals.mxn.toFixed(2)}</p>
          <p className="text-[10px] text-status-approved">Pagado: ${totals.mxnPagado.toFixed(2)}</p>
        </div>
        <div className="glass gold-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pendiente pago</p>
          <p className="text-lg font-bold text-status-pending mt-1">
            ${(totals.usd - totals.usdPagado).toFixed(2)} USD
          </p>
          <p className="text-[10px] text-status-pending">
            ${(totals.mxn - totals.mxnPagado).toFixed(2)} MXN
          </p>
        </div>
      </div>

      {/* Primary filters (inline) */}
      <div className="glass gold-border rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          {/* Cliente */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Cliente:</span>
            <button onClick={() => setFilterClient("all")}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                filterClient === "all" ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}>Todos</button>
            {clients.map((c) => (
              <button key={c.id} onClick={() => setFilterClient(c.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  filterClient === c.id ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
                }`}>{c.nombre}</button>
            ))}
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Estado:</span>
            <button onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                filterStatus === "all" ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}>Todos</button>
            {STATUS_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  filterStatus === s.value ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
                }`}>{s.label}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Pago:</span>
            {[{k:"all",l:"Todos"},{k:"yes",l:"Pagado"},{k:"no",l:"Pendiente"}].map((p) => (
              <button key={p.k} onClick={() => setFilterPaid(p.k as any)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  filterPaid === p.k ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"
                }`}>{p.l}</button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Ordenar:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2 py-1 rounded-lg border border-border/40 bg-transparent">
              <option value="rec_desc" className="bg-background">REC ↓ (nuevo)</option>
              <option value="rec_asc" className="bg-background">REC ↑ (viejo)</option>
              <option value="date_desc" className="bg-background">Fecha ↓</option>
              <option value="date_asc" className="bg-background">Fecha ↑</option>
            </select>
          </div>

          <button onClick={() => setShowAdvancedFilters((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              activeAdvanced > 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}>
            <SlidersHorizontal className="h-3 w-3" />
            Más filtros{activeAdvanced > 0 && ` (${activeAdvanced})`}
            {showAdvancedFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Advanced filters (collapsible) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/30">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">REC #</label>
              <select value={filterRec} onChange={(e) => setFilterRec(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border/40 bg-transparent">
                <option value="all" className="bg-background">Todos los REC</option>
                {availableRecs.map((r) => (
                  <option key={r} value={r} className="bg-background">R{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Editor</label>
              <select value={filterEditor} onChange={(e) => setFilterEditor(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border/40 bg-transparent">
                <option value="all" className="bg-background">Todos los editores</option>
                {availableEditors.map((ed) => (
                  <option key={ed} value={ed} className="bg-background">{ed}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Mes de entrega</label>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border/40 bg-transparent">
                <option value="all" className="bg-background">Todos los meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-background">{monthLabel(m)}</option>
                ))}
              </select>
            </div>

            {activeAdvanced > 0 && (
              <button onClick={clearAdvancedFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline col-span-full justify-self-end">
                Limpiar filtros avanzados
              </button>
            )}
          </div>
        )}

        {/* Result counter */}
        <div className="text-[11px] text-muted-foreground pt-1">
          {visible.length} de {videos.length} entregas
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /> Cargando…
        </div>
      ) : visible.length === 0 ? (
        <div className="glass gold-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Sin entregas con esos filtros</p>
        </div>
      ) : (
        <div className="glass gold-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">REC</th>
                  <th className="text-left px-3 py-2 font-medium">Cliente</th>
                  <th className="text-left px-3 py-2 font-medium">Título</th>
                  <th className="text-left px-3 py-2 font-medium">Editor</th>
                  <th className="text-left px-3 py-2 font-medium">Estado</th>
                  <th className="text-left px-3 py-2 font-medium">Prioridad</th>
                  <th className="text-left px-3 py-2 font-medium">Entregado</th>
                  <th className="text-left px-3 py-2 font-medium">Costo</th>
                  <th className="text-center px-3 py-2 font-medium">Pago</th>
                  <th className="text-left px-3 py-2 font-medium">Links</th>
                  <th className="text-right px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((v) => {
                  const isEditing = editingId === v.id;
                  const sInfo = statusInfo(v.status);
                  return (
                    <tr key={v.id} className="border-t border-border/30 hover:bg-secondary/20">
                      <td className="px-3 py-2 font-mono text-xs text-primary font-semibold whitespace-nowrap">
                        {v.recDisplay}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{v.clienteName}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        {isEditing ? (
                          <Input defaultValue={v.title} className="h-8 text-xs"
                            onBlur={(e) => handleUpdate(v.id, "title", e.target.value)} />
                        ) : (
                          <span className="truncate block">{v.title}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{v.editorName || "—"}</td>
                      <td className="px-3 py-2">
                        <select
                          value={v.status}
                          onChange={(e) => handleUpdate(v.id, "status", e.target.value)}
                          className={`text-[10px] px-2 py-1 rounded border ${sInfo.cls} bg-transparent`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-background text-foreground">
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={v.priority}
                          onChange={(e) => handleUpdate(v.id, "priority", e.target.value as Priority)}
                          className="text-xs px-2 py-1 rounded border border-border/40 bg-transparent"
                        >
                          <option value="alta" className="bg-background">Alta</option>
                          <option value="normal" className="bg-background">Normal</option>
                          <option value="baja" className="bg-background">Baja</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[11px] text-muted-foreground">
                        {v.createdAt
                          ? new Date(v.createdAt).toLocaleString("es-MX", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" defaultValue={v.costo ?? ""} step="0.01" className="h-7 w-16 text-xs"
                              onBlur={(e) => handleUpdate(v.id, "costo", e.target.value ? parseFloat(e.target.value) : null)} />
                            <select defaultValue={v.moneda ?? "USD"}
                              onChange={(e) => handleUpdate(v.id, "moneda", e.target.value as Moneda)}
                              className="text-[10px] px-1 py-1 rounded border border-border/40 bg-transparent">
                              <option value="USD" className="bg-background">USD</option>
                              <option value="MXN" className="bg-background">MXN</option>
                            </select>
                          </div>
                        ) : (
                          v.costo != null ? `${v.moneda || ""} ${v.costo.toFixed(2)}` : "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => handleUpdate(v.id, "pagado", !v.pagado)}
                          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                            v.pagado
                              ? "bg-status-approved/20 border-status-approved text-status-approved"
                              : "bg-secondary border-border/40 text-muted-foreground hover:border-primary/50"
                          }`}>
                          {v.pagado ? <Check className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {v.driveLink && <a href={v.driveLink} target="_blank" rel="noreferrer" title="Drive"
                            className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                          {v.referenciaGuion && <a href={v.referenciaGuion} target="_blank" rel="noreferrer" title="Guion"
                            className="text-muted-foreground hover:text-primary">📄</a>}
                          {v.linkPublicado && <a href={v.linkPublicado} target="_blank" rel="noreferrer" title="Publicado"
                            className="text-muted-foreground hover:text-teal-400">🌐</a>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingId(isEditing ? null : v.id)}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                            {isEditing ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(v.id, v.title)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <ImportEntregasModal
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
    </motion.div>
  );
}
