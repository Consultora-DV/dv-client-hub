import { useMemo } from "react";
import { PostMetric, formatNumber } from "@/services/metricsParser";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SLOTS = [
  { label: "Madrugada", range: "00–06h" },
  { label: "Mañana", range: "06–12h" },
  { label: "Tarde", range: "12–18h" },
  { label: "Noche", range: "18–24h" },
];

function getSlot(hour: number) {
  if (hour < 6) return 0;
  if (hour < 12) return 1;
  if (hour < 18) return 2;
  return 3;
}

function getDayIndex(dateStr: string): number {
  // Parse YYYY-MM-DD or "YYYY-MM-DD HH:MM"
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return -1;
  const day = d.getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1; // convert to Mon=0
}

function getHour(dateStr: string): number {
  const parts = dateStr.split(" ");
  if (parts.length >= 2) {
    const timeParts = parts[1].split(":");
    return parseInt(timeParts[0]) || 0;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? -1 : d.getHours();
}

interface Props {
  posts: PostMetric[];
  accent: string;
}

export default function HeatMap({ posts, accent }: Props) {
  const { grid, maxAvg } = useMemo(() => {
    // grid[slot][day] = { totalViews, count }
    const g: { totalViews: number; count: number }[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 7 }, () => ({ totalViews: 0, count: 0 }))
    );

    for (const p of posts) {
      const dayIdx = getDayIndex(p.date);
      const hour = getHour(p.date);
      if (dayIdx < 0 || hour < 0) continue;
      const slot = getSlot(hour);
      g[slot][dayIdx].totalViews += p.views;
      g[slot][dayIdx].count += 1;
    }

    let max = 0;
    for (const row of g) {
      for (const cell of row) {
        const avg = cell.count > 0 ? cell.totalViews / cell.count : 0;
        if (avg > max) max = avg;
      }
    }

    return { grid: g, maxAvg: max };
  }, [posts]);

  const hasPosts = posts.some((p) => getDayIndex(p.date) >= 0);
  if (!hasPosts) {
    return (
      <div className="glass gold-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Mejor Momento para Publicar</h3>
        <p className="text-xs text-muted-foreground mt-2">No hay datos de fechas/horas suficientes.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="glass gold-border rounded-xl p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Mejor Momento para Publicar</h3>
          <p className="text-[10px] text-muted-foreground">Basado en el rendimiento histórico de tus publicaciones</p>
        </div>

        {/* Header row */}
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              <div />
              {DAYS.map((d) => (
                <div key={d} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>
              ))}
            </div>

            {SLOTS.map((slot, si) => (
              <div key={slot.label} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
                <div className="text-[10px] text-muted-foreground flex items-center">{slot.label}</div>
                {DAYS.map((_, di) => {
                  const cell = grid[si][di];
                  const avg = cell.count > 0 ? cell.totalViews / cell.count : 0;
                  const intensity = maxAvg > 0 ? avg / maxAvg : 0;
                  const opacity = cell.count === 0 ? 0 : Math.max(0.15, intensity);

                  return (
                    <Tooltip key={di}>
                      <TooltipTrigger asChild>
                        <div
                          className="aspect-square rounded-md flex items-center justify-center cursor-default transition-colors"
                          style={{
                            backgroundColor: cell.count === 0
                              ? "hsl(240,15%,15%)"
                              : accent,
                            opacity: cell.count === 0 ? 0.3 : opacity,
                          }}
                        >
                          {cell.count > 0 && (
                            <span className="text-[9px] font-bold text-white mix-blend-difference">
                              {formatNumber(Math.round(avg))}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {cell.count === 0
                          ? "Sin publicaciones"
                          : `${cell.count} posts · Promedio: ${formatNumber(Math.round(avg))} views`}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <span>Menos vistas</span>
          <div className="flex gap-0.5">
            {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
              <div key={o} className="w-4 h-3 rounded-sm" style={{ backgroundColor: accent, opacity: o }} />
            ))}
          </div>
          <span>Más vistas</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
