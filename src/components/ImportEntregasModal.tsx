import { useState, useMemo } from "react";
import { Upload, X, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/contexts/AppStateContext";
import { parseNotionCsv, importParsedRows } from "@/services/notionCsvImport";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function ImportEntregasModal({ onClose, onImported }: Props) {
  const { clients } = useAppState();
  const [clienteId, setClienteId] = useState<string>("");
  const [csv, setCsv]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parseResult = useMemo(() => {
    if (!csv.trim()) return null;
    try { return parseNotionCsv(csv); }
    catch (e: any) { return { rows: [], errors: [{ line: 0, message: e.message, raw: "" }] }; }
  }, [csv]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!clienteId)  { toast.error("Selecciona un cliente"); return; }
    if (!parseResult || parseResult.rows.length === 0) {
      toast.error("No hay filas válidas para importar"); return;
    }
    setSubmitting(true);
    const result = await importParsedRows(clienteId, parseResult.rows);
    setSubmitting(false);
    if (result.ok) {
      toast.success(`${result.inserted} videos importados`);
      onImported();
      onClose();
    } else {
      toast.error(result.error || "Error al importar");
    }
  };

  const selectedClient = clients.find((c) => c.id === clienteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overlay-safe"
      onClick={onClose}>
      <div className="glass gold-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Importar entregas (CSV de Notion)</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente destino <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <button key={c.id} type="button" onClick={() => setClienteId(c.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    clienteId === c.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-foreground hover:border-primary/50"
                  }`}>
                  {c.nombre}
                </button>
              ))}
            </div>
            {selectedClient && (
              <p className="text-xs text-muted-foreground">
                Se importarán al perfil de <span className="text-foreground">{selectedClient.nombre}</span>
              </p>
            )}
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Subir archivo CSV</Label>
            <label htmlFor="file"
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border/40 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click para elegir archivo .csv</span>
              <input id="file" type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>

          {/* OR paste */}
          <div className="space-y-2">
            <Label htmlFor="csv">…o pega el CSV directamente</Label>
            <textarea id="csv" value={csv} onChange={(e) => setCsv(e.target.value)}
              rows={6}
              placeholder="ID,Editor,Nombre del Video,Tanda,Estado,Publicación,Prioridad,REFERENCIA | GUIONES,Fecha de Publicación,LINK,Miniatura,Moneda,Costo Total,Pagado,Texto&#10;T1-01,Mojca,Mi video,1ra Tanda,APROBADO,PUBLICADO,Media,...&#10;..."
              className="w-full px-3 py-2 bg-secondary/30 border border-border/40 rounded-lg text-xs font-mono resize-none focus:outline-none focus:border-primary/50" />
          </div>

          {/* Preview */}
          {parseResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-status-approved">
                  <CheckCircle2 className="h-4 w-4" /> {parseResult.rows.length} filas válidas
                </span>
                {parseResult.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" /> {parseResult.errors.length} con error
                  </span>
                )}
              </div>

              {parseResult.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 max-h-24 overflow-y-auto text-xs space-y-1">
                  {parseResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-destructive">
                      Línea {e.line}: {e.message}
                    </p>
                  ))}
                  {parseResult.errors.length > 5 && (
                    <p className="text-muted-foreground">… y {parseResult.errors.length - 5} más</p>
                  )}
                </div>
              )}

              {parseResult.rows.length > 0 && (
                <div className="bg-secondary/20 border border-border/30 rounded-lg p-3 max-h-32 overflow-y-auto text-xs space-y-1">
                  {parseResult.rows.slice(0, 5).map((r, i) => (
                    <p key={i} className="text-muted-foreground">
                      <span className="font-mono text-primary">R{r.rec_number}-{String(r.rec_order).padStart(2, "0")}</span>{" "}
                      <span className="text-foreground">{r.title}</span>{" "}
                      <span className="opacity-60">· {r.status} · {r.pagado ? "💰" : ""}</span>
                    </p>
                  ))}
                  {parseResult.rows.length > 5 && (
                    <p className="text-muted-foreground italic">… y {parseResult.rows.length - 5} más</p>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            <strong>Importante:</strong> el import se cancela si el cliente ya tiene videos con REC, para evitar duplicados.
            Columnas reconocidas (en cualquier orden): ID, Editor, Nombre del Video, Estado, Publicación, Prioridad, REFERENCIA | GUIONES, Fecha de Publicación, LINK, Miniatura, Moneda, Costo Total, Pagado, Texto.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border/30 bg-secondary/10">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport}
            disabled={submitting || !clienteId || !parseResult || parseResult.rows.length === 0}
            className="gold-gradient text-primary-foreground gap-1.5">
            <Upload className="h-4 w-4" />
            {submitting ? "Importando…" : `Importar ${parseResult?.rows.length || 0} entregas`}
          </Button>
        </div>
      </div>
    </div>
  );
}
