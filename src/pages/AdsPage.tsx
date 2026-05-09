import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, DollarSign, Target, Zap, ChevronDown, ChevronUp,
  BarChart2, Layers, Activity,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppState } from "@/contexts/AppStateContext";
import { loadPlatformToken } from "@/services/metaIgService";
import {
  fetchAccountInsights, fetchCampaigns, fetchAdSets, fetchDailyBreakdown,
  AccountInsights, CampaignData, AdSetData, DailyMetric, DatePreset, DATE_PRESETS,
} from "@/services/metaAdsService";

// ── Constants ─────────────────────────────────────────────────
const AUTO_REFRESH_MS = 30 * 60 * 1000; // 30 min

// ── Helpers ───────────────────────────────────────────────────
function fmt(n: number, decimals = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}
function mxn(n: number) { return `$${fmt(n, 0)}`; }
function pct(n: number) { return `${n.toFixed(2)}%`; }
function roasFmt(n: number) { return `${n.toFixed(2)}x`; }
function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  const months = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${parseInt(day)} ${months[parseInt(m)]}`;
}

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

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({
  label, value, sub, alert, icon,
}: {
  label: string; value: string; sub?: string;
  alert?: "red" | "yellow" | "green" | "neutral";
  icon?: React.ReactNode;
}) {
  const borderCls = alert === "red" ? "border-destructive/40"
    : alert === "yellow" ? "border-status-pending/40"
    : alert === "green" ? "border-status-approved/40"
    : "gold-border";
  const valCls = alert === "red" ? "text-destructive"
    : alert === "yellow" ? "text-status-pending"
    : alert === "green" ? "text-status-approved"
    : "text-primary";
  return (
    <div className={`glass rounded-xl p-4 border ${borderCls} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
      </div>
      <p className={`text-xl font-bold ${valCls}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Funnel Bar ────────────────────────────────────────────────
function FunnelBar({ label, value, max, color, rate }: {
  label: string; value: number; max: number; color: string; rate?: string;
}) {
  const pctW = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {rate && <span className="text-[10px] text-muted-foreground/60">{rate}</span>}
          <span className="font-semibold text-foreground">{fmt(value)}</span>
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctW}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── SVG Area Chart ────────────────────────────────────────────
function TrendChart({ data, metrics }: {
  data: DailyMetric[];
  metrics: { key: keyof DailyMetric; color: string; label: string }[];
}) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-24 text-muted-foreground/40 text-xs">Sin datos de tendencia</div>
  );

  const W = 600;
  const H = 90;
  const PAD = { top: 6, bottom: 20, left: 4, right: 4 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // normalize each metric independently
  const paths = metrics.map(({ key, color, label }) => {
    const vals = data.map(d => d[key] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => ({
      x: PAD.left + (i / Math.max(data.length - 1, 1)) * iW,
      y: PAD.top + iH - ((v - min) / range) * iH,
    }));
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + iH).toFixed(1)} L ${PAD.left} ${(PAD.top + iH).toFixed(1)} Z`;
    return { pathD, areaD, color, label, lastPt: pts[pts.length - 1], lastVal: vals[vals.length - 1] };
  });

  // x-axis labels: show ~5 evenly spaced dates
  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data
    .map((d, i) => ({ date: d.date, i }))
    .filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        {paths.map(({ color, label }) => (
          <linearGradient key={label} id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f}
          x1={PAD.left} x2={W - PAD.right}
          y1={PAD.top + iH * f} y2={PAD.top + iH * f}
          stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.5" />
      ))}

      {paths.map(({ pathD, areaD, color, label }) => (
        <g key={label}>
          <path d={areaD} fill={`url(#grad-${label})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      ))}

      {/* x-axis date labels */}
      {xLabels.map(({ date, i }) => (
        <text key={date}
          x={PAD.left + (i / Math.max(data.length - 1, 1)) * iW}
          y={H - 2}
          textAnchor="middle"
          fontSize="7"
          fill="hsl(var(--muted-foreground))"
          opacity="0.7"
        >
          {fmtDate(date)}
        </text>
      ))}
    </svg>
  );
}

// ── Conversion Rate Bar ───────────────────────────────────────
function ConvBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>{rate.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({
  adAccountId, token, datePreset, refreshKey,
}: { adAccountId: string; token: string; datePreset: DatePreset; refreshKey: number }) {
  const [ins, setIns] = useState<AccountInsights | null>(null);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [insData, dailyData] = await Promise.all([
        fetchAccountInsights(adAccountId, token, datePreset),
        fetchDailyBreakdown(adAccountId, token, datePreset),
      ]);
      setIns(insData);
      setDaily(dailyData);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [adAccountId, token, datePreset, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
      <RefreshCw className="h-5 w-5 animate-spin" /> Cargando datos…
    </div>
  );
  if (error) return (
    <div className="glass gold-border rounded-xl p-6 text-destructive text-sm">Error al conectar con Meta Ads: {error}</div>
  );
  if (!ins) return null;

  const roasAlert: "red" | "yellow" | "green" = ins.roas >= 2.5 ? "green" : ins.roas >= 1 ? "yellow" : "red";
  const cpaAlert: "red" | "yellow" | "green" = ins.cpa < 700 ? "green" : ins.cpa < 1500 ? "yellow" : "red";
  const maxFunnel = Math.max(ins.clicks, ins.viewContent, ins.addToCart, ins.initiateCheckout, ins.purchases);

  const atcRate = ins.clicks > 0 ? (ins.addToCart / ins.clicks) * 100 : 0;
  const checkoutRate = ins.addToCart > 0 ? (ins.initiateCheckout / ins.addToCart) * 100 : 0;
  const purchaseRate = ins.initiateCheckout > 0 ? (ins.purchases / ins.initiateCheckout) * 100 : 0;
  const overallCvr = ins.clicks > 0 ? (ins.purchases / ins.clicks) * 100 : 0;
  const checkoutAbandonment = ins.initiateCheckout > 0 ? (1 - ins.purchases / ins.initiateCheckout) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ROAS alert banner */}
      <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 border ${
        ins.roas < 1 ? "bg-destructive/10 text-destructive border-destructive/20"
        : ins.roas < 2.5 ? "bg-status-pending/10 text-status-pending border-status-pending/20"
        : "bg-status-approved/10 text-status-approved border-status-approved/20"
      }`}>
        {ins.roas < 1 ? "🔴 ROAS crítico — la cuenta está perdiendo dinero activamente."
          : ins.roas < 2.5 ? `🟡 ROAS ${roasFmt(ins.roas)} — por debajo del benchmark (2.5x). Optimizaciones en curso.`
          : `🟢 ROAS ${roasFmt(ins.roas)} — saludable. Mantener y escalar gradualmente.`}
        <span className="ml-auto text-xs opacity-60">{ins.dateStart} → {ins.dateStop}</span>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="ROAS" value={roasFmt(ins.roas)} sub="Meta: 2.5x" alert={roasAlert} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard label="Gasto total" value={mxn(ins.spend)} sub={`${ins.dateStart} → ${ins.dateStop}`} alert="neutral" icon={<DollarSign className="h-4 w-4" />} />
        <KPICard label="Revenue atribuido" value={mxn(ins.revenue)} sub={`${ins.purchases} compras`} alert="neutral" icon={<Activity className="h-4 w-4" />} />
        <KPICard label="CPA" value={mxn(ins.cpa)} sub="Costo por compra" alert={cpaAlert} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="CTR" value={pct(ins.ctr)} sub="Benchmark: 1–2%" alert={ins.ctr >= 1 ? "green" : "yellow"} />
        <KPICard label="CPM" value={mxn(ins.cpm)} sub="Benchmark: $40–80" alert={ins.cpm <= 80 ? "green" : "yellow"} />
        <KPICard label="CPC" value={mxn(ins.cpc)} sub="Costo por clic" alert={ins.cpc <= 5 ? "green" : "yellow"} />
        <KPICard label="Frecuencia" value={ins.frequency.toFixed(2)} sub="Benchmark: &lt;3.0" alert={ins.frequency < 3 ? "green" : "red"} />
      </div>

      {/* Trend Chart */}
      {daily.length > 1 && (
        <div className="glass gold-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Tendencia diaria
            </h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[hsl(42,52%,54%)] inline-block rounded" /> Gasto</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[hsl(160,60%,45%)] inline-block rounded" /> Revenue</span>
            </div>
          </div>
          <TrendChart
            data={daily}
            metrics={[
              { key: "spend", color: "hsl(42,52%,54%)", label: "spend" },
              { key: "revenue", color: "hsl(160,60%,45%)", label: "revenue" },
            ]}
          />
          {/* Daily summary row */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Gasto/día (promedio)</p>
              <p className="text-sm font-bold text-primary">{mxn(daily.reduce((s, d) => s + d.spend, 0) / daily.length)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Revenue/día (promedio)</p>
              <p className="text-sm font-bold text-status-approved">{mxn(daily.reduce((s, d) => s + d.revenue, 0) / daily.length)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Mejor día ROAS</p>
              <p className="text-sm font-bold text-foreground">{roasFmt(Math.max(...daily.map(d => d.roas)))}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funnel */}
        <div className="glass gold-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" /> Funnel de conversión
          </h3>
          <div className="space-y-3">
            <FunnelBar label="Impresiones" value={ins.impressions} max={ins.impressions} color="hsl(220,20%,55%)" />
            <FunnelBar label="Clics al sitio" value={ins.clicks} max={ins.impressions} color="hsl(42,52%,54%)"
              rate={ins.impressions > 0 ? `CTR ${pct((ins.clicks / ins.impressions) * 100)}` : undefined} />
            <FunnelBar label="View Content" value={ins.viewContent} max={maxFunnel} color="hsl(210,80%,55%)"
              rate={ins.clicks > 0 ? `${((ins.viewContent / ins.clicks) * 100).toFixed(0)}% de clics` : undefined} />
            <FunnelBar label="Add to Cart" value={ins.addToCart} max={maxFunnel} color="hsl(280,60%,55%)"
              rate={ins.viewContent > 0 ? `${((ins.addToCart / ins.viewContent) * 100).toFixed(0)}% de VC` : undefined} />
            <FunnelBar label="Initiate Checkout" value={ins.initiateCheckout} max={maxFunnel} color="hsl(35,90%,55%)"
              rate={ins.addToCart > 0 ? `${((ins.initiateCheckout / ins.addToCart) * 100).toFixed(0)}% de ATC` : undefined} />
            <FunnelBar label="Compras" value={ins.purchases} max={maxFunnel} color="hsl(130,60%,45%)"
              rate={ins.initiateCheckout > 0 ? `${((ins.purchases / ins.initiateCheckout) * 100).toFixed(0)}% de checkout` : undefined} />
          </div>
        </div>

        {/* Conversion rates + reach */}
        <div className="space-y-5">
          <div className="glass gold-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tasas de conversión</h3>
            <div className="space-y-3">
              <ConvBar label="Clic → ATC" rate={atcRate} color="hsl(280,60%,55%)" />
              <ConvBar label="ATC → Checkout" rate={checkoutRate} color="hsl(35,90%,55%)" />
              <ConvBar label="Checkout → Compra" rate={purchaseRate} color="hsl(130,60%,45%)" />
              <ConvBar label="CVR global (clic → compra)" rate={overallCvr} color="hsl(42,52%,54%)" />
            </div>
            {ins.initiateCheckout > 0 && (
              <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Abandono en checkout</span>
                <span className={`font-bold ${checkoutAbandonment > 70 ? "text-destructive" : "text-status-pending"}`}>
                  {checkoutAbandonment.toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          <div className="glass gold-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Alcance y volumen</h3>
            {[
              ["Alcance único", `${fmt(ins.reach)} personas`],
              ["Impresiones totales", fmt(ins.impressions)],
              ["Clics totales", fmt(ins.clicks)],
              ["Compras totales", ins.purchases.toString()],
              ["ATC totales", ins.addToCart.toString()],
              ["Frecuencia", `${ins.frequency.toFixed(2)}x`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROAS trend if daily available */}
      {daily.length > 1 && (
        <div className="glass gold-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Tendencia ROAS diario
          </h3>
          <TrendChart
            data={daily}
            metrics={[{ key: "roas", color: ins.roas >= 2.5 ? "hsl(130,60%,45%)" : ins.roas >= 1 ? "hsl(35,90%,55%)" : "hsl(0,72%,51%)", label: "roas" }]}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>ROAS mín: <strong className="text-foreground">{roasFmt(Math.min(...daily.map(d => d.roas)))}</strong></span>
            <span>ROAS promedio: <strong className="text-foreground">{roasFmt(daily.reduce((s, d) => s + d.roas, 0) / daily.length)}</strong></span>
            <span>ROAS máx: <strong className="text-foreground">{roasFmt(Math.max(...daily.map(d => d.roas)))}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaigns Tab ─────────────────────────────────────────────
function CampaignsTab({ adAccountId, token, datePreset, refreshKey }: {
  adAccountId: string; token: string; datePreset: DatePreset; refreshKey: number;
}) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setCampaigns(await fetchCampaigns(adAccountId, token, datePreset)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [adAccountId, token, datePreset, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const visible = campaigns.filter((c) => showPaused || c.status === "ACTIVE");
  const active = campaigns.filter((c) => c.status === "ACTIVE");
  const paused = campaigns.filter((c) => c.status !== "ACTIVE");

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground gap-3"><RefreshCw className="h-5 w-5 animate-spin" /> Cargando campañas…</div>;
  if (error) return <div className="glass gold-border rounded-xl p-6 text-destructive text-sm">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-status-approved/20 text-status-approved border-status-approved/30">{active.length} activas</Badge>
          {paused.length > 0 && <Badge variant="outline" className="text-muted-foreground">{paused.length} pausadas</Badge>}
          <span className="text-xs text-muted-foreground">· Gasto total: <strong className="text-foreground">{mxn(totalSpend)}</strong></span>
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
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPM</TableHead>
                <TableHead className="text-right">Presupuesto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => {
                const rs = roasStatus(c.roas);
                const spendShare = totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[200px]">
                      <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">{c.objective}</p>
                        <span className="text-[9px] text-muted-foreground/50">· {spendShare.toFixed(0)}% del gasto</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] border ${statusColor(c.status)}`}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right text-xs font-medium">{mxn(c.spend)}</TableCell>
                    <TableCell className="text-right text-xs">{c.revenue > 0 ? mxn(c.revenue) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-bold flex items-center justify-end gap-1 ${rs.cls}`}>
                        {rs.icon}{c.spend > 0 ? roasFmt(c.roas) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{c.purchases > 0 ? c.purchases : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{c.addToCart > 0 ? c.addToCart : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{c.cpa > 0 ? mxn(c.cpa) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{pct(c.ctr)}</TableCell>
                    <TableCell className="text-right text-xs">{mxn(c.cpm)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {c.dailyBudget ? `${mxn(c.dailyBudget)}/día` : c.lifetimeBudget ? mxn(c.lifetimeBudget) : "CBO"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Sin campañas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ── Ad Sets Tab ───────────────────────────────────────────────
function AdSetsTab({ adAccountId, token, datePreset, refreshKey }: {
  adAccountId: string; token: string; datePreset: DatePreset; refreshKey: number;
}) {
  const [adsets, setAdsets] = useState<AdSetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);
  const [sortBy, setSortBy] = useState<"spend" | "roas" | "cpa">("spend");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAdsets(await fetchAdSets(adAccountId, token, datePreset)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [adAccountId, token, datePreset, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const visible = adsets
    .filter((a) => showPaused || a.status === "ACTIVE")
    .sort((a, b) => sortBy === "roas" ? b.roas - a.roas : sortBy === "cpa" ? (b.cpa > 0 ? 1 : -1) : b.spend - a.spend);

  const active = adsets.filter((a) => a.status === "ACTIVE");
  const paused = adsets.filter((a) => a.status !== "ACTIVE");

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground gap-3"><RefreshCw className="h-5 w-5 animate-spin" /> Cargando ad sets…</div>;
  if (error) return <div className="glass gold-border rounded-xl p-6 text-destructive text-sm">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-status-approved/20 text-status-approved border-status-approved/30">{active.length} activos</Badge>
          {paused.length > 0 && <Badge variant="outline" className="text-muted-foreground">{paused.length} pausados</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[120px] bg-secondary border-border/50 rounded-lg">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="glass gold-border text-xs">
              <SelectItem value="spend">Por gasto</SelectItem>
              <SelectItem value="roas">Por ROAS</SelectItem>
              <SelectItem value="cpa">Por CPA</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPaused((v) => !v)}>
            {showPaused ? "Ocultar pausados" : "Ver pausados"}
            {showPaused ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      </div>

      <div className="glass gold-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Set</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">ATC</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((a) => {
                const rs = roasStatus(a.roas);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[200px]">
                      <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.campaignName}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.optimizationGoal || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] border ${statusColor(a.status)}`}>{a.status}</Badge></TableCell>
                    <TableCell className="text-right text-xs font-medium">{a.spend > 0 ? mxn(a.spend) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-bold flex items-center justify-end gap-1 ${a.spend > 0 ? rs.cls : "text-muted-foreground"}`}>
                        {a.spend > 0 ? <>{rs.icon}{roasFmt(a.roas)}</> : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{a.purchases > 0 ? a.purchases : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{a.addToCart > 0 ? a.addToCart : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{a.cpa > 0 ? mxn(a.cpa) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{pct(a.ctr)}</TableCell>
                    <TableCell className="text-right text-xs">{a.cpm > 0 ? mxn(a.cpm) : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Sin ad sets</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
      body: "Todos los anuncios dirigen a /collections/sueros-faciales (página de colección), NO a producto específico. Agrega 2–3 pasos extra antes del checkout. Explica el drop del 63% entre clic y ViewContent.",
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
      action: "Con ATC como optimización, CPA objetivo baja a $200-400 MXN → viable con $1,000-2,000 MXN/día.",
    },
    {
      icon: "🟡", title: "ALTO 6 — Solapamiento masivo de audiencias", priority: "Alto",
      body: "9 ad sets en 'Ventas - Productos estrella' compitiendo por las mismas personas. LAL 3% aparece en 4 ad sets distintos. CPMs inflados internamente.",
      action: "Consolidar de 9 ad sets a 3. Eliminar duplicados.",
    },
    {
      icon: "🟡", title: "ALTO 7 — Sin UGC ni creativos frescos", priority: "Alto",
      body: "Creativos activos 40-50 días. El motor Andromeda de Meta suprime creativos después de 2-4 semanas. Solo 1 creativo UGC activo.",
      action: "Pipeline de UGC: mínimo 5 conceptos por ad set. Rotación cada 2 semanas.",
    },
    {
      icon: "🟡", title: "ALTO 8 — Naming convention inexistente", priority: "Alto",
      body: "37 campañas desde 2021 sin convención de nombres. 'Ventas/Marzo 2026' activa en mayo. Imposible análisis histórico.",
      action: "Implementar: [TSC]_[TIPO]_[OBJETIVO]_[AUDIENCIA]_[MES-AÑO]",
    },
  ];

  const quickWins = [
    { id: "QW1", action: "Excluir Audience Network en todos los ad sets", impact: "+$661 MXN/mes recuperados", time: "30 min" },
    { id: "QW2", action: "Pausar 'Agregar a carrito | Marzo 2026'", impact: "Detener sangrado de $1,738 MXN", time: "5 min" },
    { id: "QW3", action: "Eliminar píxeles inactivos y sospechoso", impact: "Seguridad + datos limpios", time: "15 min" },
    { id: "QW4", action: "Cambiar optimización Purchase → Add to Cart", impact: "Activar aprendizaje del algoritmo", time: "20 min" },
    { id: "QW5", action: "Consolidar ad sets con overlap (de 9 a 3)", impact: "-30% CPM interno estimado", time: "1 hora" },
    { id: "QW6", action: "Agregar exclusión de compradores en prospección", impact: "Eliminar gasto en clientes existentes", time: "15 min" },
    { id: "QW7", action: "Activar Shopify One-Page Checkout", impact: "Reducir abandono en checkout", time: "Con dev" },
  ];

  const projection = [
    { period: "Hoy (mayo 2026)", roas: "0.49x", cpa: "$2,216", purchases: "4/mes", spend: "$295/día", revenue: "$4,349/mes" },
    { period: "30 días post-fix", roas: "1.2–1.5x", cpa: "$900–1,200", purchases: "15–25", spend: "$500/día", revenue: "$18K–30K" },
    { period: "60 días", roas: "1.8–2.2x", cpa: "$600–900", purchases: "35–60", spend: "$800–1,000/día", revenue: "$63K–108K" },
    { period: "90 días", roas: "2.5–3.5x", cpa: "$400–700", purchases: "80–150", spend: "$1,500–3,000/día", revenue: "$160K–420K" },
  ];

  return (
    <div className="space-y-8">
      {/* Health Score */}
      <div className="glass gold-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">META ADS HEALTH SCORE — The Skin Club</h3>
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">Mayo 2026</Badge>
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="text-5xl font-black text-destructive">31</div>
          <div>
            <p className="text-lg font-bold text-destructive">Grado F — Rescate total requerido</p>
            <p className="text-xs text-muted-foreground">5 problemas críticos · 3 problemas altos · 7 quick wins identificados</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "Pixel / CAPI Health", score: 45, weight: "30%", color: "#f59e0b", note: "Píxel activo pero señales débiles. Sin CAPI." },
            { label: "Creative Quality", score: 22, weight: "30%", color: "#ef4444", note: "Creativos con 40-50 días. Sin UGC suficiente." },
            { label: "Account Structure", score: 18, weight: "20%", color: "#ef4444", note: "37 campañas sin naming. Solapamiento masivo." },
            { label: "Audience & Targeting", score: 42, weight: "20%", color: "#f59e0b", note: "LAL duplicados. Sin exclusión de compradores." },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">{item.label} </span>
                  <span className="text-muted-foreground/50">(peso {item.weight})</span>
                  <p className="text-[10px] text-muted-foreground/60">{item.note}</p>
                </div>
                <span className="font-semibold shrink-0 ml-2" style={{ color: item.color }}>{item.score}/100</span>
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
          <Zap className="h-4 w-4 text-primary" /> Quick Wins — Implementar esta semana
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
          <TrendingUp className="h-4 w-4 text-primary" /> Proyección a 90 días (si se implementan los fixes)
        </h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead>CPA</TableHead>
                <TableHead>Compras</TableHead>
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
        <p className="text-[10px] text-muted-foreground mt-3">* Condicionado a: fix del checkout, producción de UGC, CAPI activo, budget incrementado.</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdsPage() {
  const { selectedClienteId, clients } = useAppState();
  const [token, setToken] = useState<string | null>(null);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [loadingToken, setLoadingToken] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(AUTO_REFRESH_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load token whenever selected client changes
  useEffect(() => {
    if (!selectedClienteId) { setLoadingToken(false); return; }
    setLoadingToken(true);
    loadPlatformToken(selectedClienteId).then((cfg) => {
      if (cfg) {
        setToken(cfg.accessToken);
        setAdAccountId(cfg.adAccountId?.replace("act_", "") || null);
      } else {
        setToken(null);
        setAdAccountId(null);
      }
    }).finally(() => setLoadingToken(false));
  }, [selectedClienteId]);

  // Auto-refresh every 30 min
  useEffect(() => {
    if (!token || !adAccountId) return;
    setLastUpdated(new Date());
    setNextRefreshIn(AUTO_REFRESH_MS / 1000);

    // countdown
    const countdown = setInterval(() => {
      setNextRefreshIn((n) => Math.max(0, n - 1));
    }, 1000);

    // auto refresh
    const refresh = setInterval(() => {
      setRefreshKey((k) => k + 1);
      setLastUpdated(new Date());
      setNextRefreshIn(AUTO_REFRESH_MS / 1000);
    }, AUTO_REFRESH_MS);

    timerRef.current = refresh;
    return () => { clearInterval(countdown); clearInterval(refresh); };
  }, [token, adAccountId]);

  // Also reset timer on manual refresh
  const handleManualRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setLastUpdated(new Date());
    setNextRefreshIn(AUTO_REFRESH_MS / 1000);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClienteId);
  const clientName = selectedClient?.nombre || selectedClient?.empresa || "Cliente";

  const nextRefreshMinutes = Math.ceil(nextRefreshIn / 60);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Meta Ads
            {selectedClient && (
              <Badge className="gold-gradient text-primary-foreground text-xs ml-1">{clientName}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Datos en tiempo real · Diagnóstico · Plan de rescate
            {lastUpdated && (
              <span className="text-xs text-muted-foreground/60">
                · Actualizado {lastUpdated.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                · próxima en {nextRefreshMinutes} min
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={handleManualRefresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </Button>
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
        <div className="glass gold-border rounded-xl p-8 text-center space-y-2">
          <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-foreground font-medium">Credenciales de Meta Ads no configuradas</p>
          <p className="text-sm text-muted-foreground">
            {!selectedClienteId
              ? "Selecciona un cliente en el menú lateral para ver sus Ads."
              : `El cliente "${clientName}" no tiene un Ad Account ID configurado. Ve a Métricas → Instagram → ⚙️ y agrega el Ad Account ID.`}
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50 border border-border/30 h-auto p-1 flex-wrap gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5">
              <BarChart2 className="h-4 w-4" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm gap-1.5">
              <Target className="h-4 w-4" /> Campañas
            </TabsTrigger>
            <TabsTrigger value="adsets" className="text-xs sm:text-sm gap-1.5">
              <Layers className="h-4 w-4" /> Ad Sets
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs sm:text-sm gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Diagnóstico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab adAccountId={adAccountId} token={token} datePreset={datePreset} refreshKey={refreshKey} />
          </TabsContent>
          <TabsContent value="campaigns" className="mt-4">
            <CampaignsTab adAccountId={adAccountId} token={token} datePreset={datePreset} refreshKey={refreshKey} />
          </TabsContent>
          <TabsContent value="adsets" className="mt-4">
            <AdSetsTab adAccountId={adAccountId} token={token} datePreset={datePreset} refreshKey={refreshKey} />
          </TabsContent>
          <TabsContent value="analysis" className="mt-4">
            <AnalysisTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
