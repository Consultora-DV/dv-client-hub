export interface PostMetric {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  date: string;
  type: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagement: number;
  saved?: number;
  reposts?: number;
  avgWatchTime?: number;
  videoViewTotalTime?: number;
  viewRate3sec?: number;
  duration?: number;
  fullVideoWatchedRate?: number;
  avgTimeWatched?: number;
  forYouPct?: number;
  followPct?: number;
  searchPct?: number;
  hashtagPct?: number;
}

export interface MonthlyMetric {
  month: string;
  label: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagement: number;
  postCount: number;
  topPost: PostMetric | null;
}

export interface PlatformMetrics {
  clienteId: string;
  platform: string;
  uploadedAt: string;
  fileName: string;
  posts: PostMetric[];
  monthlySummary: MonthlyMetric[];
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function num(val: string | undefined): number {
  if (!val) return 0;
  const clean = val.replace(/"/g, "").replace(/,/g, "").trim();
  if (clean === "" || clean === "-") return 0;
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function str(val: string | undefined): string {
  return (val || "").replace(/^"|"$/g, "").trim();
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === separator && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function detectSeparator(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  if (semicolons >= commas && semicolons >= tabs) return ";";
  if (tabs >= commas) return "\t";
  return ",";
}

export function calculateMonthlySummary(posts: PostMetric[]): MonthlyMetric[] {
  const groups: Record<string, PostMetric[]> = {};
  for (const p of posts) {
    const d = p.date.slice(0, 7); // YYYY-MM
    if (!groups[d]) groups[d] = [];
    groups[d].push(p);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthPosts]) => {
      const [y, m] = month.split("-");
      const shortYear = y.slice(2);
      return {
        month,
        label: `${MONTH_LABELS[m] || m} ${shortYear}`,
        totalViews: monthPosts.reduce((s, p) => s + p.views, 0),
        totalLikes: monthPosts.reduce((s, p) => s + p.likes, 0),
        totalComments: monthPosts.reduce((s, p) => s + p.comments, 0),
        totalShares: monthPosts.reduce((s, p) => s + p.shares, 0),
        avgEngagement: monthPosts.length > 0
          ? monthPosts.reduce((s, p) => s + p.engagement, 0) / monthPosts.length
          : 0,
        postCount: monthPosts.length,
        topPost: monthPosts.reduce<PostMetric | null>((top, p) =>
          !top || p.views > top.views ? p : top, null),
      };
    });
}

export async function parseMetricsCSV(file: File): Promise<{ platform: "instagram" | "tiktok"; posts: PostMetric[] }> {
  const text = await file.text();
  const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("Archivo vacío o sin datos");

  const separator = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], separator).map((h) => str(h));

  // Auto-detect platform
  const headerJoined = headers.join(" ").toLowerCase();
  let platform: "instagram" | "tiktok";

  if (headerJoined.includes("views (organic)") || headerJoined.includes("reach (organic)") || headerJoined.includes("saved (organic)")) {
    platform = "instagram";
  } else if (headerJoined.includes("for you") || headerJoined.includes("full video watched rate") || headerJoined.includes("avg. time watched")) {
    platform = "tiktok";
  } else {
    throw new Error("No se pudo detectar la plataforma. Verifica que el CSV tenga las columnas correctas.");
  }

  const col = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const posts: PostMetric[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i], separator);
    const get = (name: string) => {
      const idx = col(name);
      return idx >= 0 ? vals[idx] : undefined;
    };

    const url = str(get("URL") || get("url") || "");
    if (!url) continue;

    if (platform === "instagram") {
      posts.push({
        id: str(get("Id") || get("id") || `ig_${i}`),
        url,
        thumbnail: str(get("image") || get("Image") || ""),
        title: str(get("title") || get("Title") || ""),
        date: str(get("date") || get("Date") || ""),
        type: "REEL",
        views: num(get("Views (organic)") || get("Views (Organic)")),
        reach: num(get("Reach (Organic)") || get("Reach (organic)")),
        likes: num(get("Likes (Organic)") || get("Likes (organic)")),
        saved: num(get("Saved (Organic)") || get("Saved (organic)")),
        comments: num(get("Comments (Organic)") || get("Comments (organic)")),
        shares: num(get("Shares (Organic)") || get("Shares (organic)")),
        engagement: num(get("Engagement (Organic)") || get("Engagement (organic)")),
        avgWatchTime: num(get("Avg Watch Time (Organic)") || get("Avg Watch Time (organic)")),
        videoViewTotalTime: num(get("Video View Total Time (Organic)") || get("Video View Total Time (organic)")),
        viewRate3sec: num(get("% View rate (+3 secs)") || get("% view rate (+3 secs)")),
        reposts: num(get("Reposts") || get("reposts")),
      });
    } else {
      // TikTok
      const tiktokUrl = str(get("URL") || get("url") || "");
      const idMatch = tiktokUrl.match(/\/(\d+)\/?$/);
      posts.push({
        id: idMatch ? idMatch[1] : `tt_${i}`,
        url: tiktokUrl,
        thumbnail: str(get("Image") || get("image") || ""),
        title: str(get("Title") || get("title") || ""),
        date: str(get("Date") || get("date") || ""),
        type: str(get("Type") || get("type") || "VIDEO"),
        views: num(get("Views") || get("views")),
        likes: num(get("Likes") || get("likes")),
        comments: num(get("Comments") || get("comments")),
        shares: num(get("Shares") || get("shares")),
        reach: num(get("Reach") || get("reach")),
        engagement: num(get("Engagement") || get("engagement")),
        duration: num(get("Duration") || get("duration")),
        fullVideoWatchedRate: num(get("Full video watched rate")),
        videoViewTotalTime: num(get("Total time watched seconds")),
        avgTimeWatched: num(get("Avg. time watched seconds")),
        forYouPct: num(get("For You") || get("For you")),
        followPct: num(get("Follow") || get("follow")),
        hashtagPct: num(get("Hashtag") || get("hashtag")),
        searchPct: num(get("Search") || get("search")),
      });
    }
  }

  return { platform, posts };
}

// Format helpers
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-MX");
}

export function formatEngagement(n: number): string {
  return `${n.toFixed(2)}%`;
}

export function formatWatchTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `${seconds.toFixed(1)}s`;
}
