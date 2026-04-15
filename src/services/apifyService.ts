import { supabase } from "@/integrations/supabase/client";

export interface ApifyInstagramPost {
  id: string;
  type: 'Image' | 'Video' | 'Sidecar';
  shortCode: string;
  caption: string | null;
  hashtags: string[];
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  ownerUsername: string;
  ownerFullName: string;
  isVideo: boolean;
  videoUrl: string | null;
  displayUrl: string;
  videoViewCount: number | null;
  locationName: string | null;
}

export interface ImportResult {
  videosAdded: number;
  eventsAdded: number;
  postsImported: ApifyInstagramPost[];
  errors: string[];
}

const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;
const DIRECT_POST_PATTERN = /\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
const DIRECT_SEGMENTS = new Set(["p", "reel", "reels", "tv"]);

interface ClassifiedInput {
  directUrls: string[];
  usernames: string[];
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeInstagramUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return value.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

function extractShortCode(value: string) {
  return value.match(DIRECT_POST_PATTERN)?.[2] ?? null;
}

function extractUsernameFromInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (USERNAME_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length === 0) return null;
    if (DIRECT_SEGMENTS.has(segments[0].toLowerCase())) return null;

    if (segments.length === 1) {
      return USERNAME_PATTERN.test(segments[0]) ? segments[0] : null;
    }

    if (DIRECT_SEGMENTS.has(segments[1].toLowerCase())) {
      return USERNAME_PATTERN.test(segments[0]) ? segments[0] : null;
    }

    return USERNAME_PATTERN.test(segments[0]) ? segments[0] : null;
  } catch {
    return null;
  }
}

function detectInputType(inputs: string[]): ClassifiedInput {
  const directUrls: string[] = [];
  const usernames: string[] = [];

  for (const input of inputs) {
    const trimmed = input.trim();
    if (!trimmed) continue;

    if (DIRECT_POST_PATTERN.test(trimmed)) {
      directUrls.push(trimmed);
      continue;
    }

    const username = extractUsernameFromInput(trimmed);

    if (username) {
      usernames.push(username);
    } else {
      directUrls.push(trimmed);
    }
  }

  return {
    directUrls: uniqueValues(directUrls),
    usernames: uniqueValues(usernames),
  };
}

function buildScraperBody(directUrls: string[], usernames: string[]) {
  return {
    directUrls: uniqueValues(directUrls),
    username: uniqueValues([
      ...usernames,
      ...directUrls
        .map((url) => extractUsernameFromInput(url))
        .filter((value): value is string => Boolean(value)),
    ]),
    resultsType: "posts",
    resultsLimit: 50,
  };
}

// Call the edge function proxy instead of Apify directly
async function callProxy(body: Record<string, any>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("apify-proxy", {
    body,
  });
  if (error) {
    throw new Error(error.message || "Error en proxy de Apify");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

function mapItemToPost(item: any): ApifyInstagramPost {
  return {
    id: item.id || item.shortCode || `post_${Date.now()}_${Math.random()}`,
    type: item.type || (item.isVideo ? "Video" : "Image"),
    shortCode: item.shortCode || "",
    caption: item.caption || null,
    hashtags: item.hashtags || [],
    url: item.url || "",
    commentsCount: item.commentsCount || 0,
    likesCount: item.likesCount || 0,
    timestamp: item.timestamp || new Date().toISOString(),
    ownerUsername: item.ownerUsername || "",
    ownerFullName: item.ownerFullName || "",
    isVideo: item.isVideo || false,
    videoUrl: item.videoUrl || null,
    displayUrl: item.displayUrl || "",
    videoViewCount: item.videoViewCount || null,
    locationName: item.locationName || null,
  };
}

async function runScraper(
  body: Record<string, any>
): Promise<ApifyInstagramPost[]> {
  const startData = await callProxy({ action: "start", scraperBody: body });

  const runId = startData.data?.id;
  const datasetId = startData.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error("No se pudo obtener el ID del run. Verifica la configuración.");
  }

  const MAX_ATTEMPTS = 40;
  const POLL_INTERVAL = 3000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const pollData = await callProxy({ action: "poll", runId });
    const status = pollData.data?.status;

    if (status === "SUCCEEDED") {
      const items = await callProxy({ action: "results", datasetId });
      const arr = Array.isArray(items) ? items : [];
      return arr.map(mapItemToPost);
    }

    if (status === "FAILED" || status === "ABORTED") {
      throw new Error(`El scraper falló con estado: ${status}`);
    }
  }

  throw new Error("Timeout: el scraper tardó más de 120 segundos. Intenta con menos URLs.");
}

async function scrapeDirectUrls(
  directUrls: string[]
): Promise<ApifyInstagramPost[]> {
  try {
    return await runScraper(buildScraperBody(directUrls, []));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/input\.username is required/i.test(message)) {
      throw error;
    }

    const usernames = uniqueValues(
      directUrls
        .map((url) => extractUsernameFromInput(url))
        .filter((value): value is string => Boolean(value))
    );

    if (usernames.length === 0) {
      throw error;
    }

    const requestedShortCodes = new Set(
      directUrls
        .map((url) => extractShortCode(url))
        .filter((value): value is string => Boolean(value))
    );

    const fallbackResults = await runScraper(buildScraperBody([], usernames));
    const matchedResults = fallbackResults.filter((item) =>
      requestedShortCodes.has(item.shortCode)
    );

    return matchedResults.length > 0 ? matchedResults : fallbackResults;
  }
}

export async function scrapeInstagramPosts(
  urls: string[]
): Promise<ApifyInstagramPost[]> {
  const { directUrls, usernames } = detectInputType(urls);

  const promises: Promise<ApifyInstagramPost[]>[] = [];

  if (directUrls.length > 0) {
    promises.push(scrapeDirectUrls(directUrls));
  }

  if (usernames.length > 0) {
    promises.push(runScraper(buildScraperBody([], usernames)));
  }

  if (promises.length === 0) {
    throw new Error("No se detectaron URLs ni usernames válidos.");
  }

  const results = await Promise.all(promises);
  const uniquePosts = new Map<string, ApifyInstagramPost>();

  for (const post of results.flat()) {
    const key = post.id || post.shortCode || normalizeInstagramUrl(post.url) || `${post.ownerUsername}-${post.timestamp}`;
    if (!uniquePosts.has(key)) {
      uniquePosts.set(key, post);
    }
  }

  return Array.from(uniquePosts.values());
}
