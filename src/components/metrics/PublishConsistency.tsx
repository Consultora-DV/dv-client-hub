import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { PostMetric } from "@/services/metricsParser";
import PostLink from "./PostLink";
import { startOfWeek, format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  posts: PostMetric[];
  accent: string;
}

function WeekTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-[hsl(240,20%,12%)] border border-border/40 rounded-lg p-3 shadow-xl max-w-[220px]">
      <p className="text-xs text-foreground font-medium">{data.posts} posts esta semana</p>
      {data.topPosts?.slice(0, 3).map((p: PostMetric) => (
        <PostLink key={p.id} url={p.url} className="block text-[10px] text-primary truncate mt-0.5">
          {(p.title || "Sin título").slice(0, 40)}
        </PostLink>
      ))}
    </div>
  );
}

export default function PublishConsistency({ posts, accent }: Props) {
  const { data, avg } = useMemo(() => {
    const weeks: Record<string, { label: string; posts: number; topPosts: PostMetric[] }> = {};

    for (const p of posts) {
      const d = new Date(p.date.replace(" ", "T"));
      if (isNaN(d.getTime())) continue;
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) {
        weeks[key] = {
          label: `Sem ${format(weekStart, "d MMM", { locale: es })}`,
          posts: 0,
          topPosts: [],
        };
      }
      weeks[key].posts += 1;
      weeks[key].topPosts.push(p);
    }

    const d = Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const a = d.length > 0 ? d.reduce((s, x) => s + x.posts, 0) / d.length : 0;
    return { data: d, avg: a };
  }, [posts]);

  if (data.length === 0) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Frecuencia de Publicación</h3>
        <p className="text-xs text-muted-foreground mt-2">No hay datos suficientes.</p>
      </div>
    );
  }

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground">Frecuencia de Publicación</h3>
      <p className="text-[10px] text-muted-foreground">Posts por semana en el período</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={10} angle={-20} textAnchor="end" height={50} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={10} allowDecimals={false} />
          <Tooltip content={<WeekTooltip />} />
          <ReferenceLine y={avg} stroke="hsl(240,10%,55%)" strokeDasharray="4 4" label={{ value: `Prom: ${avg.toFixed(1)}`, position: "right", fill: "hsl(240,10%,55%)", fontSize: 10 }} />
          <Bar dataKey="posts" fill={accent} radius={[4, 4, 0, 0]} name="Posts" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
