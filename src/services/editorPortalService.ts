// Editor Portal Service
// Handles editor-specific data: assigned clients, video submissions, REC numbering,
// financial fields (costo, moneda, pagado), and reference links.

import { supabase } from "@/integrations/supabase/client";
import { dispatchPush } from "@/services/pushNotifications";

export interface EditorClient {
  clienteId: string;
  nombre: string;
  empresa: string;
  avatar: string;
}

export type Priority = "alta" | "normal" | "baja";
export type Moneda   = "USD" | "MXN";
export type Categoria = 0 | 1 | 2 | 3 | 4;

export interface EditorVideo {
  id: string;
  clienteId: string;
  clienteName: string;
  title: string;
  status: string;
  priority: Priority;
  categoria: Categoria | null;
  recNumber: number | null;
  recOrder: number | null;
  recDisplay: string;
  deliveryDate: string | null;
  publishedAt: string | null;
  thumbnail: string | null;
  driveLink: string | null;
  referenciaGuion: string | null;
  linkPublicado: string | null;
  embedUrl: string | null;
  costo: number | null;
  moneda: Moneda | null;
  pagado: boolean;
  editorId: string | null;
  editorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewVideoDelivery {
  clienteId: string;
  title: string;
  recNumber: number;
  recOrder: number;
  categoria: Categoria;
  driveLink: string;
  thumbnail?: string | null;
  embedUrl?: string | null;
  referenciaGuion?: string | null;
  priority: Priority;
  costo?: number | null;
  moneda?: Moneda | null;
}

export interface UpdateVideoFields {
  title?: string;
  status?: string;
  priority?: Priority;
  categoria?: Categoria | null;
  recNumber?: number;
  recOrder?: number;
  driveLink?: string | null;
  thumbnail?: string | null;
  referenciaGuion?: string | null;
  linkPublicado?: string | null;
  embedUrl?: string | null;
  costo?: number | null;
  moneda?: Moneda | null;
  pagado?: boolean;
  editorId?: string | null;
  editorName?: string | null;
  publishedAt?: string | null;
}

export function recDisplay(recNumber: number | null, recOrder: number | null): string {
  if (recNumber == null || recOrder == null) return "—";
  return `R${recNumber}-${String(recOrder).padStart(2, "0")}`;
}

// ── Map DB row → EditorVideo ────────────────────────────────────
function mapVideo(v: any, clienteName: string): EditorVideo {
  return {
    id: v.id,
    clienteId: v.cliente_id,
    clienteName,
    title: v.title,
    status: v.status,
    priority: (v.priority as Priority) || "normal",
    categoria: v.categoria != null ? (Number(v.categoria) as Categoria) : null,
    recNumber: v.rec_number ?? null,
    recOrder: v.rec_order ?? null,
    recDisplay: recDisplay(v.rec_number ?? null, v.rec_order ?? null),
    deliveryDate: v.delivery_date,
    publishedAt: v.published_at,
    thumbnail: v.thumbnail,
    driveLink: v.drive_link,
    referenciaGuion: v.referencia_guion,
    linkPublicado: v.link_publicado,
    embedUrl: v.embed_url,
    costo: v.costo != null ? Number(v.costo) : null,
    moneda: (v.moneda as Moneda) || null,
    pagado: !!v.pagado,
    editorId: v.editor_id,
    editorName: v.editor_name,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

// Fetch a single video by id (for edit mode)
export async function fetchVideoById(videoId: string): Promise<EditorVideo | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .maybeSingle();
  if (error || !data) return null;
  const nameMap = await resolveClienteNames([data.cliente_id]);
  return mapVideo(data, nameMap.get(data.cliente_id) || "Cliente");
}

// ── Editor's assigned clients ───────────────────────────────────
export async function fetchEditorClients(editorId: string): Promise<EditorClient[]> {
  const { data, error } = await supabase
    .from("editor_clients")
    .select("cliente_id")
    .eq("editor_id", editorId);

  if (error) { console.error("fetchEditorClients:", error); return []; }
  if (!data || data.length === 0) return [];

  const ids = data.map((r) => r.cliente_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, business, email")
    .in("user_id", ids);
  if (!profiles) return [];

  return profiles.map((p) => ({
    clienteId: p.user_id,
    nombre: p.display_name || p.email?.split("@")[0] || "Cliente",
    empresa: p.business || "",
    avatar: (p.display_name || p.email || "CL").substring(0, 2).toUpperCase(),
  }));
}

async function resolveClienteNames(clienteIds: string[]): Promise<Map<string, string>> {
  if (clienteIds.length === 0) return new Map();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, business, email")
    .in("user_id", clienteIds);
  return new Map<string, string>(
    (profiles || []).map((p: any) => [p.user_id, p.display_name || p.business || p.email?.split("@")[0] || "Cliente"])
  );
}

// ── Videos this editor can see ──────────────────────────────────
// Includes BOTH: videos the editor delivered (editor_id = them) AND every video
// of the clients assigned to them. That way imported/legacy videos without an
// editor_id (e.g. CSV imports, or orphaned when an account was deleted) still
// show up for whoever manages that client. RLS already permits both reads.
export async function fetchEditorVideos(editorId: string): Promise<EditorVideo[]> {
  const { data: assigned } = await supabase
    .from("editor_clients")
    .select("cliente_id")
    .eq("editor_id", editorId);
  const clientIds = Array.from(new Set((assigned || []).map((r: any) => r.cliente_id)));

  let query = supabase.from("videos").select("*");
  if (clientIds.length > 0) {
    query = query.or(`editor_id.eq.${editorId},cliente_id.in.(${clientIds.join(",")})`);
  } else {
    query = query.eq("editor_id", editorId);
  }

  const { data, error } = await query
    .order("rec_number", { ascending: false })
    .order("rec_order", { ascending: false });

  if (error) { console.error("fetchEditorVideos:", error); return []; }
  if (!data || data.length === 0) return [];

  const nameMap = await resolveClienteNames(Array.from(new Set(data.map((v: any) => v.cliente_id))));
  return data.map((v: any) => mapVideo(v, nameMap.get(v.cliente_id) || "Cliente"));
}

// ── ALL videos (admin view) ─────────────────────────────────────
export async function fetchAllVideos(filters?: { clienteId?: string; status?: string }): Promise<EditorVideo[]> {
  let q = supabase.from("videos").select("*")
    .order("rec_number", { ascending: false })
    .order("rec_order", { ascending: false });
  if (filters?.clienteId) q = q.eq("cliente_id", filters.clienteId);
  if (filters?.status)    q = q.eq("status", filters.status);

  const { data, error } = await q;
  if (error || !data) { console.error("fetchAllVideos:", error); return []; }
  const nameMap = await resolveClienteNames(Array.from(new Set(data.map((v: any) => v.cliente_id))));
  return data.map((v: any) => mapVideo(v, nameMap.get(v.cliente_id) || "Cliente"));
}

// ── REC suggestions (RPC) ───────────────────────────────────────
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
  editorName: string,
  payload: NewVideoDelivery
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const insert = {
    cliente_id:        payload.clienteId,
    title:             payload.title,
    rec_number:        payload.recNumber,
    rec_order:         payload.recOrder,
    categoria:         payload.categoria,
    drive_link:        payload.driveLink,
    thumbnail:         payload.thumbnail || null,
    embed_url:         payload.embedUrl || null,
    referencia_guion:  payload.referenciaGuion || null,
    priority:          payload.priority,
    costo:             payload.costo ?? null,
    moneda:            payload.moneda ?? null,
    editor_id:         editorId,
    editor_name:       editorName,
    status:            "in_review", // editor uploaded → pending review by client/admin
    delivery_date:     new Date().toISOString(),
    platform:          ["instagram"],
  };

  const { data, error } = await supabase
    .from("videos")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message || "Error al guardar" };

  // Push the admins (works even with their app closed). Fire-and-forget.
  dispatchPush("video_delivered", { videoId: data.id });

  return { ok: true, id: data.id };
}

// ── Update a video (admin) ──────────────────────────────────────
export async function updateVideoFields(
  videoId: string,
  fields: UpdateVideoFields
): Promise<{ ok: boolean; error?: string }> {
  const update: any = {};
  if (fields.title            !== undefined) update.title            = fields.title;
  if (fields.status           !== undefined) update.status           = fields.status;
  if (fields.priority         !== undefined) update.priority         = fields.priority;
  if (fields.categoria        !== undefined) update.categoria        = fields.categoria;
  if (fields.recNumber        !== undefined) update.rec_number       = fields.recNumber;
  if (fields.recOrder         !== undefined) update.rec_order        = fields.recOrder;
  if (fields.driveLink        !== undefined) update.drive_link       = fields.driveLink;
  if (fields.thumbnail        !== undefined) update.thumbnail        = fields.thumbnail;
  if (fields.referenciaGuion  !== undefined) update.referencia_guion = fields.referenciaGuion;
  if (fields.linkPublicado    !== undefined) update.link_publicado   = fields.linkPublicado;
  if (fields.embedUrl         !== undefined) update.embed_url        = fields.embedUrl;
  if (fields.costo            !== undefined) update.costo            = fields.costo;
  if (fields.moneda           !== undefined) update.moneda           = fields.moneda;
  if (fields.pagado           !== undefined) update.pagado           = fields.pagado;
  if (fields.editorId         !== undefined) update.editor_id        = fields.editorId;
  if (fields.editorName       !== undefined) update.editor_name      = fields.editorName;
  if (fields.publishedAt      !== undefined) update.published_at     = fields.publishedAt;

  const { error } = await supabase.from("videos").update(update).eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  // Notify the editor on screen-relevant changes (status / paid). Fire-and-forget.
  if (fields.status !== undefined) {
    dispatchPush("video_status", { videoId, status: fields.status });
  }

  return { ok: true };
}

// ── Delete a video (admin) ──────────────────────────────────────
export async function deleteVideo(videoId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Assignments helpers (admin) ─────────────────────────────────
export interface EditorAssignmentRow {
  editorId: string;
  editorName: string;
  editorEmail: string;
  clienteId: string;
  clienteName: string;
  assignmentId: string;
}

export async function fetchAllAssignments(): Promise<EditorAssignmentRow[]> {
  const { data, error } = await supabase
    .from("editor_clients")
    .select("id, editor_id, cliente_id");
  if (error || !data) return [];

  const ids = Array.from(new Set([...data.map((r) => r.editor_id), ...data.map((r) => r.cliente_id)]));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, email")
    .in("user_id", ids);
  const map = new Map<string, { name: string; email: string }>(
    (profiles || []).map((p: any) => [p.user_id, {
      name: p.display_name || p.email?.split("@")[0] || "—",
      email: p.email || "",
    }])
  );

  return data.map((r) => ({
    editorId:    r.editor_id,
    editorName:  map.get(r.editor_id)?.name || "—",
    editorEmail: map.get(r.editor_id)?.email || "",
    clienteId:   r.cliente_id,
    clienteName: map.get(r.cliente_id)?.name || "—",
    assignmentId: r.id,
  }));
}

export async function assignEditorToClient(
  editorId: string,
  clienteId: string,
  assignedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("editor_clients")
    .insert({ editor_id: editorId, cliente_id: clienteId, assigned_by: assignedBy });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unassignEditorClient(assignmentId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("editor_clients").delete().eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Editor preferences (payment scheme + field visibility) ─────
export type PaymentScheme = "per_video" | "fixed_monthly" | "fixed_weekly" | "fixed_biweekly" | "none";

export interface EditorPreferences {
  editorId: string;
  paymentScheme: PaymentScheme;
  fixedAmount: number | null;
  fixedCurrency: "USD" | "MXN" | null;
  showCosto: boolean;
  showReferencia: boolean;
  showPublicado: boolean;
  showThumbnail: boolean;
  showEmbed: boolean;
  notes: string | null;
}

export const DEFAULT_EDITOR_PREFS: Omit<EditorPreferences, "editorId"> = {
  paymentScheme: "per_video",
  fixedAmount:   null,
  fixedCurrency: null,
  showCosto:     true,
  showReferencia: false,
  showPublicado: false,
  showThumbnail: true,
  showEmbed:     false,
  notes:         null,
};

function mapPrefs(row: any): EditorPreferences {
  return {
    editorId:      row.editor_id,
    paymentScheme: row.payment_scheme,
    fixedAmount:   row.fixed_amount != null ? Number(row.fixed_amount) : null,
    fixedCurrency: row.fixed_currency,
    showCosto:     !!row.show_costo,
    showReferencia: !!row.show_referencia,
    showPublicado: !!row.show_publicado,
    showThumbnail: !!row.show_thumbnail,
    showEmbed:     !!row.show_embed,
    notes:         row.notes,
  };
}

export async function fetchEditorPreferences(editorId: string): Promise<EditorPreferences> {
  const { data, error } = await supabase
    .from("editor_preferences")
    .select("*")
    .eq("editor_id", editorId)
    .maybeSingle();
  if (error || !data) {
    return { editorId, ...DEFAULT_EDITOR_PREFS };
  }
  return mapPrefs(data);
}

export async function upsertEditorPreferences(
  prefs: EditorPreferences,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const row = {
    editor_id:       prefs.editorId,
    payment_scheme:  prefs.paymentScheme,
    fixed_amount:    prefs.fixedAmount,
    fixed_currency:  prefs.fixedCurrency,
    show_costo:      prefs.showCosto,
    show_referencia: prefs.showReferencia,
    show_publicado:  prefs.showPublicado,
    show_thumbnail:  prefs.showThumbnail,
    show_embed:      prefs.showEmbed,
    notes:           prefs.notes,
    updated_by:      updatedBy,
  };
  const { error } = await supabase
    .from("editor_preferences")
    .upsert(row, { onConflict: "editor_id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Fetch ALL users with role=editor (for admin dropdowns, regardless of whether they have entregas yet)
export interface EditorUser {
  userId: string;
  name: string;
  email: string;
}

export async function fetchAllEditors(): Promise<EditorUser[]> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "editor");
  if (error || !roles || roles.length === 0) return [];

  const ids = roles.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, email")
    .in("user_id", ids);
  if (!profiles) return [];

  return profiles
    .map((p: any) => ({
      userId: p.user_id,
      name: p.display_name || p.email?.split("@")[0] || "Editor",
      email: p.email || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Fetch the editor's assigned clients (used in admin assignment panel)
export async function fetchEditorAssignedClientIds(editorId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("editor_clients")
    .select("cliente_id")
    .eq("editor_id", editorId);
  return new Set((data || []).map((r: any) => r.cliente_id));
}

export async function setEditorAssignment(
  editorId: string,
  clienteId: string,
  shouldAssign: boolean,
  assignedBy: string
): Promise<{ ok: boolean; error?: string }> {
  if (shouldAssign) {
    const { error } = await supabase
      .from("editor_clients")
      .insert({ editor_id: editorId, cliente_id: clienteId, assigned_by: assignedBy });
    if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    dispatchPush("editor_assigned", { editorId, clienteId });
    return { ok: true };
  }
  const { error } = await supabase
    .from("editor_clients")
    .delete()
    .eq("editor_id", editorId)
    .eq("cliente_id", clienteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Bulk import (used by admin to seed historical data) ─────────
import type { FedraSeedVideo } from "@/data/fedraSeedData";

export async function bulkImportVideos(
  clienteId: string,
  videos: FedraSeedVideo[]
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  // Check if cliente already has REC'd videos — avoid duplicates
  const { count } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .not("rec_number", "is", null);
  if ((count || 0) > 0) {
    return { ok: false, inserted: 0, error: `Este cliente ya tiene ${count} videos con REC. Cancelando para evitar duplicados.` };
  }

  const rows = videos.map((v) => ({
    cliente_id:       clienteId,
    rec_number:       v.rec_number,
    rec_order:        v.rec_order,
    title:            v.title,
    status:           v.status,
    priority:         v.priority,
    drive_link:       v.drive_link,
    thumbnail:        v.thumbnail,
    referencia_guion: v.referencia_guion,
    link_publicado:   v.link_publicado,
    costo:            v.costo,
    moneda:           v.moneda,
    pagado:           v.pagado,
    editor_name:      v.editor_name,
    published_at:     v.published_at ? `${v.published_at}T00:00:00Z` : null,
    delivery_date:    v.published_at ? `${v.published_at}T00:00:00Z` : new Date().toISOString(),
    platform:         ["instagram"],
  }));

  const { error } = await supabase.from("videos").insert(rows);
  if (error) return { ok: false, inserted: 0, error: error.message };
  return { ok: true, inserted: rows.length };
}
