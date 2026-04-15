import PostLink from "./PostLink";
import { PostMetric, formatNumber, formatEngagement } from "@/services/metricsParser";

interface MetricTooltipProps {
  active?: boolean;
  payload?: any[];
  postMap?: Map<string, PostMetric>;
  valueLabel?: string;
  valueFormatter?: (v: number) => string;
}

export default function MetricTooltip({ active, payload, postMap, valueLabel = "Views", valueFormatter = formatNumber }: MetricTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const post = postMap?.get(data.postId || data.id || "");

  return (
    <div className="bg-[hsl(240,20%,12%)] border border-border/40 rounded-lg p-3 shadow-xl max-w-[260px]">
      {post && (
        <div className="flex gap-2 mb-2">
          {post.thumbnail && (
            <img
              src={post.thumbnail}
              alt=""
              className="w-[60px] h-[60px] object-cover rounded flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0">
            <p className="text-xs text-foreground font-medium truncate">{(post.title || "Sin título").slice(0, 40)}</p>
            <p className="text-[10px] text-muted-foreground">{post.date?.slice(0, 10)}</p>
          </div>
        </div>
      )}
      <p className="text-xs text-foreground">
        <span className="text-muted-foreground">{valueLabel}: </span>
        <span className="font-semibold">{valueFormatter(payload[0]?.value ?? 0)}</span>
      </p>
      {post?.url && (
        <PostLink url={post.url} className="text-[10px] text-primary mt-1 block">
          Ver post ↗
        </PostLink>
      )}
    </div>
  );
}
