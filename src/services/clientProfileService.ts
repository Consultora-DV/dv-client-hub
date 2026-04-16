import { supabase } from "@/integrations/supabase/client";

export interface ClientProfile {
  fullName: string;
  businessName: string;
  industry: string;
  city: string;
  country: string;
  whatsapp: string;
  photoUrl: string | null;
  socialNetworks: Record<string, any>;
  strategy: {
    mainGoal?: string;
    targetAudience?: string;
    tone?: string[];
    contentPillars?: string[];
  } | null;
  blueprintFile: string | null;
  blueprintName: string | null;
}

export async function fetchClientProfile(userId: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from("client_profiles" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as any;
  return {
    fullName: row.full_name || "",
    businessName: row.business_name || "",
    industry: row.industry || "",
    city: row.city || "",
    country: row.country || "",
    whatsapp: row.whatsapp || "",
    photoUrl: row.photo_url || null,
    socialNetworks: row.social_networks || {},
    strategy: row.strategy || null,
    blueprintFile: row.blueprint_file || null,
    blueprintName: row.blueprint_name || null,
  };
}

export async function upsertClientProfile(userId: string, profile: ClientProfile): Promise<void> {
  const row = {
    user_id: userId,
    full_name: profile.fullName,
    business_name: profile.businessName,
    industry: profile.industry,
    city: profile.city,
    country: profile.country,
    whatsapp: profile.whatsapp,
    photo_url: profile.photoUrl,
    social_networks: profile.socialNetworks,
    strategy: profile.strategy,
    blueprint_file: profile.blueprintFile,
    blueprint_name: profile.blueprintName,
  };

  // Try update first, then insert if no rows matched
  const { data: existing } = await supabase
    .from("client_profiles" as any)
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("client_profiles" as any)
      .update(row)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("client_profiles" as any)
      .insert(row);
    if (error) throw error;
  }
}
