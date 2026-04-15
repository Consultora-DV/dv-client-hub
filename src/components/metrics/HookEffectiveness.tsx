import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { PostMetric, formatEngagement } from "@/services/metricsParser";
import MetricTooltip from "./MetricTooltip";

interface Props {
  posts: PostMetric[];
  platform: "instagram" | "tiktok";
}

export default function HookEffectiveness({ posts, platform }: Props) {
  const { data, avg, postMap, hasData } = useMemo(() => {
    const sorted = [...posts].sort((a, b) => a.date.localeCompare(b.date));
    const pm = new Map<string, PostMetric>();
    const d: { postId: string; label: string; rate: number }[] = [];

    for (const p of sorted) {
      const val = platform === "tiktok" ? p.fullVideoWatchedRate : p.viewRate3sec;
      if (val == null || val === 0) continue;
      pm.set(p.id, p);
      const dateParts = p.date.slice(5, 10).split("-");
      const label = dateParts.length === 2 ? `${parseInt(dateParts[1])} ${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][parseInt(dateParts[0]) - 1] || ""}` : p.date.slice(0, 10);
      d.push({ postId: p.id, label, rate: val });
    }

    const a = d.length > 0 ? d.reduce((s, x) => s + x.rate, 0) / d.length : 0;
    return { data: d, avg: a, postMap: pm, hasData: d.length >= 2 };
  }, [posts, platform]);

  const lineColor = avg > 50 ? "#34D399" : "#F59E0B";
  const subtitle = platform === "tiktok" ? "% que terminaron de ver el video" : "% que vieron más de 3 segundos";
  const tooltipLabel = platform === "tiktok" ? "Completaron video" : "Vieron +3s";

  if (!hasData) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Efectividad del Hook</h3>
        <p className="text-xs text-muted-foreground mt-2">No hay datos de retención disponibles.</p>
      </div>
    );
  }

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground">Efectividad del Hook</h3>
      <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={10} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<MetricTooltip postMap={postMap} valueLabel={tooltipLabel} valueFormatter={formatEngagement} />} />
          <ReferenceLine y={avg} stroke="hsl(240,10%,55%)" strokeDasharray="4 4" label={{ value: `Prom: ${avg.toFixed(1)}%`, position: "right", fill: "hsl(240,10%,55%)", fontSize: 10 }} />
          <Line type="monotone" dataKey="rate" stroke={lineColor} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
