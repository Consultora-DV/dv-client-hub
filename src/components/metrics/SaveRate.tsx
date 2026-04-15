import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { PostMetric, formatNumber } from "@/services/metricsParser";
import MetricTooltip from "./MetricTooltip";

export default function SaveRate({ posts }: { posts: PostMetric[] }) {
  const { data, avg, postMap, hasData } = useMemo(() => {
    const sorted = [...posts].sort((a, b) => a.date.localeCompare(b.date));
    const pm = new Map<string, PostMetric>();
    const d: { postId: string; label: string; rate: number }[] = [];

    for (const p of sorted) {
      if (p.saved == null || p.views === 0) continue;
      pm.set(p.id, p);
      const dateParts = p.date.slice(5, 10).split("-");
      const label = dateParts.length === 2 ? `${parseInt(dateParts[1])} ${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][parseInt(dateParts[0]) - 1] || ""}` : p.date.slice(0, 10);
      d.push({ postId: p.id, label, rate: (p.saved / p.views) * 100 });
    }

    const a = d.length > 0 ? d.reduce((s, x) => s + x.rate, 0) / d.length : 0;
    return { data: d, avg: a, postMap: pm, hasData: d.length >= 2 };
  }, [posts]);

  if (!hasData) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Tasa de Guardados</h3>
        <p className="text-xs text-muted-foreground mt-2">No hay datos de guardados disponibles.</p>
      </div>
    );
  }

  const tooltipFormatter = (v: number) => `${v.toFixed(2)}%`;

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground">Tasa de Guardados</h3>
      <p className="text-[10px] text-muted-foreground">Saves / Views por publicación</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={10} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={10} tickFormatter={(v) => `${v.toFixed(1)}%`} />
          <Tooltip content={<MetricTooltip postMap={postMap} valueLabel="Save Rate" valueFormatter={tooltipFormatter} />} />
          <ReferenceLine y={avg} stroke="hsl(240,10%,55%)" strokeDasharray="4 4" label={{ value: `Prom: ${avg.toFixed(2)}%`, position: "right", fill: "hsl(240,10%,55%)", fontSize: 10 }} />
          <Line type="monotone" dataKey="rate" stroke="#F472B6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">Los saves son la métrica más valiosa para el algoritmo de Instagram</p>
    </div>
  );
}
