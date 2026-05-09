import { supabase } from "@/integrations/supabase/client";

export interface MetaSyncResult {
  synced: number;
  refreshed: number;
  errors: number;
  total: number;
  message: string;
}

export interface IgTokenConfig {
  clienteId: string;
  igUserId: string;
  accessToken: string;
  limit?: number;
}

/**
 * Triggers a sync of Instagram posts/metrics for a given client
 * via the meta-ig-sync Supabase Edge Function.
 */
export async function syncInstagramPosts(config: IgTokenConfig): Promise<MetaSyncResult> {
  const { data, error } = await supabase.functions.invoke("meta-ig-sync", {
    body: {
      clienteId: config.clienteId,
      igUserId: config.igUserId,
      accessToken: config.accessToken,
      limit: config.limit ?? 50,
    },
  });

  if (error) {
    throw new Error(error.message || "Error al sincronizar con Meta");
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as MetaSyncResult;
}

/**
 * Saves IG token config for a client in the platform_tokens table.
 */
export async function savePlatformToken(
  clienteId: string,
  igUserId: string,
  igUsername: string,
  accessToken: string,
  pageId?: string,
  adAccountId?: string,
  expiresAt?: Date
): Promise<void> {
  const { error } = await (supabase as any)
    .from("platform_tokens")
    .upsert(
      {
        cliente_id: clienteId,
        platform: "instagram",
        token: accessToken,
        ig_user_id: igUserId,
        ig_username: igUsername,
        page_id: pageId ?? null,
        ad_account_id: adAccountId ?? null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      },
      { onConflict: "cliente_id,platform" }
    );

  if (error) throw error;
}

/**
 * Loads IG token config for a client from the platform_tokens table.
 */
export async function loadPlatformToken(clienteId: string): Promise<{
  igUserId: string;
  igUsername: string;
  accessToken: string;
  pageId: string | null;
  adAccountId: string | null;
  expiresAt: Date | null;
} | null> {
  const { data, error } = await (supabase as any)
    .from("platform_tokens")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("platform", "instagram")
    .maybeSingle();

  if (error || !data) return null;

  return {
    igUserId: data.ig_user_id || "",
    igUsername: data.ig_username || "",
    accessToken: data.token || "",
    pageId: data.page_id || null,
    adAccountId: data.ad_account_id || null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
  };
}
