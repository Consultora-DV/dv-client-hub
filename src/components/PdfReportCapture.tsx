import { useState, useRef, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { toast as sonnerToast } from "sonner";
import { FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthlySnapshot } from "@/services/metricsParser";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;

const PLATFORMS_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
];

const PERIOD_OPTIONS = (() => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 12; i >= -1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    options.push({ value: `${y}-${m}`, label: `${months[d.getMonth()]} ${y}` });
  }
  return options.reverse();
})();

interface PdfReportCaptureProps {
  clienteId: string | null;
}

export default function PdfReportCapture({ clienteId }: PdfReportCaptureProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [platform, setPlatform] = useState("instagram");
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0]?.value || "");
  const [followers, setFollowers] = useState("");
  const [growthPct, setGrowthPct] = useState("");
  const [totalInteractions, setTotalInteractions] = useState("");
  const [reach, setReach] = useState("");
  const [postsPublished, setPostsPublished] = useState("");
  const [impressions, setImpressions] = useState("");
  const [profileVisits, setProfileVisits] = useState("");
  const [notes, setNotes] = useState("");

  // Snapshots storage
  const storageKey = clienteId ? `dv_snapshots_${clienteId}` : "dv_snapshots_none";
  const [snapshots, setSnapshots] = useLocalStorage<MonthlySnapshot[]>(storageKey, []);

  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, num: number, s: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    try {
      const page = await doc.getPage(num);
      const viewport = page.getViewport({ scale: s });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error("Error rendering PDF page:", err);
    }
  }, []);

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, pageNum, scale);
  }, [pdfDoc, pageNum, scale, renderPage]);

  const handleFileUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      sonnerToast.error("Solo se aceptan archivos PDF");
      return;
    }
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setPageNum(1);
      setFileName(file.name);
    } catch (err: any) {
      console.error("PDF load error:", err);
      // If text extraction fails, it's likely a scanned PDF — still render it
      sonnerToast.error("No se pudo cargar el PDF. Intenta con otro archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!clienteId) {
      sonnerToast.error("Selecciona un cliente primero");
      return;
    }
    if (!period) {
      sonnerToast.error("Selecciona el período");
      return;
    }

    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || period;

    // Check for duplicate snapshot (same client + platform + period)
    const exists = snapshots.some(
      (s) => s.platform === platform && s.month === period
    );
    if (exists) {
      sonnerToast.error(`Ya existe un snapshot de ${PLATFORMS_OPTIONS.find(p => p.value === platform)?.label} para ${periodLabel}. Elimínalo primero si quieres reemplazarlo.`);
      return;
    }

    const snapshot: MonthlySnapshot = {
      id: `snap_${Date.now()}`,
      clienteId,
      platform,
      period: periodLabel,
      month: period,
      followers: Number(followers) || 0,
      growthPct: Number(growthPct) || 0,
      totalInteractions: Number(totalInteractions) || 0,
      reach: Number(reach) || 0,
      postsPublished: Number(postsPublished) || 0,
      impressions: Number(impressions) || 0,
      profileVisits: Number(profileVisits) || 0,
      notes: notes || undefined,
      capturedAt: new Date().toISOString(),
      sourceFile: fileName || undefined,
    };

    setSnapshots((prev) => [...prev, snapshot]);
    sonnerToast.success(`Snapshot de ${periodLabel} guardado`);

    // Reset form
    setFollowers("");
    setGrowthPct("");
    setTotalInteractions("");
    setReach("");
    setPostsPublished("");
    setImpressions("");
    setProfileVisits("");
    setNotes("");
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    sonnerToast.success("Snapshot eliminado");
  };

  return (
    <div className="space-y-6">
      {/* Upload PDF zone */}
      {!pdfDoc && (
        <label className="glass gold-border rounded-xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors">
          {loading ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : (
            <FileText className="h-10 w-10 text-primary" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Sube un reporte PDF de Metricool</p>
            <p className="text-xs text-muted-foreground mt-1">
              El PDF se renderiza en el navegador. Los datos se capturan manualmente en el formulario.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="hidden"
          />
        </label>
      )}

      {/* PDF Viewer + Form side by side */}
      {pdfDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: PDF Viewer */}
          <div className="glass gold-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</p>
              <Button variant="ghost" size="sm" onClick={() => { setPdfDoc(null); setFileName(""); }}>
                Cambiar PDF
              </Button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                {pageNum} / {totalPages}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.min(3, s + 0.2))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Canvas */}
            <div className="overflow-auto max-h-[600px] rounded-lg bg-secondary/20">
              <canvas ref={canvasRef} className="mx-auto" />
            </div>
          </div>

          {/* Right: Data capture form */}
          <div className="glass gold-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" />
              Capturar datos de este reporte
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Seguidores totales</Label>
                <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Crecimiento %</Label>
                <Input type="number" step="0.01" value={growthPct} onChange={(e) => setGrowthPct(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Interacciones totales</Label>
                <Input type="number" value={totalInteractions} onChange={(e) => setTotalInteractions(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alcance</Label>
                <Input type="number" value={reach} onChange={(e) => setReach(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Posts publicados</Label>
                <Input type="number" value={postsPublished} onChange={(e) => setPostsPublished(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Impresiones</Label>
                <Input type="number" value={impressions} onChange={(e) => setImpressions(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Visitas al perfil</Label>
              <Input type="number" value={profileVisits} onChange={(e) => setProfileVisits(e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del reporte..." rows={2} />
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" /> Guardar Snapshot
            </Button>
          </div>
        </div>
      )}

      {/* Saved snapshots table */}
      {snapshots.length > 0 && (
        <div className="glass gold-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Snapshots guardados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Plataforma</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Período</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Seguidores</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Crec. %</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Interacciones</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Alcance</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Posts</th>
                  <th className="text-center py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {[...snapshots].sort((a, b) => a.month.localeCompare(b.month)).map((s) => (
                  <tr key={s.id} className="border-b border-border/10 hover:bg-secondary/20">
                    <td className="py-2 px-2 capitalize">{s.platform}</td>
                    <td className="py-2 px-2">{s.period}</td>
                    <td className="py-2 px-2 text-right">{s.followers.toLocaleString("es-MX")}</td>
                    <td className="py-2 px-2 text-right">{s.growthPct.toFixed(2)}%</td>
                    <td className="py-2 px-2 text-right">{s.totalInteractions.toLocaleString("es-MX")}</td>
                    <td className="py-2 px-2 text-right">{s.reach.toLocaleString("es-MX")}</td>
                    <td className="py-2 px-2 text-right">{s.postsPublished}</td>
                    <td className="py-2 px-2 text-center">
                      <button onClick={() => handleDeleteSnapshot(s.id)} className="text-muted-foreground hover:text-destructive">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
