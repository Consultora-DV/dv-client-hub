import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { PostMetric, formatEngagement } from "@/services/metricsParser";
import MetricTooltip from "./MetricTooltip";

interface Props {
  posts: PostMetric[];
  accent: string;
}

export default function EngagementTrend({ posts, accent }: Props) {
  const { data, avg, postMap } = useMemo(() => {
    const sorted = [...posts].sort((a, b) => a.date.localeCompare(b.date));
    const pm = new Map<string, PostMetric>();
    const d = sorted.map((p) => {
      pm.set(p.id, p);
      const dateParts = p.date.slice(5, 10).split("-");
      const label = dateParts.length === 2 ? `${parseInt(dateParts[1])} ${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][parseInt(dateParts[0]) - 1] || ""}` : p.date.slice(0, 10);
      return { postId: p.id, label, engagement: p.engagement };
    });
    const a = d.length > 0 ? d.reduce((s, x) => s + x.engagement, 0) / d.length : 0;
    return { data: d, avg: a, postMap: pm };
  }, [posts]);

  if (posts.length < 3) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Tendencia de Engagement</h3>
        <p className="text-xs text-muted-foreground mt-2">Necesitas al menos 3 publicaciones para ver la tendencia.</p>
      </div>
    );
  }

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground">Tendencia de Engagement</h3>
      <p className="text-[10px] text-muted-foreground">% por publicación en el tiempo</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={10} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
          <Tooltip content={<MetricTooltip postMap={postMap} valueLabel="Engagement" valueFormatter={formatEngagement} />} />
          <ReferenceLine y={avg} stroke="hsl(240,10%,55%)" strokeDasharray="4 4" label={{ value: `Prom: ${formatEngagement(avg)}`, position: "right", fill: "hsl(240,10%,55%)", fontSize: 10 }} />
          <Line type="monotone" dataKey="engagement" stroke={accent} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
