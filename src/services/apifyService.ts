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

export async function scrapeInstagramPosts(
  urls: string[],
  apiKey: string
): Promise<ApifyInstagramPost[]> {
  // 1. Start the run
  const startRes = await fetch(
    `${APIFY_BASE}/acts/apify~instagram-post-scraper/runs?token=${apiKey}&memory=2048`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: urls,
        resultsType: "posts",
        resultsLimit: 50,
      }),
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

  // 2. Poll for completion
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
      // 3. Fetch results
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
