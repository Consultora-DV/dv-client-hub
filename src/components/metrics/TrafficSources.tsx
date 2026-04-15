import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PostMetric } from "@/services/metricsParser";

const COLORS: Record<string, string> = {
  "For You": "#69C9D0",
  "Follow": "#9B5DE5",
  "Search": "#F15BB5",
  "Hashtag": "#FEE440",
};

export default function TrafficSources({ posts }: { posts: PostMetric[] }) {
  const data = useMemo(() => {
    const postsWithData = posts.filter((p) =>
      (p.forYouPct ?? 0) + (p.followPct ?? 0) + (p.searchPct ?? 0) + (p.hashtagPct ?? 0) > 0
    );
    if (postsWithData.length === 0) return [];

    const avg = (key: keyof PostMetric) =>
      postsWithData.reduce((s, p) => s + ((p[key] as number) ?? 0), 0) / postsWithData.length;

    return [
      { name: "For You", value: Math.round(avg("forYouPct") * 10) / 10 },
      { name: "Follow", value: Math.round(avg("followPct") * 10) / 10 },
      { name: "Search", value: Math.round(avg("searchPct") * 10) / 10 },
      { name: "Hashtag", value: Math.round(avg("hashtagPct") * 10) / 10 },
    ].filter((d) => d.value > 0);
  }, [posts]);

  if (data.length === 0) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">¿De dónde vienen tus vistas?</h3>
        <p className="text-xs text-muted-foreground mt-2">No hay datos de fuentes de tráfico disponibles.</p>
      </div>
    );
  }

  const renderLabel = ({ name, value }: any) => `${value.toFixed(1)}%`;

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground">¿De dónde vienen tus vistas?</h3>
      <p className="text-[10px] text-muted-foreground">Distribución promedio de fuentes de tráfico</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={renderLabel} labelLine={false} fontSize={10}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name] || "#888"} />
            ))}
          </Pie>
          <Legend iconType="circle" formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(240,20%,12%)", border: "1px solid hsl(240,15%,18%)", borderRadius: "8px" }} formatter={(v: number) => `${v.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">For You % alto = el algoritmo te está empujando ✓</p>
    </div>
  );
}
