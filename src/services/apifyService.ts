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

const APIFY_BASE = "https://api.apify.com/v2";
const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;
const DIRECT_POST_PATTERN = /\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
const DIRECT_SEGMENTS = new Set(["p", "reel", "reels", "tv"]);

type InputType = "directUrl" | "username";

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

function shouldFallbackToProfileScrape(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /input\.username is required/i.test(message);
}

async function runScraper(
  body: Record<string, any>,
  apiKey: string
): Promise<ApifyInstagramPost[]> {
  const startRes = await fetch(
    `${APIFY_BASE}/acts/apify~instagram-post-scraper/runs?token=${apiKey}&memory=2048`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Error al iniciar el scraper: ${startRes.status} — ${err}`);
  }

  const startData = await startRes.json();
  const runId = startData.data?.id;
  const datasetId = startData.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error("No se pudo obtener el ID del run. Verifica tu API key.");
  }

  const MAX_ATTEMPTS = 40;
  const POLL_INTERVAL = 3000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const pollRes = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${apiKey}`
    );

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const status = pollData.data?.status;

    if (status === "SUCCEEDED") {
      const dataRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${apiKey}&clean=true&format=json`
      );

      if (!dataRes.ok) {
        throw new Error("Error al obtener los resultados del dataset.");
      }

      const items = await dataRes.json();
      return items.map((item: any) => ({
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
      }));
    }

    if (status === "FAILED" || status === "ABORTED") {
      throw new Error(`El scraper falló con estado: ${status}`);
    }
  }

  throw new Error("Timeout: el scraper tardó más de 120 segundos. Intenta con menos URLs.");
}

async function scrapeDirectUrls(
  directUrls: string[],
  apiKey: string
): Promise<ApifyInstagramPost[]> {
  try {
    return await runScraper(buildScraperBody(directUrls, []), apiKey);
  } catch (error) {
    if (!shouldFallbackToProfileScrape(error)) {
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

    const requestedUrls = new Set(directUrls.map(normalizeInstagramUrl));
    const requestedShortCodes = new Set(
      directUrls
        .map((url) => extractShortCode(url))
        .filter((value): value is string => Boolean(value))
    );

    const fallbackResults = await runScraper(buildScraperBody([], usernames), apiKey);
    const matchedResults = fallbackResults.filter((item) => {
      return (
        requestedShortCodes.has(item.shortCode) ||
        requestedUrls.has(normalizeInstagramUrl(item.url))
      );
    });

    return matchedResults.length > 0 ? matchedResults : fallbackResults;
  }
}

export async function scrapeInstagramPosts(
  urls: string[],
  apiKey: string
): Promise<ApifyInstagramPost[]> {
  const { directUrls, usernames } = detectInputType(urls);

  const promises: Promise<ApifyInstagramPost[]>[] = [];

  if (directUrls.length > 0) {
    promises.push(scrapeDirectUrls(directUrls, apiKey));
  }

  if (usernames.length > 0) {
    promises.push(runScraper(buildScraperBody([], usernames), apiKey));
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
