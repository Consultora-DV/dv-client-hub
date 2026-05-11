// Meta Ads Supabase cache service
// Stores API responses in meta_ads_cache table to avoid rate limits.
// All TTLs are in minutes.

import { supabase } from "@/integrations/supabase/client";

// ── TTL map (minutes) ─────────────────────────────────────────
export const CACHE_TTL: Record<string, number> = {
  insights:   45,    // account-level aggregates  → 45 min
  daily:     240,    // daily breakdown            → 4 h
  campaigns:  90,    // campaign list              → 90 min
  adsets:     90,    // ad set list                → 90 min
  creatives: 360,    // ads + creatives list       → 6 h
  ad_detail: 720,    // per-ad quality/video data  → 12 h
};

export interface CacheEntry<T = any> {
  data: T;
  fetchedAt: number;   // unix ms
  ageMin: number;      // minutes since fetch
  stale: boolean;
}

/** Build a canonical cache key */
export function cacheKey(type: string, datePreset: string, extra = ""): string {
  return extra ? `${type}_${datePreset}_${extra}` : `${type}_${datePreset}`;
}

/** Return cached data if it exists and is fresh, or null */
export async function getCached<T>(
  clienteId: string,
  key: string,
  ttlMinutes: number
): Promise<CacheEntry<T> | null> {
  const { data, error } = await supabase
    .from("meta_ads_cache")
    .select("data, fetched_at")
    .eq("cliente_id", clienteId)
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data) return null;

  const fetchedAt = new Date(data.fetched_at).getTime();
  const ageMs = Date.now() - fetchedAt;
  const ageMin = ageMs / 60_000;
  const stale = ageMin > ttlMinutes;

  return { data: data.data as T, fetchedAt, ageMin, stale };
}

/** Write (upsert) cache entry */
export async function setCached<T>(
  clienteId: string,
  key: string,
  datePreset: string,
  value: T
): Promise<void> {
  const { error } = await supabase
    .from("meta_ads_cache")
    .upsert(
      {
        cliente_id:  clienteId,
        cache_key:   key,
        date_preset: datePreset,
        data:        value as any,
        fetched_at:  new Date().toISOString(),
      },
      { onConflict: "cliente_id,cache_key" }
    );
  if (error) console.error("[MetaCache] write error:", error);
}

/** Delete all cache entries for a client (force full refresh) */
export async function clearCache(clienteId: string): Promise<void> {
  const { error } = await supabase
    .from("meta_ads_cache")
    .delete()
    .eq("cliente_id", clienteId);
  if (error) console.error("[MetaCache] clear error:", error);
}

/** Get age (minutes) of the oldest relevant cache entry for a client.
 *  Returns null if no cache at all.  Used to show the "datos de hace X" badge. */
export async function getCacheAge(clienteId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("meta_ads_cache")
    .select("fetched_at")
    .eq("cliente_id", clienteId)
    .order("fetched_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const ms = Date.now() - new Date(data.fetched_at).getTime();
  return Math.round(ms / 60_000);
}

/** Describe cache age in human-readable Spanish */
export function fmtCacheAge(minutes: number | null): string {
  if (minutes === null) return "";
  if (minutes < 1) return "Datos al instante";
  if (minutes < 60) return `Datos de hace ${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `Datos de hace ${h}h ${m}min` : `Datos de hace ${h}h`;
}
