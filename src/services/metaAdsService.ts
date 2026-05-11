// Meta Ads API — real-time campaign & account data
// Uses the same access token stored in platform_tokens (ads_read scope)
//
// RATE LIMITS (Marketing API):
//   Standard tier: 300 + (40 × active_ads) calls per rolling hour
//   Tracked via x-business-use-case-usage header (call_count / total_cputime / total_time = % used)
//   Error codes: 17, 80000, 80003, 80004 = rate limit hit

const API = "https://graph.facebook.com/v21.0";

// ── Rate limit tracking ───────────────────────────────────────

interface UsageState {
  callCount: number;     // % of limit used (0-100)
  totalCputime: number;
  totalTime: number;
  blockedUntil: number;  // unix ms, 0 if not blocked
  lastUpdated: number;
}

const _usage: UsageState = {
  callCount: 0, totalCputime: 0, totalTime: 0, blockedUntil: 0, lastUpdated: 0,
};

export function getApiUsage(): UsageState & { pct: number } {
  const pct = Math.max(_usage.callCount, _usage.totalCputime, _usage.totalTime);
  return { ..._usage, pct };
}

function parseUsageHeader(headers: Headers) {
  try {
    // x-business-use-case-usage: {"<biz_id>":[{call_count,total_cputime,total_time,...}]}
    const buc = headers.get("x-business-use-case-usage");
    if (buc) {
      const parsed = JSON.parse(buc);
      const entries: any[] = Object.values(parsed).flat();
      const ads = entries.find((e) => e.type === "ads_management" || e.type === "ads_insights") || entries[0];
      if (ads) {
        _usage.callCount = ads.call_count ?? _usage.callCount;
        _usage.totalCputime = ads.total_cputime ?? _usage.totalCputime;
        _usage.totalTime = ads.total_time ?? _usage.totalTime;
        _usage.blockedUntil = ads.estimated_time_to_regain_access > 0
          ? Date.now() + ads.estimated_time_to_regain_access * 60_000
          : 0;
        _usage.lastUpdated = Date.now();
        return;
      }
    }
    // Fallback: x-app-usage
    const app = headers.get("x-app-usage");
    if (app) {
      const parsed = JSON.parse(app);
      _usage.callCount = parsed.call_count ?? _usage.callCount;
      _usage.totalCputime = parsed.total_cputime ?? _usage.totalCputime;
      _usage.totalTime = parsed.total_time ?? _usage.totalTime;
      _usage.lastUpdated = Date.now();
    }
  } catch {
    // header absent or malformed — ignore
  }
}

/** Throw if we're blocked; warn (log) if approaching limit */
function checkRateLimit() {
  if (_usage.blockedUntil > Date.now()) {
    const mins = Math.ceil((_usage.blockedUntil - Date.now()) / 60_000);
    throw new Error(`Meta API bloqueada por límite de llamadas. Intenta en ~${mins} min.`);
  }
  const pct = Math.max(_usage.callCount, _usage.totalCputime, _usage.totalTime);
  if (pct >= 90) {
    console.warn(`[MetaAds] Uso de API al ${pct}% — reduciendo llamadas`);
  }
}

// ── Core HTTP helper ──────────────────────────────────────────

async function adGet(path: string, token: string): Promise<any> {
  checkRateLimit();
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}access_token=${token}`);
  parseUsageHeader(res.headers);
  const data = await res.json();
  if (data.error) {
    const code = data.error.code;
    // Rate limit error codes (4 = app-level, 17 = user-level, 80xxx = ad account BUC)
    if ([4, 17, 32, 613, 80000, 80003, 80004, 80014].includes(code)) {
      _usage.callCount = 100;
      _usage.blockedUntil = Date.now() + 60 * 60_000; // app-level block = 1h
      const mins = code === 4 ? "60" : "15";
      throw new Error(`Meta API: límite de llamadas alcanzado (código ${code}). Espera ~${mins} min y vuelve a intentar.`);
    }
    throw new Error(`Meta Ads API: ${data.error.message}`);
  }
  return data;
}

function actionValue(actions: any[], type: string): number {
  const a = (actions || []).find((x: any) => x.action_type === type);
  return a ? parseFloat(a.value || "0") : 0;
}

// ── Account-level insights ────────────────────────────────────

export interface AccountInsights {
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  reach: number;
  frequency: number;
  purchases: number;
  addToCart: number;
  initiateCheckout: number;
  viewContent: number;
  cpa: number;
  landingPageViews: number;
  outboundClicks: number;
  outboundCtr: number;
  uniqueClicks: number;
  uniqueCtr: number;
  dateStart: string;
  dateStop: string;
}

export async function fetchAccountInsights(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<AccountInsights> {
  const fields = [
    "spend", "impressions", "clicks", "ctr", "cpm", "cpc",
    "reach", "frequency", "actions", "action_values",
    "outbound_clicks", "outbound_clicks_ctr",
    "unique_clicks", "unique_ctr",
  ].join(",");

  const data = await adGet(
    `/act_${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&level=account`,
    token
  );
  const d = data.data?.[0] || {};
  const actions = d.actions || [];
  const actionValues = d.action_values || [];
  const spend = parseFloat(d.spend || "0");
  const revenue = actionValue(actionValues, "offsite_conversion.fb_pixel_purchase");
  const purchases = actionValue(actions, "offsite_conversion.fb_pixel_purchase");
  const roas = spend > 0 ? revenue / spend : 0;
  const cpa = purchases > 0 ? spend / purchases : 0;

  // outbound_clicks is an array [{action_type, value}]
  const outboundClicks = Array.isArray(d.outbound_clicks)
    ? parseFloat(d.outbound_clicks[0]?.value || "0")
    : 0;
  const outboundCtr = Array.isArray(d.outbound_clicks_ctr)
    ? parseFloat(d.outbound_clicks_ctr[0]?.value || "0")
    : 0;

  return {
    spend,
    revenue,
    roas,
    impressions: parseInt(d.impressions || "0"),
    clicks: parseInt(d.clicks || "0"),
    ctr: parseFloat(d.ctr || "0"),
    cpm: parseFloat(d.cpm || "0"),
    cpc: parseFloat(d.cpc || "0"),
    reach: parseInt(d.reach || "0"),
    frequency: parseFloat(d.frequency || "0"),
    purchases,
    addToCart: actionValue(actions, "offsite_conversion.fb_pixel_add_to_cart"),
    initiateCheckout: actionValue(actions, "offsite_conversion.fb_pixel_initiate_checkout"),
    viewContent: actionValue(actions, "offsite_conversion.fb_pixel_view_content"),
    cpa,
    landingPageViews: actionValue(actions, "landing_page_view"),
    outboundClicks,
    outboundCtr,
    uniqueClicks: parseInt(d.unique_clicks || "0"),
    uniqueCtr: parseFloat(d.unique_ctr || "0"),
    dateStart: d.date_start || "",
    dateStop: d.date_stop || "",
  };
}

// ── Daily breakdown (time series) ─────────────────────────────

export interface DailyMetric {
  date: string;
  spend: number;
  revenue: number;
  purchases: number;
  clicks: number;
  impressions: number;
  roas: number;
  addToCart: number;
}

export async function fetchDailyBreakdown(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<DailyMetric[]> {
  const fields = "spend,impressions,clicks,actions,action_values";
  const data = await adGet(
    `/act_${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&time_increment=1&level=account`,
    token
  );

  return ((data.data || []) as any[])
    .map((d) => {
      const actions = d.actions || [];
      const actionValues = d.action_values || [];
      const spend = parseFloat(d.spend || "0");
      const revenue = actionValue(actionValues, "offsite_conversion.fb_pixel_purchase");
      const purchases = actionValue(actions, "offsite_conversion.fb_pixel_purchase");
      return {
        date: d.date_start as string,
        spend,
        revenue,
        purchases,
        clicks: parseInt(d.clicks || "0"),
        impressions: parseInt(d.impressions || "0"),
        roas: spend > 0 ? revenue / spend : 0,
        addToCart: actionValue(actions, "offsite_conversion.fb_pixel_add_to_cart"),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Campaign list ─────────────────────────────────────────────

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
  addToCart: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpm: number;
  cpa: number;
  outboundClicks: number;
  outboundCtr: number;
  landingPageViews: number;
}

export async function fetchCampaigns(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<CampaignData[]> {
  const insightFields = [
    "spend", "impressions", "clicks", "ctr", "cpm",
    "actions", "action_values",
    "outbound_clicks", "outbound_clicks_ctr",
  ].join(",");
  const fields = `name,status,effective_status,objective,daily_budget,lifetime_budget,insights.date_preset(${datePreset}){${insightFields}}`;

  let url = `/act_${adAccountId}/campaigns?fields=${fields}&limit=30&effective_status=["ACTIVE","PAUSED","CAMPAIGN_PAUSED"]`;
  const campaigns: CampaignData[] = [];

  while (url) {
    const data = await adGet(url, token);
    for (const c of data.data || []) {
      const ins = c.insights?.data?.[0] || {};
      const actions = ins.actions || [];
      const actionValues = ins.action_values || [];
      const spend = parseFloat(ins.spend || "0");
      const revenue = actionValue(actionValues, "offsite_conversion.fb_pixel_purchase");
      const purchases = actionValue(actions, "offsite_conversion.fb_pixel_purchase");
      const outboundClicks = Array.isArray(ins.outbound_clicks)
        ? parseFloat(ins.outbound_clicks[0]?.value || "0") : 0;
      const outboundCtr = Array.isArray(ins.outbound_clicks_ctr)
        ? parseFloat(ins.outbound_clicks_ctr[0]?.value || "0") : 0;
      campaigns.push({
        id: c.id,
        name: c.name,
        status: c.status,
        effectiveStatus: c.effective_status || c.status,
        objective: c.objective || "",
        dailyBudget: c.daily_budget ? parseInt(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : null,
        spend,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        purchases,
        addToCart: actionValue(actions, "offsite_conversion.fb_pixel_add_to_cart"),
        clicks: parseInt(ins.clicks || "0"),
        impressions: parseInt(ins.impressions || "0"),
        ctr: parseFloat(ins.ctr || "0"),
        cpm: parseFloat(ins.cpm || "0"),
        cpa: purchases > 0 ? spend / purchases : 0,
        outboundClicks,
        outboundCtr,
        landingPageViews: actionValue(actions, "landing_page_view"),
      });
    }
    const after = data.paging?.cursors?.after;
    url = after && data.paging?.next
      ? `/act_${adAccountId}/campaigns?fields=${fields}&limit=30&effective_status=["ACTIVE","PAUSED","CAMPAIGN_PAUSED"]&after=${encodeURIComponent(after)}`
      : "";
  }

  return campaigns;
}

// ── Ad Set level ──────────────────────────────────────────────

export type LearningStageStatus = "LEARNING" | "SUCCESS" | "FAIL" | null;

export interface AdSetData {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  campaignName: string;
  optimizationGoal: string;
  learningStage: LearningStageStatus;
  learningConversions: number;
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
  addToCart: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpm: number;
  cpa: number;
  outboundClicks: number;
  landingPageViews: number;
}

export async function fetchAdSets(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<AdSetData[]> {
  const insightFields = [
    "spend", "impressions", "clicks", "ctr", "cpm",
    "actions", "action_values", "outbound_clicks",
  ].join(",");
  const fields = `name,status,effective_status,campaign{name},optimization_goal,learning_stage_info,insights.date_preset(${datePreset}){${insightFields}}`;

  let url = `/act_${adAccountId}/adsets?fields=${fields}&limit=50&effective_status=["ACTIVE","PAUSED","CAMPAIGN_PAUSED"]`;
  const adsets: AdSetData[] = [];

  while (url) {
    const data = await adGet(url, token);
    for (const a of data.data || []) {
      const ins = a.insights?.data?.[0] || {};
      const actions = ins.actions || [];
      const actionValues = ins.action_values || [];
      const spend = parseFloat(ins.spend || "0");
      const revenue = actionValue(actionValues, "offsite_conversion.fb_pixel_purchase");
      const purchases = actionValue(actions, "offsite_conversion.fb_pixel_purchase");
      const outboundClicks = Array.isArray(ins.outbound_clicks)
        ? parseFloat(ins.outbound_clicks[0]?.value || "0") : 0;
      const ls = a.learning_stage_info;
      adsets.push({
        id: a.id,
        name: a.name,
        status: a.status,
        effectiveStatus: a.effective_status || a.status,
        campaignName: a.campaign?.name || "",
        optimizationGoal: a.optimization_goal || "",
        learningStage: ls?.status ?? null,
        learningConversions: ls?.conversions ?? 0,
        spend,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        purchases,
        addToCart: actionValue(actions, "offsite_conversion.fb_pixel_add_to_cart"),
        clicks: parseInt(ins.clicks || "0"),
        impressions: parseInt(ins.impressions || "0"),
        ctr: parseFloat(ins.ctr || "0"),
        cpm: parseFloat(ins.cpm || "0"),
        cpa: purchases > 0 ? spend / purchases : 0,
        outboundClicks,
        landingPageViews: actionValue(actions, "landing_page_view"),
      });
    }
    const after = data.paging?.cursors?.after;
    url = after && data.paging?.next
      ? `/act_${adAccountId}/adsets?fields=${fields}&limit=50&effective_status=["ACTIVE","PAUSED","CAMPAIGN_PAUSED"]&after=${encodeURIComponent(after)}`
      : "";
  }

  return adsets;
}

// ── Ads with creatives ────────────────────────────────────────

export interface AdCreative {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  thumbnailUrl: string;
  imageUrl: string;
  body: string;
  title: string;
  // insights
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  purchases: number;
  roas: number;
  cpa: number;
  qualityRanking: string;
  engagementRateRanking: string;
  conversionRateRanking: string;
  outboundClicks: number;
  landingPageViews: number;
  // video metrics
  videoP25: number;
  videoP50: number;
  videoP75: number;
  videoP100: number;
}

// ── On-demand detail for a single ad (called when user expands a card) ──
export interface AdDetail {
  qualityRanking: string;
  engagementRateRanking: string;
  conversionRateRanking: string;
  outboundClicks: number;
  landingPageViews: number;
  videoP25: number;
  videoP50: number;
  videoP75: number;
  videoP100: number;
}

export async function fetchAdDetail(
  adId: string,
  token: string,
  datePreset = "last_30d"
): Promise<AdDetail> {
  const insightFields = [
    "quality_ranking", "engagement_rate_ranking", "conversion_rate_ranking",
    "outbound_clicks", "actions",
    "video_p25_watched_actions", "video_p50_watched_actions",
    "video_p75_watched_actions", "video_p100_watched_actions",
  ].join(",");
  const fields = `insights.date_preset(${datePreset}){${encodeURIComponent(insightFields)}}`;
  const data = await adGet(`/${adId}?fields=${fields}`, token);
  const ins = data.insights?.data?.[0] || {};
  const actions = ins.actions || [];
  return {
    qualityRanking: ins.quality_ranking || "",
    engagementRateRanking: ins.engagement_rate_ranking || "",
    conversionRateRanking: ins.conversion_rate_ranking || "",
    outboundClicks: Array.isArray(ins.outbound_clicks)
      ? parseFloat(ins.outbound_clicks[0]?.value || "0") : 0,
    landingPageViews: actionValue(actions, "landing_page_view"),
    videoP25: Array.isArray(ins.video_p25_watched_actions)
      ? parseFloat(ins.video_p25_watched_actions[0]?.value || "0") : 0,
    videoP50: Array.isArray(ins.video_p50_watched_actions)
      ? parseFloat(ins.video_p50_watched_actions[0]?.value || "0") : 0,
    videoP75: Array.isArray(ins.video_p75_watched_actions)
      ? parseFloat(ins.video_p75_watched_actions[0]?.value || "0") : 0,
    videoP100: Array.isArray(ins.video_p100_watched_actions)
      ? parseFloat(ins.video_p100_watched_actions[0]?.value || "0") : 0,
  };
}

export async function fetchAdsWithCreatives(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<AdCreative[]> {
  // Lean fields only — heavy metrics (quality_ranking, video_*) loaded on-demand per ad
  const insightFields = [
    "spend", "impressions", "clicks", "ctr", "cpm",
    "actions", "action_values",
  ].join(",");

  // Only fetch ACTIVE and PAUSED ads (not DELETED/ARCHIVED)
  const effectiveStatuses = encodeURIComponent(JSON.stringify(["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"]));
  const fields = `name,status,effective_status,adset_id,campaign_id,adset%7Bname%7D,campaign%7Bname%7D,creative%7Bthumbnail_url,image_url,body,title%7D,insights.date_preset(${datePreset})%7B${encodeURIComponent(insightFields)}%7D`;

  let url = `/act_${adAccountId}/ads?fields=${fields}&limit=30&effective_status=${effectiveStatuses}`;
  const ads: AdCreative[] = [];

  while (url) {
    const data = await adGet(url, token);
    for (const a of data.data || []) {
      const ins = a.insights?.data?.[0] || {};
      const actions = ins.actions || [];
      const actionValues = ins.action_values || [];
      const spend = parseFloat(ins.spend || "0");
      const revenue = actionValue(actionValues, "offsite_conversion.fb_pixel_purchase");
      const purchases = actionValue(actions, "offsite_conversion.fb_pixel_purchase");
      const c = a.creative || {};

      ads.push({
        id: a.id,
        name: a.name,
        status: a.status,
        effectiveStatus: a.effective_status || a.status,
        campaignId: a.campaign_id || "",
        campaignName: a.campaign?.name || "",
        adsetId: a.adset_id || "",
        adsetName: a.adset?.name || "",
        thumbnailUrl: c.thumbnail_url || "",
        imageUrl: c.image_url || "",
        body: c.body || "",
        title: c.title || "",
        spend,
        impressions: parseInt(ins.impressions || "0"),
        clicks: parseInt(ins.clicks || "0"),
        ctr: parseFloat(ins.ctr || "0"),
        cpm: parseFloat(ins.cpm || "0"),
        purchases,
        roas: spend > 0 ? revenue / spend : 0,
        cpa: purchases > 0 ? spend / purchases : 0,
        // Detail fields — loaded on-demand via fetchAdDetail() when user expands
        qualityRanking: "",
        engagementRateRanking: "",
        conversionRateRanking: "",
        outboundClicks: 0,
        landingPageViews: 0,
        videoP25: 0,
        videoP50: 0,
        videoP75: 0,
        videoP100: 0,
      });
    }
    const after = data.paging?.cursors?.after;
    url = after && data.paging?.next
      ? `/act_${adAccountId}/ads?fields=${fields}&limit=30&effective_status=${effectiveStatuses}&after=${encodeURIComponent(after)}`
      : "";
  }

  return ads;
}

// ── Date presets ──────────────────────────────────────────────

export type DatePreset =
  | "today" | "yesterday" | "last_7d" | "last_14d"
  | "last_30d" | "last_90d" | "this_month" | "last_month";

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "last_7d", label: "7 días" },
  { key: "last_14d", label: "14 días" },
  { key: "last_30d", label: "30 días" },
  { key: "last_90d", label: "90 días" },
  { key: "this_month", label: "Este mes" },
  { key: "last_month", label: "Mes anterior" },
];
