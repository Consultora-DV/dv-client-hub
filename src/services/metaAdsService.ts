// Meta Ads API — real-time campaign & account data
// Uses the same access token stored in platform_tokens (ads_read scope)

const API = "https://graph.facebook.com/v21.0";

async function adGet(path: string, token: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new Error(`Meta Ads API: ${data.error.message}`);
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
  dateStart: string;
  dateStop: string;
}

export async function fetchAccountInsights(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<AccountInsights> {
  const fields = "spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions,action_values";
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
    dateStart: d.date_start || "",
    dateStop: d.date_stop || "",
  };
}

// ── Campaign list with per-campaign insights ──────────────────

export interface CampaignData {
  id: string;
  name: string;
  status: string;
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
}

export async function fetchCampaigns(
  adAccountId: string,
  token: string,
  datePreset = "last_30d"
): Promise<CampaignData[]> {
  const insightFields = "spend,impressions,clicks,ctr,cpm,actions,action_values";
  const fields = `name,status,objective,daily_budget,lifetime_budget,insights.date_preset(${datePreset}){${insightFields}}`;

  let url = `/act_${adAccountId}/campaigns?fields=${fields}&limit=30`;
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
      campaigns.push({
        id: c.id,
        name: c.name,
        status: c.status,
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
      });
    }
    const after = data.paging?.cursors?.after;
    url = after && data.paging?.next
      ? `/act_${adAccountId}/campaigns?fields=${fields}&limit=30&after=${encodeURIComponent(after)}`
      : "";
  }

  return campaigns;
}

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
