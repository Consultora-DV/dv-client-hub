import { useState, useCallback, useMemo } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ListPagination } from "@/components/ListPagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, FileText, File, Table, Presentation, Plus, X, Upload, Eye, EyeOff, Check, AlertTriangle, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Document, Script, Comment } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const isRecent = (dateStr: string) => differenceInDays(new Date(), new Date(dateStr)) < 3;

const scriptStatusConfig: Record<string, { label: string; class: string }> = {
  nuevo: { label: "Nuevo", class: "bg-status-pending/20 text-status-pending border-status-pending/30" },
  en_revision: { label: "En revisión", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  aprobado: { label: "Aprobado", class: "bg-status-approved/20 text-status-approved border-status-approved/30" },
  cambios_solicitados: { label: "Cambios solicitados", class: "bg-youtube/20 text-youtube border-youtube/30" },
};

const typeIcons: Record<string, typeof FileText> = { pdf: File, doc: FileText, sheet: Table, slide: Presentation };
const typeLabels: Record<string, string> = { pdf: "PDF", doc: "Documento", sheet: "Hoja de cálculo", slide: "Presentación" };

function ScriptDetailModal({ script, onClose }: { script: Script; onClose: () => void }) {
  const { user } = useAuth();
  const { approveScript, requestChangesScript, addScriptComment, scriptComments, clients: appClients } = useAppState();
  const { canApprove } = usePermissions();
  const [newComment, setNewComment] = useState("");
  const [showChangesInput, setShowChangesInput] = useState(false);
  const [changesText, setChangesText] = useState("");

  const comments: Comment[] = scriptComments[script.id] || [];
  const status = scriptStatusConfig[script.status];
  const client = appClients.find((c) => c.id === script.clienteId);

  const handleApprove = useCallback(() => {
    approveScript(script.id);
    onClose();
  }, [script.id, approveScript, onClose]);

  const handleRequestChanges = useCallback(() => {
    if (showChangesInput && changesText.trim()) {
      requestChangesScript(script.id, changesText.trim());
      onClose();
    } else {
      setShowChangesInput(true);
    }
  }, [showChangesInput, changesText, script.id, requestChangesScript, onClose]);

  const handleSendComment = useCallback(() => {
    if (!newComment.trim()) return;
    addScriptComment(script.id, newComment.trim());
    setNewComment("");
  }, [newComment, script.id, addScriptComment]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/dashboard">Dashboard</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink className="cursor-pointer" onClick={onClose}>Documentos</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-[200px]">{script.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="font-display text-lg font-semibold text-foreground mt-1">{script.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground shrink-0"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className={`border text-xs ${status.class}`}>{status.label}</Badge>
            {client && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: client.colorAccent + "22", color: client.colorAccent }}>{client.nombre}</span>}
            <span className="text-xs text-muted-foreground">{new Date(script.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
            {script.visto && <Badge variant="outline" className="border-status-approved/30 text-status-approved text-xs">Visto ✓</Badge>}
          </div>

          {script.driveLink && script.driveLink !== "#" && (
            <a href={script.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4" /> Ver guión en Drive
            </a>
          )}

          {canApprove && (script.status === "nuevo" || script.status === "en_revision" || script.status === "cambios_solicitados") && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button onClick={handleApprove} className="bg-status-approved hover:bg-status-approved/80 text-foreground"><Check className="h-4 w-4 mr-2" /> Aprobar guión</Button>
                <Button onClick={handleRequestChanges} variant="outline" className="border-status-changes/50 text-status-changes hover:bg-status-changes/10"><AlertTriangle className="h-4 w-4 mr-2" /> Pedir cambios</Button>
              </div>
              {showChangesInput && (
                <div className="space-y-2">
                  <Textarea value={changesText} onChange={(e) => setChangesText(e.target.value)} placeholder="¿Qué debe modificarse?" className="bg-secondary border-border/50 rounded-xl resize-none" rows={3} />
                  <Button onClick={handleRequestChanges} disabled={!changesText.trim()} size="sm" className="gold-gradient text-primary-foreground">Confirmar cambios</Button>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Comentarios ({comments.length})</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>}
              {comments.map((c) => (
                <div key={c.id} className={`rounded-xl p-3 text-sm ${
                  c.isClient ? "ml-8 border-l-2" : "bg-secondary mr-8 border-l-2 border-l-primary/50"
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

          {script.statusHistory && script.statusHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Historial</h3>
              <div className="space-y-2">
                {script.statusHistory.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-muted-foreground">{s.date}</span>
                    <span className="text-foreground">{s.status}</span>
                    <span className="text-muted-foreground">— {s.by}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddDocumentModal({ onClose }: { onClose: () => void }) {
  const { setDocuments, allDocuments, setScripts, allScripts, clients: appClients } = useAppState();
  const [category, setCategory] = useState<"documento" | "guion">("documento");
  const [name, setName] = useState("");
  const [type, setType] = useState<Document["type"]>("pdf");
  const [driveLink, setDriveLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clienteId, setClienteId] = useState(appClients[0]?.id || "");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10MB"); return; }
    setFile(f);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setUploading(true);

    let fileUrl: string | undefined;

    // Upload file to storage if provided
    if (file) {
      try {
        const ext = file.name.split(".").pop() || "file";
        const path = `${clienteId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from("documents").upload(path, file);
        if (error) {
          toast.error("Error al subir archivo: " + error.message);
          setUploading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
        fileUrl = urlData.publicUrl;
      } catch (err: any) {
        toast.error("Error al subir archivo: " + (err.message || "desconocido"));
        setUploading(false);
        return;
      }
    }

    if (category === "guion") {
      const isDuplicate = allScripts.some((s) => s.title === name.trim() && s.clienteId === clienteId);
      if (isDuplicate) {
        toast.error("Ya existe un guión con este nombre para este cliente.");
        setUploading(false);
        return;
      }
      const newScript: Script = {
        id: `s_${Date.now()}`,
        clienteId,
        title: name.trim(),
        date: new Date().toISOString().split("T")[0],
        status: "nuevo",
        driveLink: fileUrl || driveLink || "#",
        isNew: true,
        visto: false,
        comments: [],
        statusHistory: [{ status: "Creado", date: new Date().toISOString().split("T")[0], by: "Sistema" }],
      };
      setScripts((prev) => [newScript, ...prev]);
      toast.success("Guión agregado correctamente");
    } else {
      const isDuplicate = allDocuments.some((d) => {
        if (driveLink && driveLink !== "#" && d.driveLink === driveLink && d.clienteId === clienteId) return true;
        return d.name === name.trim() && d.clienteId === clienteId;
      });
      if (isDuplicate) {
        toast.error("Ya existe un documento con este nombre para este cliente.");
        setUploading(false);
        return;
      }
      const newDoc: Document = {
        id: `d_${Date.now()}`,
        clienteId,
        name: name.trim(),
        type,
        date: new Date().toISOString().split("T")[0],
        driveLink: driveLink || "#",
        fileUrl,
        isNew: true,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      toast.success("Documento agregado correctamente");
    }
    setUploading(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Agregar</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Category selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">¿Qué deseas agregar?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCategory("guion")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  category === "guion"
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                }`}
              >
                📝 Guión
              </button>
              <button
                onClick={() => setCategory("documento")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  category === "documento"
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                }`}
              >
                📄 Documento
              </button>
            </div>
          </div>

          <div><label className="text-xs text-muted-foreground mb-1.5 block">{category === "guion" ? "Título del guión" : "Nombre del documento"}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder={category === "guion" ? "Ej: Guión episodio 5" : "Ej: Brief de marca"} /></div>

          {category === "documento" && (
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
              <Select value={type} onValueChange={(v) => setType(v as Document["type"])}>
                <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="glass gold-border">
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Documento</SelectItem>
                  <SelectItem value="sheet">Hoja de cálculo</SelectItem>
                  <SelectItem value="slide">Presentación</SelectItem>
                </SelectContent>
              </Select></div>
          )}

          <div><label className="text-xs text-muted-foreground mb-1.5 block">Link de Google Drive (opcional)</label>
            <Input value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="https://drive.google.com/..." /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Subir archivo (opcional, máx 10MB)</label>
            <div className="relative">
              <input type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="flex items-center gap-2 p-3 bg-secondary border border-border/50 rounded-xl text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {file ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-foreground truncate">{file.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ) : <span>Seleccionar archivo</span>}
              </div>
            </div></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Cliente asignado</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {appClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <Button onClick={handleSave} disabled={!name.trim() || uploading} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">
            {uploading ? "Subiendo..." : category === "guion" ? "Guardar guión" : "Guardar documento"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DocumentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "script" | "document"; id: string; name: string } | null>(null);
  const { documents, scripts, markScriptViewed, clients: appClients, scriptComments, setScripts, setDocuments } = useAppState();
  const { canUpload, isClient } = usePermissions();

  // Script filters
  const [scriptStatusFilter, setScriptStatusFilter] = useState<string>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [scriptPage, setScriptPage] = useState(1);
  const [docPage, setDocPage] = useState(1);
  const PER_PAGE = 15;

  const filteredScripts = useMemo(() => {
    if (scriptStatusFilter === "all") return scripts;
    return scripts.filter((s) => s.status === scriptStatusFilter);
  }, [scripts, scriptStatusFilter]);

  const filteredDocuments = useMemo(() => {
    if (docTypeFilter === "all") return documents;
    return documents.filter((d) => d.type === docTypeFilter);
  }, [documents, docTypeFilter]);

  const scriptTotalPages = Math.max(1, Math.ceil(filteredScripts.length / PER_PAGE));
  const paginatedScripts = filteredScripts.slice((scriptPage - 1) * PER_PAGE, scriptPage * PER_PAGE);
  const docTotalPages = Math.max(1, Math.ceil(filteredDocuments.length / PER_PAGE));
  const paginatedDocs = filteredDocuments.slice((docPage - 1) * PER_PAGE, docPage * PER_PAGE);

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "script") {
      setScripts((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const handleOpenScript = (script: Script) => {
    if (!script.visto && script.driveLink && script.driveLink !== "#") {
      markScriptViewed(script.id);
    }
    setSelectedScript(script);
  };

  const handleViewDrive = (e: React.MouseEvent, script: Script) => {
    e.stopPropagation();
    if (!script.driveLink || script.driveLink === "#") return;
    if (!script.visto) {
      markScriptViewed(script.id);
    }
    window.open(script.driveLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Guiones y Documentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Tu expediente completo</p>
        </div>
        {canUpload && (
          <Button onClick={() => setShowAddModal(true)} className="gold-gradient text-primary-foreground rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        )}
      </motion.div>




      <Tabs defaultValue="scripts">
        <TabsList className="bg-secondary border border-border/50">
          <TabsTrigger value="scripts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Guiones</TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="mt-4 space-y-3">
          {/* Script status filter chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "Todos" },
              { key: "nuevo", label: "Nuevos" },
              { key: "en_revision", label: "En revisión" },
              { key: "aprobado", label: "Aprobados" },
              { key: "cambios_solicitados", label: "Cambios" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setScriptStatusFilter(f.key); setScriptPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  scriptStatusFilter === f.key
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="glass gold-border rounded-xl overflow-hidden">
            {paginatedScripts.length === 0 && (
              <EmptyState icon={FileText} title="Sin guiones aún" description="Los guiones aparecerán aquí cuando se agreguen al sistema." />
            )}
            {paginatedScripts.map((s, i) => {
              const status = scriptStatusConfig[s.status];
              const client = appClients.find((c) => c.id === s.clienteId);
              const commentCount = (scriptComments[s.id] || []).length;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors group">
                  <button onClick={() => handleOpenScript(s)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        {(s.isNew || isRecent(s.date)) && <Badge className="gold-gradient text-primary-foreground text-[10px] font-semibold border-0">Nuevo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    {s.visto ? (
                      <span className="text-status-approved shrink-0" title="Visto"><Eye className="h-4 w-4" /></span>
                    ) : (
                      <span className="text-muted-foreground/50 shrink-0" title="No visto"><EyeOff className="h-4 w-4" /></span>
                    )}
                    {commentCount > 0 && <span className="text-xs text-muted-foreground shrink-0">💬 {commentCount}</span>}
                    {client && <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: client.colorAccent + "22", color: client.colorAccent }}>{client.avatar}</span>}
                    <Badge variant="outline" className={`border text-xs shrink-0 ${status.class}`}>{status.label}</Badge>
                  </button>
                  <button
                    onClick={(e) => handleViewDrive(e, s)}
                    disabled={!s.driveLink || s.driveLink === "#"}
                    title={!s.driveLink || s.driveLink === "#" ? "Sin documento vinculado" : "Ver guión"}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: "script", id: s.id, name: s.title })}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Eliminar guión"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
          <ListPagination currentPage={scriptPage} totalPages={scriptTotalPages} onPageChange={setScriptPage} />
        </TabsContent>

        <TabsContent value="docs" className="mt-4 space-y-3">
          {/* Document type filter chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "Todos" },
              { key: "pdf", label: "PDF" },
              { key: "doc", label: "Documento" },
              { key: "sheet", label: "Hoja de cálculo" },
              { key: "slide", label: "Presentación" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setDocTypeFilter(f.key); setDocPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  docTypeFilter === f.key
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="glass gold-border rounded-xl overflow-hidden">
            {paginatedDocs.length === 0 && (
              <EmptyState icon={File} title="Sin documentos aún" description="Los documentos aparecerán aquí cuando se agreguen al sistema." />
            )}
            {paginatedDocs.map((d, i) => {
              const Icon = typeIcons[d.type] || File;
              const client = appClients.find((c) => c.id === d.clienteId);
              const hasFile = !!d.fileUrl;
              const hasDrive = d.driveLink && d.driveLink !== "#";
              const hasAnyLink = hasFile || hasDrive;
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors group">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      {(d.isNew || isRecent(d.date)) && <Badge className="gold-gradient text-primary-foreground text-[10px] font-semibold border-0">Nuevo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(d.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                      {!hasAnyLink && <span className="ml-2 text-status-changes">· Sin archivo adjunto</span>}
                    </p>
                  </div>
                  {client && <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: client.colorAccent + "22", color: client.colorAccent }}>{client.avatar}</span>}
                  <Badge variant="outline" className="border border-border text-xs text-muted-foreground shrink-0">{typeLabels[d.type]}</Badge>

                  {/* File uploaded to storage - prominent button */}
                  {hasFile && (
                    <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0">
                      <Download className="h-3.5 w-3.5" /> Ver archivo
                    </a>
                  )}

                  {/* Drive link */}
                  {hasDrive && (
                    <a href={d.driveLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0" title="Ver en Drive">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  {/* No file - show re-upload button */}
                  {!hasAnyLink && (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-secondary/80 transition-colors cursor-pointer shrink-0">
                      <Upload className="h-3.5 w-3.5" /> Subir archivo
                      <input type="file" className="hidden" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
                        try {
                          const path = `${d.clienteId}/${Date.now()}_${file.name}`;
                          const { data, error } = await supabase.storage.from("documents").upload(path, file);
                          if (error) { toast.error("Error: " + error.message); return; }
                          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
                          setDocuments((prev) => prev.map((doc) => doc.id === d.id ? { ...doc, fileUrl: urlData.publicUrl } : doc));
                          toast.success("Archivo subido correctamente");
                        } catch (err: any) { toast.error("Error al subir: " + (err.message || "desconocido")); }
                      }} />
                    </label>
                  )}

                  <button
                    onClick={() => setDeleteTarget({ type: "document", id: d.id, name: d.name })}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Eliminar documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
          <ListPagination currentPage={docPage} totalPages={docTotalPages} onPageChange={setDocPage} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget?.type === "script" ? "Eliminar guión" : "Eliminar documento"}
        description={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />

      <AnimatePresence>
        {showAddModal && <AddDocumentModal onClose={() => setShowAddModal(false)} />}
        {selectedScript && (
          <ScriptDetailModal
            script={scripts.find((s) => s.id === selectedScript.id) || selectedScript}
            onClose={() => setSelectedScript(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
