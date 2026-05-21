// Notion CSV importer for editor deliveries
// Accepts the column layout from Notion's "Dra Fedra WorkFlow Edición" export
// or any reordering of the same column names.

import { supabase } from "@/integrations/supabase/client";

// ── Helpers ────────────────────────────────────────────────────
const MONTHS_ES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function parseSpanishDate(s: string): string | null {
  const clean = (s || "").trim();
  if (!clean) return null;
  // "22 de febrero de 2026"
  const m = clean.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (m) {
    const day = parseInt(m[1]);
    const month = MONTHS_ES[m[2].toLowerCase()];
    const year = parseInt(m[3]);
    if (month) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  // ISO fallback
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  return null;
}

function parseRecId(id: string): { rec_number: number; rec_order: number } | null {
  // T4—01, T1-05, T4 - 00, R3-02, R3—02
  const m = (id || "").trim().match(/[TR]\s*(\d+)\s*[-—–]\s*(\d+)/i);
  if (!m) return null;
  return { rec_number: parseInt(m[1]), rec_order: parseInt(m[2]) };
}

// Simple but robust CSV parser (handles quoted fields with commas / newlines)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c === "\r") { /* skip */ }
      else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

// Map flexible header names to canonical keys
function normalizeHeader(h: string): string {
  const k = h.toLowerCase().trim();
  if (k === "id") return "id";
  if (k === "editor") return "editor";
  if (k.includes("nombre")) return "title";
  if (k === "tanda") return "tanda";
  if (k === "estado") return "estado";
  if (k.includes("publicación") || k.includes("publicacion")) {
    if (k.includes("fecha")) return "fecha_publicacion";
    return "publicacion";
  }
  if (k === "prioridad") return "prioridad";
  if (k.includes("referencia") || k.includes("guion")) return "referencia_guion";
  if (k === "link") return "link";
  if (k === "miniatura") return "miniatura";
  if (k === "moneda") return "moneda";
  if (k.includes("costo")) return "costo";
  if (k === "pagado") return "pagado";
  if (k === "texto" || k.includes("caption")) return "texto";
  if (k === "categoria" || k === "categoría" || k === "cat") return "categoria";
  return k;
}

// Status mapping
function mapStatus(estado: string, publicacion: string): "pending" | "approved" | "published" | "changes" {
  const e = (estado || "").toLowerCase().trim();
  const p = (publicacion || "").toLowerCase().trim();
  if (e === "aprobado" && p === "publicado") return "published";
  if (e === "aprobado") return "approved";
  if (e.includes("cambio")) return "changes";
  return "pending";
}

function mapPriority(p: string): "alta" | "normal" | "baja" {
  const x = (p || "").toLowerCase().trim();
  if (x === "alta") return "alta";
  if (x === "baja") return "baja";
  return "normal";
}

// ── Public types ──────────────────────────────────────────────
export interface ParsedRow {
  rec_number: number;
  rec_order: number;
  title: string;
  status: "pending" | "approved" | "published" | "changes";
  priority: "alta" | "normal" | "baja";
  categoria: number | null;
  drive_link: string | null;
  thumbnail: string | null;
  referencia_guion: string | null;
  link_publicado: string | null;
  costo: number | null;
  moneda: "USD" | "MXN" | null;
  pagado: boolean;
  editor_name: string | null;
  published_at: string | null;
  ig_caption: string | null;
  _rawId: string;
  _warnings: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: { line: number; message: string; raw: string }[];
}

// ── Main parser ───────────────────────────────────────────────
export function parseNotionCsv(text: string): ParseResult {
  const matrix = parseCSV(text);
  if (matrix.length < 2) return { rows: [], errors: [{ line: 0, message: "CSV vacío o sin filas de datos", raw: "" }] };

  const headers = matrix[0].map(normalizeHeader);
  const rows: ParsedRow[] = [];
  const errors: ParseResult["errors"] = [];

  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] || "").trim(); });

    const rec = parseRecId(obj.id);
    if (!rec) {
      errors.push({ line: i + 1, message: `ID inválido "${obj.id}"`, raw: cells.join(",") });
      continue;
    }
    if (!obj.title) {
      errors.push({ line: i + 1, message: "Falta nombre del video", raw: cells.join(",") });
      continue;
    }

    const warnings: string[] = [];
    // Referencia/guion can be either a docs link (guion) or a published social link.
    // If "Publicación" says PUBLICADO and REFERENCIA contains an IG/TikTok URL, treat as link_publicado.
    let referencia_guion: string | null = obj.referencia_guion || null;
    let link_publicado: string | null = null;
    if (referencia_guion && /instagram\.com|tiktok\.com/i.test(referencia_guion)) {
      link_publicado = referencia_guion;
      referencia_guion = null;
    }

    const costo = obj.costo ? parseFloat(obj.costo) : null;
    const moneda = obj.moneda === "USD" || obj.moneda === "MXN" ? (obj.moneda as "USD" | "MXN") : null;

    const catRaw = obj.categoria ? parseInt(obj.categoria) : NaN;
    const categoria = !isNaN(catRaw) && catRaw >= 0 && catRaw <= 4 ? catRaw : null;

    rows.push({
      rec_number: rec.rec_number,
      rec_order: rec.rec_order,
      title: obj.title,
      status: mapStatus(obj.estado, obj.publicacion),
      priority: mapPriority(obj.prioridad),
      categoria,
      drive_link: obj.link || null,
      thumbnail: obj.miniatura || null,
      referencia_guion,
      link_publicado,
      costo: costo != null && !isNaN(costo) ? costo : null,
      moneda,
      pagado: obj.pagado?.toLowerCase() === "pagado",
      editor_name: obj.editor || null,
      published_at: parseSpanishDate(obj.fecha_publicacion),
      ig_caption: obj.texto || null,
      _rawId: obj.id,
      _warnings: warnings,
    });
  }

  return { rows, errors };
}

// ── Importer ──────────────────────────────────────────────────
export async function importParsedRows(
  clienteId: string,
  rows: ParsedRow[]
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (rows.length === 0) return { ok: false, inserted: 0, error: "No hay filas válidas" };

  // Block duplicates: refuse if client already has any REC'd videos
  const { count } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .not("rec_number", "is", null);
  if ((count || 0) > 0) {
    return { ok: false, inserted: 0, error: `Este cliente ya tiene ${count} videos con REC. Elimínalos primero o cancela.` };
  }

  const insertRows = rows.map((r) => ({
    cliente_id:       clienteId,
    rec_number:       r.rec_number,
    rec_order:        r.rec_order,
    title:            r.title,
    status:           r.status,
    priority:         r.priority,
    categoria:        r.categoria,
    drive_link:       r.drive_link,
    thumbnail:        r.thumbnail,
    referencia_guion: r.referencia_guion,
    link_publicado:   r.link_publicado,
    costo:            r.costo,
    moneda:           r.moneda,
    pagado:           r.pagado,
    editor_name:      r.editor_name,
    published_at:     r.published_at ? `${r.published_at}T00:00:00Z` : null,
    delivery_date:    r.published_at ? `${r.published_at}T00:00:00Z` : new Date().toISOString(),
    ig_caption:       r.ig_caption,
    platform:         ["instagram"],
  }));

  const { error } = await supabase.from("videos").insert(insertRows);
  if (error) return { ok: false, inserted: 0, error: error.message };
  return { ok: true, inserted: insertRows.length };
}
