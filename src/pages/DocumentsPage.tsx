import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, FileText, File, Table, Presentation, Plus, X, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { differenceInDays } from "date-fns";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Document, clients } from "@/data/mockData";

const isRecent = (dateStr: string) => differenceInDays(new Date(), new Date(dateStr)) < 3;

const statusConfig: Record<string, { label: string; class: string }> = {
  new: { label: "Nuevo", class: "bg-primary/20 text-primary border-primary/30" },
  reviewed: { label: "Revisado", class: "bg-status-changes/20 text-status-changes border-status-changes/30" },
  approved: { label: "Aprobado", class: "bg-status-approved/20 text-status-approved border-status-approved/30" },
};

const typeIcons: Record<string, typeof FileText> = { pdf: File, doc: FileText, sheet: Table, slide: Presentation };
const typeLabels: Record<string, string> = { pdf: "PDF", doc: "Documento", sheet: "Hoja de cálculo", slide: "Presentación" };

function AddDocumentModal({ onClose }: { onClose: () => void }) {
  const { setDocuments } = useAppState();
  const [name, setName] = useState("");
  const [type, setType] = useState<Document["type"]>("pdf");
  const [driveLink, setDriveLink] = useState("");
  const [fileName, setFileName] = useState("");
  const [clienteId, setClienteId] = useState(clients[0].id);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("El archivo no puede superar 10MB"); return; }
    setFileName(file.name);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const newDoc: Document = {
      id: `d_${Date.now()}`,
      clienteId,
      name: name.trim(),
      type,
      date: new Date().toISOString().split("T")[0],
      driveLink: driveLink || "#",
      isNew: true,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Agregar Documento</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Nombre del documento</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="Ej: Brief de marca" /></div>
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
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Link de Google Drive (opcional)</label>
            <Input value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="https://drive.google.com/..." /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Subir archivo (opcional, máx 10MB)</label>
            <div className="relative">
              <input type="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="flex items-center gap-2 p-3 bg-secondary border border-border/50 rounded-xl text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {fileName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-foreground truncate">{fileName}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFileName(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ) : <span>Seleccionar archivo</span>}
              </div>
            </div></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Cliente asignado</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <Button onClick={handleSave} disabled={!name.trim()} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">Guardar documento</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DocumentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { documents, scripts } = useAppState();
  const { canUpload, isClient } = usePermissions();
  const [filterClienteId, setFilterClienteId] = useState<string>("all");

  const filteredDocuments = filterClienteId === "all" ? documents : documents.filter((d) => d.clienteId === filterClienteId);
  const filteredScripts = filterClienteId === "all" ? scripts : scripts.filter((s) => s.clienteId === filterClienteId);

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

      {!isClient && (
        <div className="flex items-center gap-2">
          <Select value={filterClienteId} onValueChange={setFilterClienteId}>
            <SelectTrigger className="w-56 bg-secondary border-border/50 rounded-xl">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent className="glass gold-border">
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.colorAccent }} />
                    {c.nombre}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs defaultValue="scripts">

      <Tabs defaultValue="scripts">
        <TabsList className="bg-secondary border border-border/50">
          <TabsTrigger value="scripts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Guiones</TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="mt-4">
          <div className="glass gold-border rounded-xl overflow-hidden">
            {scripts.map((s, i) => {
              const status = statusConfig[s.status];
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                      {(s.isNew || isRecent(s.date)) && <Badge className="gold-gradient text-primary-foreground text-[10px] font-semibold border-0">Nuevo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <Badge variant="outline" className={`border text-xs shrink-0 ${status.class}`}>{status.label}</Badge>
                  <a href={s.driveLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <div className="glass gold-border rounded-xl overflow-hidden">
            {documents.map((d, i) => {
              const Icon = typeIcons[d.type] || File;
              const client = clients.find((c) => c.id === d.clienteId);
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      {(d.isNew || isRecent(d.date)) && <Badge className="gold-gradient text-primary-foreground text-[10px] font-semibold border-0">Nuevo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(d.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  {client && <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: client.colorAccent + "22", color: client.colorAccent }}>{client.avatar}</span>}
                  <Badge variant="outline" className="border border-border text-xs text-muted-foreground shrink-0">{typeLabels[d.type]}</Badge>
                  <a href={d.driveLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <AnimatePresence>{showAddModal && <AddDocumentModal onClose={() => setShowAddModal(false)} />}</AnimatePresence>
    </div>
  );
}
