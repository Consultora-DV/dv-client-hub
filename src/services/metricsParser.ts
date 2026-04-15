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

export interface MonthlySnapshot {
  id: string;
  clienteId: string;
  platform: string;
  period: string; // "Ene 2026", "Feb 2026", etc.
  month: string; // "2026-01" for sorting
  followers: number;
  growthPct: number;
  totalInteractions: number;
  reach: number;
  postsPublished: number;
  impressions?: number;
  profileVisits?: number;
  notes?: string;
  capturedAt: string;
  sourceFile?: string;
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

export async function parseMetricsPDF(file: File, forcePlatform?: "instagram" | "tiktok" | "youtube" | "facebook"): Promise<{ platform: string; posts: PostMetric[] }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  if (fullText.trim().length < 20) {
    throw new Error("No se pudo extraer texto del PDF. Es posible que sea un PDF basado en imagen. Usa el visor de PDF en la pestaña General para capturar datos manualmente.");
  }

  // Try to detect platform from text
  const textLower = fullText.toLowerCase();
  let platform: string = forcePlatform || "instagram";
  if (!forcePlatform) {
    if (textLower.includes("tiktok")) platform = "tiktok";
    else if (textLower.includes("youtube")) platform = "youtube";
    else if (textLower.includes("facebook")) platform = "facebook";
    else if (textLower.includes("instagram") || textLower.includes("reels")) platform = "instagram";
  }

  // Try to extract tabular data from text lines
  const lines = fullText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const posts: PostMetric[] = [];

  // Strategy: look for lines with numbers that could be metrics rows
  // Common PDF report formats have rows like: "Title  Date  Views  Likes  Comments"
  const numberPattern = /[\d,.]+/g;

  for (const line of lines) {
    const numbers = line.match(numberPattern);
    if (!numbers || numbers.length < 3) continue;

    // Try to extract a URL
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
    // Try to extract a date
    const dateMatch = line.match(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);

    // Heuristic: if line has at least 3 numbers and optionally a URL/date, treat as a post row
    const numericValues = numbers.map(n => parseFloat(n.replace(/,/g, ""))).filter(n => !isNaN(n));
    if (numericValues.length < 3) continue;

    // Extract title: text before the first number
    const firstNumIndex = line.search(/\d/);
    const titleCandidate = firstNumIndex > 0 ? line.slice(0, firstNumIndex).trim() : "";
    if (titleCandidate.length < 2 && !urlMatch) continue;

    const postId = `pdf_${posts.length}_${Date.now()}`;
    const dateStr = dateMatch ? dateMatch[1].replace(/\//g, "-") : new Date().toISOString().slice(0, 10);

    posts.push({
      id: postId,
      url: urlMatch ? urlMatch[1] : "",
      thumbnail: "",
      title: titleCandidate || `Post ${posts.length + 1}`,
      date: dateStr,
      type: platform === "instagram" ? "REEL" : "VIDEO",
      views: numericValues[0] || 0,
      likes: numericValues[1] || 0,
      comments: numericValues[2] || 0,
      shares: numericValues[3] || 0,
      reach: numericValues[4] || 0,
      engagement: numericValues.length > 5 ? numericValues[5] : 0,
    });
  }

  if (posts.length === 0) {
    throw new Error(
      `No se pudieron extraer posts del PDF automáticamente. El texto fue extraído (${fullText.length} caracteres) pero no se encontró un formato tabular reconocible. Usa el visor de PDF en la pestaña General para capturar datos manualmente.`
    );
  }

  return { platform, posts };
}
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
