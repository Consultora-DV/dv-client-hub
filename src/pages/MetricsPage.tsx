import { useState, useRef, useMemo } from "react";
import { toast as sonnerToast } from "sonner";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Upload, X, BarChart3, Instagram, Youtube, Facebook, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAppState } from "@/contexts/AppStateContext";
import {
  PlatformMetrics, PostMetric, parseMetricsCSV, calculateMonthlySummary,
  formatNumber, formatEngagement, formatWatchTime,
} from "@/services/metricsParser";
import { filterDuplicates } from "@/lib/deduplication";

const PLATFORMS = [
  { key: "general", label: "General", icon: BarChart3, color: "text-primary", bgActive: "gold-gradient text-primary-foreground", accent: "hsl(42,52%,54%)" },
  { key: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500", bgActive: "bg-gradient-to-r from-pink-500 to-purple-600 text-white", accent: "hsl(330,70%,55%)" },
  { key: "tiktok", label: "TikTok", icon: BarChart3, color: "text-cyan-400", bgActive: "bg-black text-cyan-400 border border-cyan-400/50", accent: "#69C9D0" },
  { key: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500", bgActive: "bg-red-600 text-white", accent: "#FF0000" },
  { key: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-500", bgActive: "bg-blue-600 text-white", accent: "#1877F2" },
] as const;

type PlatformKey = typeof PLATFORMS[number]["key"];

function usePlatformMetrics(clienteId: string | null, platform: string): [PlatformMetrics | null, (v: PlatformMetrics | null) => void] {
  const key = clienteId ? `dv_metrics_${clienteId}_${platform}` : `dv_metrics_none_${platform}`;
  return useLocalStorage<PlatformMetrics | null>(key, null);
}

function KPICards({ posts }: { posts: PostMetric[] }) {
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const avgEng = posts.length > 0 ? posts.reduce((s, p) => s + p.engagement, 0) / posts.length : 0;
  const best = posts.reduce<PostMetric | null>((top, p) => !top || p.views > top.views ? p : top, null);

  const cards = [
    { label: "Total Views", value: formatNumber(totalViews), color: "text-primary" },
    { label: "Total Likes", value: formatNumber(totalLikes), color: "text-pink-500" },
    { label: "Engagement promedio", value: formatEngagement(avgEng), color: "text-cyan-400" },
    { label: "Mejor video", value: best ? `${best.title.slice(0, 25)}… (${formatNumber(best.views)})` : "—", color: "text-status-approved" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="glass gold-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className={`text-xl font-bold ${c.color} mt-1 truncate`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function UploadZone({ platform, metrics, onUpload, onRemove }: {
  platform: PlatformKey;
  metrics: PlatformMetrics | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pInfo = PLATFORMS.find((p) => p.key === platform)!;

  if (metrics) {
    return (
      <div className="glass gold-border rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Upload className={`h-5 w-5 ${pInfo.color}`} />
          <div>
            <p className="text-sm font-medium text-foreground">{metrics.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(metrics.uploadedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}{metrics.posts.length} posts
            </p>
          </div>
        </div>
        <button onClick={onRemove} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label className="glass gold-border rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors">
      <Upload className={`h-8 w-8 ${pInfo.color}`} />
      <div>
        <p className="text-sm font-medium text-foreground">Sube tu reporte de {pInfo.label}</p>
        <p className="text-xs text-muted-foreground">CSV separado por punto y coma (;)</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); if (fileRef.current) fileRef.current.value = ""; }} className="hidden" />
    </label>
  );
}

function TopPostsChart({ posts, accent, label }: { posts: PostMetric[]; accent: string; label: string }) {
  const top10 = [...posts].sort((a, b) => b.views - a.views).slice(0, 10).map((p) => ({
    name: p.title.slice(0, 30) || "Sin título",
    views: p.views,
  }));
  if (top10.length === 0) return null;

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={top10}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="name" stroke="hsl(240,10%,55%)" fontSize={10} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(240,20%,12%)", border: "1px solid hsl(240,15%,18%)", borderRadius: "8px" }} />
          <Bar dataKey="views" fill={accent} radius={[4, 4, 0, 0]} name="Views" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyLineChart({ data, accent }: { data: { label: string; totalViews: number }[]; accent: string }) {
  if (data.length === 0) return null;
  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Rendimiento mensual</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={12} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(240,20%,12%)", border: "1px solid hsl(240,15%,18%)", borderRadius: "8px" }} />
          <Line type="monotone" dataKey="totalViews" stroke={accent} strokeWidth={2} dot={{ r: 4 }} name="Views" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyGroupedBars({ data }: { data: { label: string; totalLikes: number; totalComments: number; totalShares: number }[] }) {
  if (data.length === 0) return null;
  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Likes + Comments + Shares por mes</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={12} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(240,20%,12%)", border: "1px solid hsl(240,15%,18%)", borderRadius: "8px" }} />
          <Legend />
          <Bar dataKey="totalLikes" fill="hsl(330,70%,55%)" name="Likes" radius={[2, 2, 0, 0]} />
          <Bar dataKey="totalComments" fill="hsl(42,52%,54%)" name="Comments" radius={[2, 2, 0, 0]} />
          <Bar dataKey="totalShares" fill="hsl(160,60%,45%)" name="Shares" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PostsTable({ posts, platform }: { posts: PostMetric[]; platform: "instagram" | "tiktok" }) {
  const [sortBy, setSortBy] = useState<string>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => {
      const av = (a as any)[sortBy] ?? 0;
      const bv = (b as any)[sortBy] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [posts, sortBy, sortDir]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const cols = platform === "instagram"
    ? [
        { key: "title", label: "Título" },
        { key: "date", label: "Fecha" },
        { key: "views", label: "Views" },
        { key: "likes", label: "Likes" },
        { key: "comments", label: "Comments" },
        { key: "engagement", label: "Engagement%" },
        { key: "avgWatchTime", label: "Watch Time" },
        { key: "reposts", label: "Reposts" },
      ]
    : [
        { key: "title", label: "Título" },
        { key: "date", label: "Fecha" },
        { key: "views", label: "Views" },
        { key: "likes", label: "Likes" },
        { key: "comments", label: "Comments" },
        { key: "engagement", label: "Engagement%" },
        { key: "forYouPct", label: "For You%" },
        { key: "avgTimeWatched", label: "Avg Watch" },
      ];

  return (
    <div className="glass gold-border rounded-xl overflow-hidden">
      <h3 className="text-sm font-semibold text-foreground p-5 pb-0">
        {platform === "instagram" ? "Todos los reels" : "Todos los videos"}
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              {cols.map((c) => (
                <TableHead key={c.key} className="cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort(c.key)}>
                  {c.label} {sortBy === c.key ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                  ) : (
                    <div className="w-10 h-10 rounded bg-secondary" />
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">{p.title.slice(0, 50) || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.date.slice(0, 10)}</TableCell>
                <TableCell className="text-xs font-medium">{formatNumber(p.views)}</TableCell>
                <TableCell className="text-xs">{formatNumber(p.likes)}</TableCell>
                <TableCell className="text-xs">{formatNumber(p.comments)}</TableCell>
                <TableCell className="text-xs">{formatEngagement(p.engagement)}</TableCell>
                {platform === "instagram" ? (
                  <>
                    <TableCell className="text-xs">{p.avgWatchTime ? formatWatchTime(p.avgWatchTime) : "—"}</TableCell>
                    <TableCell className="text-xs">{p.reposts ?? 0}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-xs">{p.forYouPct != null ? `${p.forYouPct.toFixed(1)}%` : "—"}</TableCell>
                    <TableCell className="text-xs">{p.avgTimeWatched ? formatWatchTime(p.avgTimeWatched) : "—"}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EmptyState({ platform }: { platform: string }) {
  const pInfo = PLATFORMS.find((p) => p.key === platform);
  return (
    <div className="glass gold-border rounded-xl p-12 flex flex-col items-center gap-4 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
      <div>
        <p className="text-foreground font-medium">Sin datos de {pInfo?.label || platform} aún</p>
        <p className="text-sm text-muted-foreground mt-1">Sube tu reporte CSV para comenzar.</p>
      </div>
    </div>
  );
}

function PlatformTab({ platform, clienteId }: { platform: "instagram" | "tiktok" | "youtube" | "facebook"; clienteId: string | null }) {
  const [metrics, setMetrics] = usePlatformMetrics(clienteId, platform);
  const pInfo = PLATFORMS.find((p) => p.key === platform)!;

  const handleUpload = async (file: File) => {
    try {
      const { platform: detected, posts: parsedPosts } = await parseMetricsCSV(file);
      if (detected !== platform) {
        const pName = PLATFORMS.find((p) => p.key === detected)?.label || detected;
        sonnerToast.error(`Este archivo parece ser de ${pName}. Cárgalo en el tab de ${pName}.`);
        return;
      }

      // Deduplicate against existing posts
      const existingPosts = metrics?.posts || [];
      const { unique, duplicates } = filterDuplicates(
        parsedPosts,
        existingPosts,
        (p) => p.url || p.id
      );

      const allPosts = [...existingPosts, ...unique];
      const summary = calculateMonthlySummary(allPosts);
      setMetrics({
        clienteId: clienteId || "",
        platform,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        posts: allPosts,
        monthlySummary: summary,
      });

      const msg = `${unique.length} posts nuevos de ${pInfo.label}${duplicates.length > 0 ? ` · ${duplicates.length} ya existían (omitidos)` : ""}`;
      sonnerToast.success(msg);
    } catch (err: any) {
      sonnerToast.error(err.message || "Error al parsear el archivo");
    }
  };

  return (
    <div className="space-y-6">
      <UploadZone platform={platform} metrics={metrics} onUpload={handleUpload} onRemove={() => setMetrics(null)} />

      {!metrics || metrics.posts.length === 0 ? (
        <EmptyState platform={platform} />
      ) : (
        <>
          <KPICards posts={metrics.posts} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopPostsChart posts={metrics.posts} accent={pInfo.accent} label={`Vistas por ${platform === "instagram" ? "reel" : "video"}`} />
            <MonthlyLineChart data={metrics.monthlySummary} accent={pInfo.accent} />
          </div>
          <MonthlyGroupedBars data={metrics.monthlySummary} />
          <PostsTable posts={metrics.posts} platform={platform as "instagram" | "tiktok"} />
        </>
      )}
    </div>
  );
}

function GeneralTab({ clienteId }: { clienteId: string | null }) {
  const [igMetrics] = usePlatformMetrics(clienteId, "instagram");
  const [ttMetrics] = usePlatformMetrics(clienteId, "tiktok");
  const [ytMetrics] = usePlatformMetrics(clienteId, "youtube");
  const [fbMetrics] = usePlatformMetrics(clienteId, "facebook");

  const allPlatforms = [
    { key: "instagram", label: "Instagram", metrics: igMetrics, color: "hsl(330,70%,55%)" },
    { key: "tiktok", label: "TikTok", metrics: ttMetrics, color: "#69C9D0" },
    { key: "youtube", label: "YouTube", metrics: ytMetrics, color: "#FF0000" },
    { key: "facebook", label: "Facebook", metrics: fbMetrics, color: "#1877F2" },
  ];

  const withData = allPlatforms.filter((p) => p.metrics && p.metrics.posts.length > 0);

  if (withData.length === 0) {
    return (
      <div className="glass gold-border rounded-xl p-12 flex flex-col items-center gap-4 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-foreground font-medium">Sin datos de métricas aún</p>
          <p className="text-sm text-muted-foreground mt-1">Sube reportes CSV en cada pestaña de plataforma para ver el resumen general.</p>
        </div>
      </div>
    );
  }

  // Summary cards per platform
  const summaryCards = allPlatforms.map((p) => ({
    label: p.label,
    posts: p.metrics?.posts.length || 0,
    color: p.color,
  }));

  // Cross-platform monthly comparison (if 2+ platforms)
  const crossData: Record<string, Record<string, number>> = {};
  for (const p of withData) {
    for (const m of p.metrics!.monthlySummary) {
      if (!crossData[m.month]) crossData[m.month] = { label: m.label } as any;
      (crossData[m.month] as any).label = m.label;
      (crossData[m.month] as any)[p.key] = m.totalViews;
    }
  }
  const crossChartData = Object.values(crossData).sort((a: any, b: any) => 
    (Object.keys(crossData).find((k) => crossData[k] === a) || "").localeCompare(
      Object.keys(crossData).find((k) => crossData[k] === b) || ""
    )
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="glass gold-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{c.posts}</p>
            <p className="text-xs text-muted-foreground">posts importados</p>
          </div>
        ))}
      </div>

      {withData.length >= 2 && crossChartData.length > 0 && (
        <div className="glass gold-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Comparación de views por mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={crossChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
              <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={12} />
              <YAxis stroke="hsl(240,10%,55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240,20%,12%)", border: "1px solid hsl(240,15%,18%)", borderRadius: "8px" }} />
              <Legend />
              {withData.map((p) => (
                <Bar key={p.key} dataKey={p.key} fill={p.color} name={p.label} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const { canUpload } = usePermissions();
  const { selectedClienteId, clients } = useAppState();
  const [activeTab, setActiveTab] = useLocalStorage<string>("dv_metrics_active_tab", "general");

  const clienteId = selectedClienteId;
  const client = clients.find((c) => c.id === clienteId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Métricas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {client ? client.nombre : "Selecciona un cliente para ver sus métricas"}
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList className="bg-secondary/50 border border-border/30 h-auto p-1 flex-wrap">
          {PLATFORMS.map((p) => (
            <TabsTrigger
              key={p.key}
              value={p.key}
              className={`data-[state=active]:${p.bgActive} gap-1.5 text-xs sm:text-sm`}
            >
              <p.icon className={`h-4 w-4 ${p.color}`} />
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <GeneralTab clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="instagram">
          <PlatformTab platform="instagram" clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="tiktok">
          <PlatformTab platform="tiktok" clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="youtube">
          <PlatformTab platform="youtube" clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="facebook">
          <PlatformTab platform="facebook" clienteId={clienteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
