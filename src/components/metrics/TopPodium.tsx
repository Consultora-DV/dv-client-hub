import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PostMetric, formatNumber, formatWatchTime } from "@/services/metricsParser";
import PostLink from "./PostLink";

interface TopPodiumProps {
  posts: PostMetric[];
  platform: "instagram" | "tiktok" | "youtube" | "facebook";
}

const MEDALS = ["🥇", "🥈", "🥉"];
const ORDER = [1, 0, 2]; // display: 2nd, 1st, 3rd

export default function TopPodium({ posts, platform }: TopPodiumProps) {
  const top = [...posts].sort((a, b) => b.views - a.views).slice(0, 3);
  const scrollRef = useRef<HTMLDivElement>(null);
  if (top.length === 0) return null;

  const heights = ["h-[220px]", "h-[260px]", "h-[200px]"];
  const scales = ["scale-95", "scale-100", "scale-90"];

  const displayOrder = ORDER.filter((i) => i < top.length);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  return (
    <div className="glass gold-border rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">🏆 Top Posts</h3>

      {/* Desktop podium */}
      <div className="hidden md:flex items-end justify-center gap-4">
        {displayOrder.map((rank) => {
          const post = top[rank];
          return (
            <PostLink key={post.id} url={post.url} className={`block ${scales[rank]} transition-transform hover:scale-[1.02] no-underline hover:no-underline`}>
              <PodiumCard post={post} rank={rank} height={heights[rank]} width="w-[200px] lg:w-[240px]" platform={platform} />
            </PostLink>
          );
        })}
      </div>

      {/* Mobile carousel */}
      <div className="md:hidden relative">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1">
          {top.map((post, idx) => (
            <PostLink key={post.id} url={post.url} className="snap-center shrink-0 no-underline hover:no-underline">
              <PodiumCard post={post} rank={idx} height="h-[240px]" width="w-[75vw] max-w-[280px]" platform={platform} />
            </PostLink>
          ))}
        </div>
        {top.length > 1 && (
          <div className="flex justify-center gap-2 mt-2">
            <button onClick={() => scroll(-1)} className="p-1.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => scroll(1)} className="p-1.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ post, rank, height, width, platform }: {
  post: PostMetric;
  rank: number;
  height: string;
  width: string;
  platform: string;
}) {
  return (
    <div className={`relative ${height} ${width} rounded-xl overflow-hidden group`}>
      {post.thumbnail ? (
        <img
          src={post.thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="absolute inset-0 bg-secondary" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div className="relative h-full flex flex-col justify-between p-3">
        <div className="flex items-start justify-between">
          <span className="text-2xl">{MEDALS[rank]}</span>
          <span className="text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            {post.type || "POST"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-white font-bold text-sm leading-tight line-clamp-2">
            {(post.title || "Sin título").slice(0, 50)}
          </p>
          <p className="text-white/60 text-[10px]">{post.date?.slice(0, 10)}</p>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
              👁 {formatNumber(post.views)}
            </span>
            <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
              ❤️ {formatNumber(post.likes)}
            </span>
            <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
              💬 {formatNumber(post.comments)}
            </span>
            {platform === "tiktok" && post.avgTimeWatched != null && (
              <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
                ⏱ {formatWatchTime(post.avgTimeWatched)}
              </span>
            )}
            {platform === "instagram" && post.saved != null && (
              <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
                🔖 {formatNumber(post.saved)}
              </span>
            )}
          </div>

          <div className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Ver post ↗
          </div>
        </div>
      </div>
    </div>
  );
}
