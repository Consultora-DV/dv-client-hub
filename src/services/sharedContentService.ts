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

export async function fetchScripts(): Promise<Script[]> {
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchScripts:", error);
    return [];
  }
  return (data || []).map(scriptFromRow);
}

export async function createScript(script: Omit<Script, "id">): Promise<Script> {
  const { data, error } = await supabase
    .from("scripts")
    .insert({
      cliente_id: script.clienteId,
      title: script.title,
      date: script.date,
      status: script.status,
      drive_link: script.driveLink || "#",
      is_new: script.isNew,
      visto: script.visto,
      status_history: script.statusHistory,
    })
    .select()
    .single();
  if (error) throw error;
  return scriptFromRow(data);
}

export async function updateScript(scriptId: string, updates: Partial<Script>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.date !== undefined) row.date = updates.date;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.driveLink !== undefined) row.drive_link = updates.driveLink;
  if (updates.isNew !== undefined) row.is_new = updates.isNew;
  if (updates.visto !== undefined) row.visto = updates.visto;
  if (updates.statusHistory !== undefined) row.status_history = updates.statusHistory;
  const { error } = await supabase.from("scripts").update(row).eq("id", scriptId);
  if (error) throw error;
}

export async function deleteScript(scriptId: string): Promise<void> {
  const { error } = await supabase.from("scripts").delete().eq("id", scriptId);
  if (error) throw error;
}

export async function fetchAllScriptComments(): Promise<Record<string, Comment[]>> {
  const { data, error } = await supabase
    .from("script_comments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchAllScriptComments:", error);
    return {};
  }
  return (data || []).reduce((acc: Record<string, Comment[]>, row: any) => {
    const key = row.script_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(scriptCommentFromRow(row));
    return acc;
  }, {});
}

export async function insertScriptComment(scriptId: string, author: string, text: string, isClient: boolean, userId: string): Promise<void> {
  const { error } = await supabase.from("script_comments").insert({
    script_id: scriptId,
    author,
    text,
    is_client: isClient,
    user_id: userId,
  });
  if (error) throw error;
}
