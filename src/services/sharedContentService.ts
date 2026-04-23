import { supabase } from "@/integrations/supabase/client";
import { Comment, Document, Script } from "@/data/mockData";

function documentFromRow(row: any): Document {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    name: row.name,
    type: row.type,
    date: row.date,
    driveLink: row.drive_link || "#",
    fileUrl: row.file_url || undefined,
    isNew: row.is_new ?? false,
  };
}

function scriptFromRow(row: any): Script {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    title: row.title,
    date: row.date,
    status: row.status,
    driveLink: row.drive_link || "#",
    isNew: row.is_new ?? false,
    visto: row.visto ?? false,
    comments: [],
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
  };
}

function scriptCommentFromRow(row: any): Comment {
  return {
    id: row.id,
    author: row.author,
    isClient: row.is_client,
    text: row.text,
    date: row.created_at,
  };
}

export async function fetchDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchDocuments:", error);
    return [];
  }
  return (data || []).map(documentFromRow);
}

export async function createDocument(document: Omit<Document, "id">): Promise<Document> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      cliente_id: document.clienteId,
      name: document.name,
      type: document.type,
      date: document.date,
      drive_link: document.driveLink || "#",
      file_url: document.fileUrl || null,
      is_new: document.isNew,
    })
    .select()
    .single();
  if (error) throw error;
  return documentFromRow(data);
}

export async function updateDocument(documentId: string, updates: Partial<Document>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.date !== undefined) row.date = updates.date;
  if (updates.driveLink !== undefined) row.drive_link = updates.driveLink;
  if (updates.fileUrl !== undefined) row.file_url = updates.fileUrl;
  if (updates.isNew !== undefined) row.is_new = updates.isNew;
  const { error } = await supabase.from("documents" as any).update(row as any).eq("id", documentId);
  if (error) throw error;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) throw error;
}

// TODO: cleanup scripts feature refs (tracked in audit)
// Las tablas scripts/script_comments fueron eliminadas en migration 20260422220008.
// Estos wrappers quedan como no-ops para mantener compatibilidad de tipos
// mientras se hace el refactor completo del frontend.

export async function fetchScripts(): Promise<Script[]> {
  // TODO: cleanup scripts feature refs (tracked in audit)
  return [];
}

export async function createScript(_script: Omit<Script, "id">): Promise<Script> {
  // TODO: cleanup scripts feature refs (tracked in audit)
  throw new Error("La función de guiones fue retirada del backend.");
}

export async function updateScript(_scriptId: string, _updates: Partial<Script>): Promise<void> {
  // TODO: cleanup scripts feature refs (tracked in audit)
}

export async function deleteScript(_scriptId: string): Promise<void> {
  // TODO: cleanup scripts feature refs (tracked in audit)
}

export async function fetchAllScriptComments(): Promise<Record<string, Comment[]>> {
  // TODO: cleanup scripts feature refs (tracked in audit)
  return {};
}

export async function insertScriptComment(
  _scriptId: string,
  _author: string,
  _text: string,
  _isClient: boolean,
  _userId: string,
): Promise<void> {
  // TODO: cleanup scripts feature refs (tracked in audit)
}