import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { PostMetric } from "@/services/metricsParser";
import MetricTooltip from "./MetricTooltip";

export default function CommentsLikesRatio({ posts }: { posts: PostMetric[] }) {
  const { data, avg, postMap } = useMemo(() => {
    const sorted = [...posts].sort((a, b) => a.date.localeCompare(b.date));
    const pm = new Map<string, PostMetric>();
    const d: { postId: string; label: string; ratio: number; highlight: boolean }[] = [];

    for (const p of sorted) {
      if (p.likes === 0) continue;
      pm.set(p.id, p);
      const ratio = (p.comments / p.likes) * 100;
      const dateParts = p.date.slice(5, 10).split("-");
      const label = dateParts.length === 2 ? `${parseInt(dateParts[1])} ${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][parseInt(dateParts[0]) - 1] || ""}` : p.date.slice(0, 10);
      d.push({ postId: p.id, label, ratio, highlight: ratio > 10 });
    }

    const a = d.length > 0 ? d.reduce((s, x) => s + x.ratio, 0) / d.length : 0;
    return { data: d, avg: a, postMap: pm };
  }, [posts]);

  if (data.length < 2) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Ratio Comentarios / Likes</h3>
        <p className="text-xs text-muted-foreground mt-2">No hay datos suficientes.</p>
      </div>
    );
  }

  const tooltipFormatter = (v: number) => `${v.toFixed(2)}%`;

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload?.highlight) return <circle cx={cx} cy={cy} r={3} fill="#F59E0B" />;
    return <circle cx={cx} cy={cy} r={6} fill="#34D399" stroke="#fff" strokeWidth={1} />;
  };

  return (
    <div className="glass gold-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground">Ratio Comentarios / Likes</h3>
      <p className="text-[10px] text-muted-foreground">Comments / Likes × 100 por publicación</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,18%)" />
          <XAxis dataKey="label" stroke="hsl(240,10%,55%)" fontSize={10} />
          <YAxis stroke="hsl(240,10%,55%)" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
          <Tooltip content={<MetricTooltip postMap={postMap} valueLabel="Ratio C/L" valueFormatter={tooltipFormatter} />} />
          <ReferenceLine y={avg} stroke="hsl(240,10%,55%)" strokeDasharray="4 4" label={{ value: `Prom: ${avg.toFixed(1)}%`, position: "right", fill: "hsl(240,10%,55%)", fontSize: 10 }} />
          <Line type="monotone" dataKey="ratio" stroke="#F59E0B" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Un ratio alto indica contenido que genera conversación — replicar ese formato.
        <span className="inline-block ml-2"><span className="inline-block w-2 h-2 rounded-full bg-[#34D399] mr-1 align-middle" />{">"} 10%</span>
      </p>
    </div>
  );
}
