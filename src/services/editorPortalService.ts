// Editor Portal Service
// Handles editor-specific data: their assigned clients, video submissions, REC numbering.

import { supabase } from "@/integrations/supabase/client";

export interface EditorClient {
  clienteId: string;
  nombre: string;
  empresa: string;
  avatar: string;
}

export interface EditorVideo {
  id: string;
  clienteId: string;
  clienteName: string;
  title: string;
  status: string;
  priority: "alta" | "normal" | "baja";
  recNumber: number | null;
  recOrder: number | null;
  recDisplay: string;   // "R3-02"
  deliveryDate: string | null;
  thumbnail: string | null;
  driveLink: string | null;
  embedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewVideoDelivery {
  clienteId: string;
  title: string;
  recNumber: number;
  recOrder: number;
  driveLink: string;
  thumbnail?: string | null;
  priority: "alta" | "normal" | "baja";
  embedUrl?: string | null;
}

export function recDisplay(recNumber: number | null, recOrder: number | null): string {
  if (recNumber == null || recOrder == null) return "—";
  return `R${recNumber}-${String(recOrder).padStart(2, "0")}`;
}

// ── Editor's assigned clients ───────────────────────────────────
export async function fetchEditorClients(editorId: string): Promise<EditorClient[]> {
  const { data, error } = await supabase
    .from("editor_clients")
    .select("cliente_id")
    .eq("editor_id", editorId);

  if (error) {
    console.error("fetchEditorClients:", error);
    return [];
  }
  if (!data || data.length === 0) return [];

  const ids = data.map((r) => r.cliente_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("user_id, display_name, business, email")
    .in("user_id", ids);

  if (pErr || !profiles) return [];

  return profiles.map((p) => ({
    clienteId: p.user_id,
    nombre: p.display_name || p.email?.split("@")[0] || "Cliente",
    empresa: p.business || "",
    avatar: (p.display_name || p.email || "CL").substring(0, 2).toUpperCase(),
  }));
}

// ── Videos this editor has delivered ────────────────────────────
export async function fetchEditorVideos(editorId: string): Promise<EditorVideo[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("editor_id", editorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchEditorVideos:", error);
    return [];
  }
  if (!data || data.length === 0) return [];

  // resolve cliente names
  const clienteIds = Array.from(new Set(data.map((v: any) => v.cliente_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, business, email")
    .in("user_id", clienteIds);
  const nameMap = new Map<string, string>(
    (profiles || []).map((p: any) => [p.user_id, p.display_name || p.business || p.email?.split("@")[0] || "Cliente"])
  );

  return data.map((v: any) => ({
    id: v.id,
    clienteId: v.cliente_id,
    clienteName: nameMap.get(v.cliente_id) || "Cliente",
    title: v.title,
    status: v.status,
    priority: (v.priority as "alta" | "normal" | "baja") || "normal",
    recNumber: v.rec_number ?? null,
    recOrder: v.rec_order ?? null,
    recDisplay: recDisplay(v.rec_number ?? null, v.rec_order ?? null),
    deliveryDate: v.delivery_date,
    thumbnail: v.thumbnail,
    driveLink: v.drive_link,
    embedUrl: v.embed_url,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  }));
}

// ── REC number helpers (via RPC) ────────────────────────────────
export async function suggestNextRec(): Promise<{ recNumber: number; recOrder: number }> {
  const { data: recN } = await supabase.rpc("next_rec_number");
  const recNumber = (recN as number) || 1;
  const { data: recO } = await supabase.rpc("next_rec_order", { _rec_number: recNumber });
  const recOrder = (recO as number) || 1;
  return { recNumber, recOrder };
}

// ── Submit a new video delivery ─────────────────────────────────
export async function submitVideoDelivery(
  editorId: string,
  payload: NewVideoDelivery
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const insert = {
    cliente_id:   payload.clienteId,
    title:        payload.title,
    rec_number:   payload.recNumber,
    rec_order:    payload.recOrder,
    drive_link:   payload.driveLink,
    thumbnail:    payload.thumbnail || null,
    embed_url:    payload.embedUrl || null,
    priority:     payload.priority,
    editor_id:    editorId,
    status:       "pending",
    delivery_date: new Date().toISOString(),
    platform:     ["instagram"],
  };

  const { data, error } = await supabase
    .from("videos")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Error al guardar" };
  }
  return { ok: true, id: data.id };
}
