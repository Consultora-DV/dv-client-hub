import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign, Target, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppState } from "@/contexts/AppStateContext";
import { loadPlatformToken } from "@/services/metaIgService";
import {
  fetchAccountInsights, fetchCampaigns,
  AccountInsights, CampaignData, DatePreset, DATE_PRESETS,
} from "@/services/metaAdsService";

// ── Helpers ──────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}
function mxn(n: number) { return `$${fmt(n, 0)} MXN`; }
function pct(n: number) { return `${n.toFixed(2)}%`; }
function roasFmt(n: number) { return `${n.toFixed(2)}x`; }

function statusColor(status: string) {
  if (status === "ACTIVE") return "bg-status-approved/20 text-status-approved border-status-approved/30";
  if (status === "PAUSED") return "bg-status-pending/20 text-status-pending border-status-pending/30";
  return "bg-secondary text-muted-foreground border-border/30";
}

function roasStatus(roas: number) {
  if (roas >= 2.5) return { icon: <TrendingUp className="h-3.5 w-3.5" />, cls: "text-status-approved" };
  if (roas >= 1.0) return { icon: <TrendingUp className="h-3.5 w-3.5" />, cls: "text-status-pending" };
  return { icon: <TrendingDown className="h-3.5 w-3.5" />, cls: "text-destructive" };
}

// ── KPI Card ─────────────────────────────────────────────────

function KPICard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: "red" | "yellow" | "green" }) {
  const borderCls = alert === "red" ? "border-destructive/40" : alert === "yellow" ? "border-status-pending/40" : alert === "green" ? "border-status-approved/40" : "gold-border";
  const valCls = alert === "red" ? "text-destructive" : alert === "yellow" ? "text-status-pending" : alert === "green" ? "text-status-approved" : "text-primary";
  return (
    <div className={`glass rounded-xl p-4 border ${borderCls}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valCls}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Funnel ───────────────────────────────────────────────────

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pctW = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{fmt(value)}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pctW}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Campaigns Tab ─────────────────────────────────────────────

function CampaignsTab({ adAccountId, token, datePreset }: { adAccountId: string; token: string; datePreset: DatePreset }) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchCampaigns(adAccountId, token, datePreset);
      setCampaigns(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [adAccountId, token, datePreset]);

  useEffect(() => { load(); }, [load]);

  const visible = campaigns.filter((c) => showPaused || c.status === "ACTIVE");
  const active = campaigns.filter((c) => c.status === "ACTIVE");
  const paused = campaigns.filter((c) => c.status !== "ACTIVE");

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground gap-3"><RefreshCw className="h-5 w-5 animate-spin" /> Cargando campañas…</div>;
  if (error) return <div className="glass gold-border rounded-xl p-6 text-destructive text-sm">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-status-approved/20 text-status-approved border-status-approved/30">{active.length} activas</Badge>
          {paused.length > 0 && <Badge variant="outline" className="text-muted-foreground">{paused.length} pausadas</Badge>}
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPaused((v) => !v)}>
          {showPaused ? "Ocultar pausadas" : "Ver pausadas"}
          {showPaused ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      </div>

      <div className="glass gold-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">ATC</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPM</TableHead>
                <TableHead className="text-right">Presupuesto/día</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => {
                const rs = roasStatus(c.roas);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[220px]">
                      <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.objective}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] border ${statusColor(c.status)}`}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right text-xs font-medium">{mxn(c.spend)}</TableCell>
                    <TableCell className="text-right text-xs">{mxn(c.revenue)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-bold flex items-center justify-end gap-1 ${rs.cls}`}>{rs.icon}{roasFmt(c.roas)}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{c.purchases > 0 ? c.purchases : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{c.addToCart > 0 ? c.addToCart : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{pct(c.ctr)}</TableCell>
                    <TableCell className="text-right text-xs">{mxn(c.cpm)}</TableCell>
                    <TableCell className="text-right text-xs">{c.dailyBudget ? mxn(c.dailyBudget) : "CBO"}</TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Sin campañas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────

function OverviewTab({ adAccountId, token, datePreset }: { adAccountId: string; token: string; datePreset: DatePreset }) {
  const [ins, setIns] = useState<AccountInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setIns(await fetchAccountInsights(adAccountId, token, datePreset)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [adAccountId, token, datePreset]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground gap-3"><RefreshCw className="h-5 w-5 animate-spin" /> Cargando datos…</div>;
  if (error) return <div className="glass gold-border rounded-xl p-6 text-destructive text-sm">Error al conectar con Meta Ads: {error}</div>;
  if (!ins) return null;

  const roasAlert = ins.roas >= 2.5 ? "green" : ins.roas >= 1 ? "yellow" : "red";
  const cpaAlert = ins.cpa < 700 ? "green" : ins.cpa < 1500 ? "yellow" : "red";
  const maxFunnel = Math.max(ins.clicks, ins.viewContent, ins.addToCart, ins.initiateCheckout, ins.purchases);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="ROAS" value={roasFmt(ins.roas)} sub={`Meta: 2.5x | Bench: ≥2.5x`} alert={roasAlert} />
        <KPICard label="Gasto total" value={mxn(ins.spend)} sub={`${ins.dateStart} → ${ins.dateStop}`} />
        <KPICard label="Revenue atribuido" value={mxn(ins.revenue)} sub={`${ins.purchases} compras`} />
        <KPICard label="CPA" value={mxn(ins.cpa)} sub="Costo por compra" alert={cpaAlert} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="CTR" value={pct(ins.ctr)} sub="Benchmark: 1–2%" alert={ins.ctr >= 1 ? "green" : "yellow"} />
        <KPICard label="CPM" value={mxn(ins.cpm)} sub="Benchmark: $40–80 MXN" alert={ins.cpm <= 80 ? "green" : "yellow"} />
        <KPICard label="CPC" value={mxn(ins.cpc)} sub="Costo por clic" alert={ins.cpc <= 5 ? "green" : "yellow"} />
        <KPICard label="Frecuencia" value={ins.frequency.toFixed(2)} sub="Benchmark: <3.0" alert={ins.frequency < 3 ? "green" : "red"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="glass gold-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Funnel de conversión</h3>
          <div className="space-y-3">
            <FunnelBar label="Clics al sitio" value={ins.clicks} max={maxFunnel} color="hsl(42,52%,54%)" />
            <FunnelBar label="View Content" value={ins.viewContent} max={maxFunnel} color="hsl(210,80%,55%)" />
            <FunnelBar label="Add to Cart" value={ins.addToCart} max={maxFunnel} color="hsl(160,60%,45%)" />
            <FunnelBar label="Initiate Checkout" value={ins.initiateCheckout} max={maxFunnel} color="hsl(280,60%,55%)" />
            <FunnelBar label="Compras" value={ins.purchases} max={maxFunnel} color="hsl(130,60%,45%)" />
          </div>
          {ins.addToCart > 0 && ins.initiateCheckout > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              Abandono en checkout: <span className="text-destructive font-semibold">
                {(100 - (ins.purchases / ins.initiateCheckout) * 100).toFixed(0)}%
              </span>
              {" · "}Conversión total: <span className="text-status-approved font-semibold">
                {ins.clicks > 0 ? ((ins.purchases / ins.clicks) * 100).toFixed(2) : "0.00"}%
              </span>
            </p>
          )}
        </div>
        {/* Reach */}
        <div className="glass gold-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Alcance y engagement</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Alcance único</span><span className="font-semibold">{fmt(ins.reach)} personas</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Impresiones</span><span className="font-semibold">{fmt(ins.impressions)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Clics totales</span><span className="font-semibold">{fmt(ins.clicks)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">CTR</span><span className={`font-semibold ${ins.ctr >= 1 ? "text-status-approved" : "text-status-pending"}`}>{pct(ins.ctr)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frecuencia</span><span className={`font-semibold ${ins.frequency < 3 ? "text-status-approved" : "text-destructive"}`}>{ins.frequency.toFixed(2)}x</span></div>
          </div>
          <div className={`mt-2 p-3 rounded-lg text-xs ${ins.roas < 1 ? "bg-destructive/10 text-destructive border border-destructive/20" : ins.roas < 2.5 ? "bg-status-pending/10 text-status-pending border border-status-pending/20" : "bg-status-approved/10 text-status-approved border border-status-approved/20"}`}>
            {ins.roas < 1 ? "🔴 ROAS crítico — cuenta perdiendo dinero. Ver análisis para plan de rescate." : ins.roas < 2.5 ? "🟡 ROAS por debajo del benchmark (2.5x). Optimizaciones en curso." : "🟢 ROAS saludable. Mantener y escalar gradualmente."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analysis Tab (Master Brief) ───────────────────────────────

function AnalysisTab() {
  const briefs = [
    {
      icon: "🔴", title: "CRÍTICO 1 — Funnel roto: Landing page", priority: "Crítico",
      body: "Todos los anuncios dirigen a /collections/sueros-faciales (página de colección), NO a producto específico. Agrega 2–3 pasos extra antes del checkout. Explica el drop del 63% entre click y ViewContent.",
      action: "Crear landing pages por producto/kit y redirigir ads a /products/[slug].",
    },
    {
      icon: "🔴", title: "CRÍTICO 2 — Checkout: 86% de abandono", priority: "Crítico",
      body: "28 inicios de checkout → 4 compras. Causas: costos de envío revelados tarde (gratis a partir de $899, mayoría de productos en $319-$699), checkout multi-paso, falta de garantía visible.",
      action: "Activar Shopify One-Page Checkout. Garantía de 30 días visible. SPEI/Aplazo verificado en mobile.",
    },
    {
      icon: "🔴", title: "CRÍTICO 3 — Señal insuficiente para el algoritmo", priority: "Crítico",
      body: "4 compras/mes vs 50/semana que necesita Meta para optimizar. La cuenta lleva 4 años en sub-aprendizaje crónico.",
      action: "Cambiar optimización a Add to Cart (51/mes → ~12/semana) hasta acumular volumen.",
    },
    {
      icon: "🔴", title: "CRÍTICO 4 — Audience Network: Click Fraud", priority: "Crítico",
      body: "$661 MXN/mes en bots. CTR de 30–51% en Audience Network sin una sola compra.",
      action: "Excluir Audience Network en todos los ad sets. Acción de 5 minutos.",
    },
    {
      icon: "🔴", title: "CRÍTICO 5 — Presupuestos inviables", priority: "Crítico",
      body: "CPA actual $2,216 MXN. Presupuesto mínimo teórico: $11,080 MXN/día (5× CPA). Real: $167/día (1.5% del mínimo viable).",
      action: "Con ATC, CPA objetivo baja a $200-400 MXN → viable con $1,000-2,000 MXN/día.",
    },
    {
      icon: "🟡", title: "ALTO 7 — Solapamiento masivo de audiencias", priority: "Alto",
      body: "9 ad sets en 'Ventas - Productos estrella' compitiendo por las mismas personas. LAL 3% aparece en 4 ad sets distintos. CPMs inflados internamente.",
      action: "Consolidar de 9 ad sets a 3. Eliminar duplicados.",
    },
    {
      icon: "🟡", title: "ALTO 8 — Sin UGC ni creativos frescos", priority: "Alto",
      body: "Creativos activos 40-50 días. El motor Andromeda de Meta suprime creativos después de 2-4 semanas. Solo 1 creativo UGC activo.",
      action: "Pipeline de UGC: mínimo 5 conceptos por ad set. Rotación cada 2 semanas.",
    },
    {
      icon: "🟡", title: "ALTO 9 — Naming convention inexistente", priority: "Alto",
      body: "37 campañas desde 2021 sin convención de nombres. 'Ventas/Marzo 2026' activa en mayo. Imposible análisis histórico.",
      action: "Implementar: [TSC]_[TIPO]_[OBJETIVO]_[AUDIENCIA]_[MES-AÑO]",
    },
  ];

  const quickWins = [
    { id: "QW1", action: "Excluir Audience Network en todos los ad sets", impact: "+$661 MXN/mes recuperados", time: "30 min" },
    { id: "QW2", action: "Pausar 'Agregar a carrito | Marzo 2026'", impact: "Detener sangrado de $1,738 MXN", time: "5 min" },
    { id: "QW3", action: "Eliminar píxeles inactivos y sospechoso", impact: "Seguridad + datos limpios", time: "15 min" },
    { id: "QW4", action: "Cambiar optimización de Purchase → ATC", impact: "Activar aprendizaje del algoritmo", time: "20 min" },
    { id: "QW5", action: "Consolidar ad sets con overlap (de 9 a 3)", impact: "-30% CPM interno estimado", time: "1 hora" },
    { id: "QW6", action: "Agregar exclusión de compradores en prospección", impact: "Eliminar gasto en clientes existentes", time: "15 min" },
    { id: "QW7", action: "Activar Shopify One-Page Checkout", impact: "Reducir abandono en checkout", time: "Con equipo técnico" },
  ];

  const projection = [
    { period: "Hoy (mayo)", roas: "0.49x", cpa: "$2,216", purchases: "4", spend: "$295/día", revenue: "$4,349" },
    { period: "30 días", roas: "1.2–1.5x", cpa: "$900–1,200", purchases: "15–25", spend: "$500/día", revenue: "$18K–30K" },
    { period: "60 días", roas: "1.8–2.2x", cpa: "$600–900", purchases: "35–60", spend: "$800–1,000/día", revenue: "$63K–108K" },
    { period: "90 días", roas: "2.5–3.5x", cpa: "$400–700", purchases: "80–150", spend: "$1,500–3,000/día", revenue: "$160K–420K" },
  ];

  return (
    <div className="space-y-8">
      {/* Health Score */}
      <div className="glass gold-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">META ADS HEALTH SCORE</h3>
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">Generado: Mayo 2026</Badge>
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="text-5xl font-black text-destructive">31</div>
          <div><p className="text-lg font-bold text-destructive">Grado F</p><p className="text-xs text-muted-foreground">Rescate total requerido</p></div>
        </div>
        <div className="space-y-3">
          {[
            { label: "Pixel / CAPI Health", score: 45, max: 100, weight: "30%", color: "#f59e0b" },
            { label: "Creative", score: 22, max: 100, weight: "30%", color: "#ef4444" },
            { label: "Account Structure", score: 18, max: 100, weight: "20%", color: "#ef4444" },
            { label: "Audience & Targeting", score: 42, max: 100, weight: "20%", color: "#f59e0b" },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label} <span className="text-muted-foreground/50">(peso {item.weight})</span></span>
                <span className="font-semibold" style={{ color: item.color }}>{item.score}/100</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Wins */}
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Quick Wins — Esta semana
        </h3>
        <div className="space-y-2">
          {quickWins.map((qw) => (
            <div key={qw.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border/30">
              <span className="text-xs font-mono text-primary mt-0.5 shrink-0">{qw.id}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{qw.action}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{qw.impact}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{qw.time}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Problems */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Problemas identificados
        </h3>
        <div className="space-y-3">
          {briefs.map((b, i) => (
            <div key={i} className={`glass rounded-xl p-4 border ${b.priority === "Crítico" ? "border-destructive/30" : "border-status-pending/30"}`}>
              <div className="flex items-start gap-3">
                <span className="text-base shrink-0">{b.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground">{b.title}</p>
                    <Badge variant="outline" className={`text-[10px] border ${b.priority === "Crítico" ? "border-destructive/40 text-destructive" : "border-status-pending/40 text-status-pending"}`}>{b.priority}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{b.body}</p>
                  <div className="mt-2 flex items-start gap-1.5">
                    <CheckCircle className="h-3 w-3 text-status-approved shrink-0 mt-0.5" />
                    <p className="text-[11px] text-status-approved">{b.action}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projection */}
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Proyección a 90 días
        </h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead>CPA</TableHead>
                <TableHead>Compras/mes</TableHead>
                <TableHead>Gasto/día</TableHead>
                <TableHead>Revenue/mes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.map((p, i) => (
                <TableRow key={i} className={i === 0 ? "bg-destructive/5" : ""}>
                  <TableCell className="text-xs font-medium">{p.period}</TableCell>
                  <TableCell className={`text-xs font-bold ${i === 0 ? "text-destructive" : i === projection.length - 1 ? "text-status-approved" : "text-status-pending"}`}>{p.roas}</TableCell>
                  <TableCell className="text-xs">{p.cpa}</TableCell>
                  <TableCell className="text-xs">{p.purchases}</TableCell>
                  <TableCell className="text-xs">{p.spend}</TableCell>
                  <TableCell className="text-xs">{p.revenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">* Proyecciones condicionadas a: fix del checkout, producción de UGC, implementación de CAPI.</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function AdsPage() {
  const { selectedClienteId } = useAppState();
  const [token, setToken] = useState<string | null>(null);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [loadingToken, setLoadingToken] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!selectedClienteId) { setLoadingToken(false); return; }
    setLoadingToken(true);
    loadPlatformToken(selectedClienteId).then((cfg) => {
      if (cfg) {
        setToken(cfg.accessToken);
        setAdAccountId(cfg.adAccountId?.replace("act_", "") || null);
      }
    }).finally(() => setLoadingToken(false));
  }, [selectedClienteId]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Meta Ads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Campañas en tiempo real · Diagnóstico · Plan de rescate</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-auto min-w-[130px] bg-secondary border-border/50 rounded-xl text-xs h-8">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass gold-border">
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {loadingToken ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /> Conectando con Meta Ads…
        </div>
      ) : !token || !adAccountId ? (
        <div className="glass gold-border rounded-xl p-8 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium">Credenciales de Meta no configuradas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ve a <strong>Métricas → Instagram → ⚙️</strong> y asegúrate de configurar el <strong>Ad Account ID</strong>.
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50 border border-border/30 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5">
              <BarChart className="h-4 w-4" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm gap-1.5">
              <Target className="h-4 w-4" /> Campañas
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs sm:text-sm gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Diagnóstico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab adAccountId={adAccountId} token={token} datePreset={datePreset} />
          </TabsContent>
          <TabsContent value="campaigns">
            <CampaignsTab adAccountId={adAccountId} token={token} datePreset={datePreset} />
          </TabsContent>
          <TabsContent value="analysis">
            <AnalysisTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Missing icon import fix
function BarChart({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
