import { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  Video, Document, CalendarEvent, Notification, Comment, Script, Client,
} from "@/data/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";
import { PostMetric, PlatformMetrics, calculateMonthlySummary } from "@/services/metricsParser";
import { filterDuplicates } from "@/lib/deduplication";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchVideos, fetchCalendarEvents, fetchAllComments,
  insertVideos, insertCalendarEvents, insertComment,
  updateVideoStatus, insertPostMetrics,
  getExistingShortCodes, getExistingEventKeys,
  persistThumbnails,
} from "@/services/supabaseDataService";
import {
  fetchDocuments, fetchScripts, fetchAllScriptComments,
  createDocument, createScript, updateDocument, updateScript,
  deleteDocument, deleteScript, insertScriptComment,
} from "@/services/sharedContentService";

export interface ImportResult {
  videosAdded: number;
  videosSkipped: number;
  eventsAdded: number;
  eventsSkipped: number;
  metricsAdded: number;
  metricsSkipped: number;
}

interface AppStateContextType {
  videos: Video[];
  allVideos: Video[];
  setVideos: (v: Video[] | ((prev: Video[]) => Video[])) => void;
  documents: Document[];
  allDocuments: Document[];
  setDocuments: (d: Document[] | ((prev: Document[]) => Document[])) => void;
  scripts: Script[];
  allScripts: Script[];
  setScripts: (s: Script[] | ((prev: Script[]) => Script[])) => void;
  calendarEvents: CalendarEvent[];
  allCalendarEvents: CalendarEvent[];
  setCalendarEvents: (e: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void;
  notifications: Notification[];
  setNotifications: (n: Notification[] | ((prev: Notification[]) => Notification[])) => void;
  comments: Record<string, Comment[]>;
  setComments: (c: Record<string, Comment[]> | ((prev: Record<string, Comment[]>) => Record<string, Comment[]>)) => void;
  approveVideo: (videoId: string) => void;
  requestChanges: (videoId: string, comment: string) => void;
  addComment: (videoId: string, text: string) => void;
  addNotification: (notification: Omit<Notification, "id">) => void;
  isLoadingClients: boolean;
  selectedClienteId: string | null;
  setSelectedClienteId: (id: string | null) => void;
  clients: Client[];
  importFromApify: (videos: Video[], events: CalendarEvent[]) => Promise<ImportResult>;
  scriptComments: Record<string, Comment[]>;
  approveScript: (scriptId: string) => void;
  requestChangesScript: (scriptId: string, text: string) => void;
  addScriptComment: (scriptId: string, commentText: string) => void;
  markScriptViewed: (scriptId: string) => void;
  addDocumentToDb: (doc: Omit<Document, "id">) => Promise<void>;
  addScriptToDb: (script: Omit<Script, "id">) => Promise<void>;
  removeDocumentFromDb: (id: string) => Promise<void>;
  removeScriptFromDb: (id: string) => Promise<void>;
  updateDocumentInDb: (id: string, updates: Partial<Document>) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  // DB-backed state
  const [allVideos, setAllVideosState] = useState<Video[]>([]);
  const [allCalendarEvents, setAllEventsState] = useState<CalendarEvent[]>([]);
  const [comments, setCommentsState] = useState<Record<string, Comment[]>>({});

  const [allDocuments, setAllDocumentsState] = useState<Document[]>([]);
  const [allScripts, setAllScriptsState] = useState<Script[]>([]);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>("dv_notifications_state", []);
  const [scriptComments, setScriptComments] = useState<Record<string, Comment[]>>({});
  const [selectedClienteId, setSelectedClienteId] = useLocalStorage<string | null>("dv_selected_cliente", null);

  const initialLoadDone = useRef(false);

  // ── Migrate legacy localStorage data to DB safely ──
  // Runs on EVERY load so newly-added local items keep syncing to DB.
  const migrateLocalStorage = useCallback(async () => {
    try {
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email");
      const idMap = new Map<string, string>();
      for (const p of profiles || []) {
        const normalizedName = (p.display_name || "").toLowerCase().replace(/\s+/g, "-").replace(/\./g, "");
        const nameWithDot = (p.display_name || "").toLowerCase().replace(/\s+/g, "-");
        idMap.set(normalizedName, p.user_id);
        idMap.set(nameWithDot, p.user_id);
        idMap.set(p.user_id, p.user_id);
        if (p.email) idMap.set(p.email.toLowerCase(), p.user_id);

        const parts = (p.display_name || "").split(" ").filter(Boolean);
        if (parts.length >= 2) {
          idMap.set(`${parts[0].toLowerCase()}-${parts[parts.length - 1].toLowerCase()}`, p.user_id);
          const withoutTitle = parts.filter((part) => !part.match(/^(dr|dra|ing|lic|prof)\.?$/i));
          if (withoutTitle.length >= 2) {
            idMap.set(withoutTitle.map((part) => part.toLowerCase()).join("-"), p.user_id);
          }
        }
      }

      const resolveClienteId = (oldId: string): string | null => {
        if (!oldId) return null;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(oldId)) {
          return oldId;
        }
        return idMap.get(oldId.toLowerCase()) || idMap.get(oldId) || null;
      };

      const localVideos: Video[] = JSON.parse(localStorage.getItem("dv_videos_state") || "[]");
      const localEvents: CalendarEvent[] = JSON.parse(localStorage.getItem("dv_calendar_state") || "[]");
      // Documents & scripts ya viven en la base de datos. No re-importamos desde
      // localStorage para evitar duplicados o asignaciones legacy incorrectas.
      const localDocuments: Document[] = [];
      const localScripts: Script[] = [];
      // Limpieza preventiva: si quedan restos en localStorage, los borramos para
      // que la próxima sesión no intente revivirlos.
      localStorage.removeItem("dv_documents_state");
      localStorage.removeItem("dv_scripts_state");

      const unresolvedClienteIds = {
        videos: Array.from(new Set(localVideos.map((v) => v.clienteId).filter((id) => !resolveClienteId(id)))),
        events: Array.from(new Set(localEvents.map((e) => e.clienteId).filter((id) => !resolveClienteId(id)))),
        documents: Array.from(new Set(localDocuments.map((d) => d.clienteId).filter((id) => !resolveClienteId(id)))),
        scripts: Array.from(new Set(localScripts.map((s) => s.clienteId).filter((id) => !resolveClienteId(id)))),
      };
      if (Object.values(unresolvedClienteIds).some((items) => items.length > 0)) {
        console.warn("ClienteId legacy sin resolver durante migración", unresolvedClienteIds);
      }

      const [existingVids, existingEvts, existingDocs, existingScripts] = await Promise.all([
        fetchVideos(),
        fetchCalendarEvents(),
        fetchDocuments(),
        fetchScripts(),
      ]);

      const existingVideoKeys = new Set(existingVids.map((v: Video) => (v as any).igShortCode || v.embedUrl).filter(Boolean));
      const existingEventKeys = new Set(existingEvts.map((e: CalendarEvent) => (e as any).igShortCode || `${e.date}|${e.title}`).filter(Boolean));
      const existingDocKeys = new Set(existingDocs.map((d) => `${d.clienteId}|${d.name}|${d.driveLink || "#"}`));
      const existingScriptKeys = new Set(existingScripts.map((s) => `${s.clienteId}|${s.title}|${s.driveLink || "#"}`));

      const videosToInsert = localVideos
        .map((v) => {
          const realId = resolveClienteId(v.clienteId);
          return realId ? { ...v, clienteId: realId } : null;
        })
        .filter((v): v is Video => {
          if (!v) return false;
          const key = (v as any).igShortCode || v.embedUrl;
          return key ? !existingVideoKeys.has(key) : true;
        });

      const eventsToInsert = localEvents
        .map((e) => {
          const realId = resolveClienteId(e.clienteId);
          return realId ? { ...e, clienteId: realId } : null;
        })
        .filter((e): e is CalendarEvent => {
          if (!e) return false;
          const key = (e as any).igShortCode || `${e.date}|${e.title}`;
          return !existingEventKeys.has(key);
        });

      const documentsToInsert = localDocuments
        .map((d) => {
          const realId = resolveClienteId(d.clienteId);
          return realId ? { ...d, clienteId: realId } : null;
        })
        .filter((d): d is Document => {
          if (!d) return false;
          return !existingDocKeys.has(`${d.clienteId}|${d.name}|${d.driveLink || "#"}`);
        });

      const scriptsToInsert = localScripts
        .map((s) => {
          const realId = resolveClienteId(s.clienteId);
          return realId ? { ...s, clienteId: realId } : null;
        })
        .filter((s): s is Script => {
          if (!s) return false;
          return !existingScriptKeys.has(`${s.clienteId}|${s.title}|${s.driveLink || "#"}`);
        });

      if (videosToInsert.length > 0) {
        await insertVideos(videosToInsert);
        console.log(`Migrated ${videosToInsert.length} videos from localStorage to DB`);
      }
      if (eventsToInsert.length > 0) {
        await insertCalendarEvents(eventsToInsert);
        console.log(`Migrated ${eventsToInsert.length} events from localStorage to DB`);
      }
      if (documentsToInsert.length > 0) {
        await Promise.all(documentsToInsert.map((doc) => createDocument({
          clienteId: doc.clienteId,
          name: doc.name,
          type: doc.type,
          date: doc.date,
          driveLink: doc.driveLink,
          fileUrl: doc.fileUrl,
          isNew: doc.isNew,
        })));
        console.log(`Migrated ${documentsToInsert.length} documents from localStorage to DB`);
      }
      if (scriptsToInsert.length > 0) {
        await Promise.all(scriptsToInsert.map((script) => createScript({
          clienteId: script.clienteId,
          title: script.title,
          date: script.date,
          status: script.status,
          driveLink: script.driveLink,
          isNew: script.isNew,
          visto: script.visto,
          comments: [],
          statusHistory: script.statusHistory,
        })));
        console.log(`Migrated ${scriptsToInsert.length} scripts from localStorage to DB`);
      }

      const allKeys = Object.keys(localStorage).filter((k) => k.startsWith("dv_metrics_"));
      for (const key of allKeys) {
        try {
          const metrics: PlatformMetrics = JSON.parse(localStorage.getItem(key) || "null");
          if (!metrics?.posts?.length) continue;
          const realClienteId = resolveClienteId(metrics.clienteId);
          if (!realClienteId) continue;
          const posts = metrics.posts.map((p: PostMetric) => ({
            url: p.url,
            thumbnail: p.thumbnail,
            title: p.title,
            date: p.date,
            type: p.type,
            views: p.views,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            reach: p.reach,
            engagement: p.engagement,
            igShortCode: p.id || "",
          }));
          await insertPostMetrics(realClienteId, metrics.platform, posts);
        } catch {
          /* ignore broken metric entries */
        }
      }

      if (videosToInsert.length || eventsToInsert.length || documentsToInsert.length || scriptsToInsert.length) {
        localStorage.setItem("dv_last_migration_run", JSON.stringify({
          ranAt: new Date().toISOString(),
          videos: videosToInsert.length,
          events: eventsToInsert.length,
          documents: documentsToInsert.length,
          scripts: scriptsToInsert.length,
        }));
      }
    } catch (err) {
      console.error("Migration error:", err);
    }
  }, []);

  // ── Load data from DB ──
  useEffect(() => {
    if (!user) return;
    async function load() {
      await migrateLocalStorage();
      const [vids, evts, cmts, docs, scrs, scrCmts] = await Promise.all([
        fetchVideos(),
        fetchCalendarEvents(),
        fetchAllComments(),
        fetchDocuments(),
        fetchScripts(),
        fetchAllScriptComments(),
      ]);
      setAllVideosState(vids);
      setAllEventsState(evts);
      setCommentsState(cmts);
      setAllDocumentsState(docs);
      setAllScriptsState(scrs);
      setScriptComments(scrCmts);
      initialLoadDone.current = true;
    }
    load();
  }, [user, migrateLocalStorage]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("app-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => {
        fetchVideos().then(setAllVideosState);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
        fetchCalendarEvents().then(setAllEventsState);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "video_comments" }, () => {
        fetchAllComments().then(setCommentsState);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        fetchDocuments().then(setAllDocumentsState);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "scripts" }, () => {
        fetchScripts().then(setAllScriptsState);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "script_comments" }, () => {
        fetchAllScriptComments().then(setScriptComments);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Wrapper setters that also update DB state locally
  const setVideos = useCallback((updater: Video[] | ((prev: Video[]) => Video[])) => {
    setAllVideosState((prev) => typeof updater === "function" ? updater(prev) : updater);
  }, []);
  const setCalendarEvents = useCallback((updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
    setAllEventsState((prev) => typeof updater === "function" ? updater(prev) : updater);
  }, []);
  const setComments = useCallback((updater: Record<string, Comment[]> | ((prev: Record<string, Comment[]>) => Record<string, Comment[]>)) => {
    setCommentsState((prev) => typeof updater === "function" ? updater(prev) : updater);
  }, []);
  const setDocuments = useCallback((updater: Document[] | ((prev: Document[]) => Document[])) => {
    setAllDocumentsState((prev) => typeof updater === "function" ? updater(prev) : updater);
  }, []);
  const setScripts = useCallback((updater: Script[] | ((prev: Script[]) => Script[])) => {
    setAllScriptsState((prev) => typeof updater === "function" ? updater(prev) : updater);
  }, []);

  // ── Fetch clients ──
  useEffect(() => {
    async function loadClients() {
      try {
        const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
        if (pErr || !profiles) {
          console.error("Error loading profiles:", pErr);
          try {
            const cached = localStorage.getItem("dv_clients_cache");
            if (cached) setClients(JSON.parse(cached));
          } catch { /* ignore */ }
          setIsLoadingClients(false);
          return;
        }

        const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
        if (rErr) { console.error("Error loading roles:", rErr); }
        const roleMap = new Map<string, string>();
        roles?.forEach((r) => roleMap.set(r.user_id, r.role));

        const clientProfiles = profiles.filter((p) => {
          const role = roleMap.get(p.user_id);
          return !role || role === "cliente";
        });

        const colors = ["#D4AF37", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
        const mapped: Client[] = clientProfiles.map((p, i) => {
          let profileData = null;
          try {
            profileData = JSON.parse(localStorage.getItem(`dv_client_profile_${p.user_id}`) || "null");
          } catch { /* ignore */ }

          return {
            id: p.user_id,
            nombre: p.display_name || p.email?.split("@")[0] || "Cliente",
            empresa: profileData?.businessName || p.business || "",
            especialidad: profileData?.industry || "",
            avatar: (p.display_name || "CL").substring(0, 2).toUpperCase(),
            colorAccent: colors[i % colors.length],
            plataformas: profileData?.socialNetworks
              ? Object.keys(profileData.socialNetworks)
              : [],
            estado: "activa" as const,
            email: p.email || "",
            rol: "cliente" as const,
          };
        });

        setClients(mapped);
        localStorage.setItem("dv_clients_cache", JSON.stringify(mapped));
      } catch (err) {
        console.error("Error in loadClients:", err);
        try {
          const cached = localStorage.getItem("dv_clients_cache");
          if (cached) setClients(JSON.parse(cached));
        } catch { /* ignore */ }
      } finally {
        setIsLoadingClients(false);
      }
    }
    loadClients();
  }, [user]);

  // Auto-select first client if admin and none selected
  useEffect(() => {
    if (!clients.length) return;

    // If no client selected, auto-select the first one
    if (!selectedClienteId) {
      setSelectedClienteId(clients[0].id);
      return;
    }

    // If selected client doesn't exist, try to resolve legacy slug
    const exists = clients.some((client) => client.id === selectedClienteId);
    if (exists) return;

    const normalized = clients.find((client) => {
      const slug = client.nombre.toLowerCase().replace(/\./g, "").replace(/\s+/g, "-");
      const withoutTitle = client.nombre
        .split(" ")
        .filter((part) => !part.match(/^(dr|dra|ing|lic|prof)\.?$/i))
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, "-");
      return slug === selectedClienteId || withoutTitle === selectedClienteId;
    });

    if (normalized) {
      setSelectedClienteId(normalized.id);
    } else {
      // Fallback to first client
      setSelectedClienteId(clients[0].id);
    }
  }, [clients, selectedClienteId, setSelectedClienteId]);

  const isClient = user?.role === "cliente";
  const clienteId = isClient ? user?.clienteId : selectedClienteId;

  const videos = useMemo(() =>
    clienteId ? allVideos.filter((v) => v.clienteId === clienteId) : allVideos,
    [allVideos, clienteId]
  );
  const documents = useMemo(() =>
    clienteId ? allDocuments.filter((d) => d.clienteId === clienteId) : allDocuments,
    [allDocuments, clienteId]
  );
  const scriptsFiltered = useMemo(() =>
    clienteId ? allScripts.filter((s) => s.clienteId === clienteId) : allScripts,
    [allScripts, clienteId]
  );
  const calendarEvents = useMemo(() =>
    clienteId ? allCalendarEvents.filter((e) => e.clienteId === clienteId) : allCalendarEvents,
    [allCalendarEvents, clienteId]
  );

  const addNotification = useCallback((n: Omit<Notification, "id">) => {
    const notification: Notification = { ...n, id: `n_${Date.now()}` };
    setNotifications((prev) => [notification, ...prev]);
  }, [setNotifications]);

  const approveVideo = useCallback(async (videoId: string) => {
    const now = new Date().toISOString();
    const video = allVideos.find((v) => v.id === videoId);
    if (!video) return;
    const newHistory = [...video.statusHistory, { status: "Aprobado", date: now.split("T")[0], by: user?.name || "Cliente" }];
    try {
      await updateVideoStatus(videoId, "approved", newHistory);
    } catch { /* realtime will sync */ }
    addNotification({
      type: "video_aprobado",
      message: `${user?.name || "Cliente"} aprobó '${video.title}'`,
      date: now, read: false, link: "/videos",
    });
  }, [allVideos, user, addNotification]);

  const requestChanges = useCallback(async (videoId: string, comment: string) => {
    const now = new Date().toISOString();
    const video = allVideos.find((v) => v.id === videoId);
    if (!video) return;
    const newHistory = [...video.statusHistory, { status: "Cambios solicitados", date: now.split("T")[0], by: user?.name || "Cliente" }];
    try {
      await updateVideoStatus(videoId, "changes", newHistory);
      await insertComment(videoId, user?.name || "Cliente", comment, user?.role === "cliente", user?.id || "");
    } catch { /* realtime will sync */ }
    addNotification({
      type: "video_cambios",
      message: `${user?.name || "Cliente"} solicitó cambios en '${video.title}'`,
      date: now, read: false, link: "/videos",
    });
  }, [allVideos, user, addNotification]);

  const addComment = useCallback(async (videoId: string, text: string) => {
    try {
      await insertComment(videoId, user?.name || "Usuario", text, user?.role === "cliente", user?.id || "");
    } catch { /* realtime will sync */ }
  }, [user]);

  // Script DB-backed functions
  const approveScript = useCallback(async (scriptId: string) => {
    const now = new Date().toISOString();
    const script = allScripts.find((s) => s.id === scriptId);
    if (!script) return;
    const newHistory = [...script.statusHistory, { status: "Aprobado", date: now.split("T")[0], by: user?.name || "Cliente" }];
    try {
      await updateScript(scriptId, { status: "aprobado", statusHistory: newHistory });
    } catch (err) { console.error(err); }
    addNotification({
      type: "script_aprobado",
      message: `${user?.name || "Cliente"} aprobó el guión "${script.title}"`,
      date: now, read: false, link: "/documentos",
    });
  }, [allScripts, user, addNotification]);

  const requestChangesScript = useCallback(async (scriptId: string, text: string) => {
    const now = new Date().toISOString();
    const script = allScripts.find((s) => s.id === scriptId);
    if (!script) return;
    const newHistory = [...script.statusHistory, { status: "Cambios solicitados", date: now.split("T")[0], by: user?.name || "Cliente" }];
    try {
      await updateScript(scriptId, { status: "cambios_solicitados", statusHistory: newHistory });
      await insertScriptComment(scriptId, user?.name || "Cliente", text, user?.role === "cliente", user?.id || "");
    } catch (err) { console.error(err); }
    addNotification({
      type: "script_cambios",
      message: `${user?.name || "Cliente"} solicitó cambios en "${script.title}"`,
      date: now, read: false, link: "/documentos",
    });
  }, [allScripts, user, addNotification]);

  const addScriptComment = useCallback(async (scriptId: string, commentText: string) => {
    try {
      await insertScriptComment(scriptId, user?.name || "Usuario", commentText, user?.role === "cliente", user?.id || "");
    } catch (err) { console.error(err); }
  }, [user]);

  const markScriptViewed = useCallback(async (scriptId: string) => {
    try {
      await updateScript(scriptId, { visto: true });
    } catch (err) { console.error(err); }
  }, []);

  const addDocumentToDb = useCallback(async (doc: Omit<Document, "id">) => {
    await createDocument(doc);
  }, []);

  const addScriptToDb = useCallback(async (script: Omit<Script, "id">) => {
    await createScript(script);
  }, []);

  const removeDocumentFromDb = useCallback(async (id: string) => {
    await deleteDocument(id);
  }, []);

  const removeScriptFromDb = useCallback(async (id: string) => {
    await deleteScript(id);
  }, []);

  const updateDocumentInDb = useCallback(async (id: string, updates: Partial<Document>) => {
    await updateDocument(id, updates);
  }, []);


  // ── Import from Apify → writes directly to Supabase ──
  const importFromApify = useCallback(async (newVideos: Video[], newEvents: CalendarEvent[]): Promise<ImportResult> => {
    const targetClient = newVideos[0]?.clienteId || newEvents[0]?.clienteId || "";

    // Deduplicate videos
    const existingKeys = await getExistingShortCodes(targetClient);
    const uniqueVideos = newVideos.filter((v) => {
      const key = (v as any).igShortCode || v.embedUrl || "";
      return key && !existingKeys.has(key);
    });
    const videosSkipped = newVideos.length - uniqueVideos.length;

    // Deduplicate events
    const existingEventKeys = await getExistingEventKeys(targetClient);
    const uniqueEvents = newEvents.filter((e) => {
      const sc = (e as any).igShortCode;
      if (sc && existingEventKeys.has(sc)) return false;
      const fallback = `${e.date}|${e.title}|${e.clienteId}`;
      return !existingEventKeys.has(fallback);
    });
    const eventsSkipped = newEvents.length - uniqueEvents.length;

    // Insert into DB
    let videosAdded = 0;
    let eventsAdded = 0;
    let metricsAdded = 0;

    try {
      const inserted = await insertVideos(uniqueVideos);
      videosAdded = inserted.length;

      // Persist thumbnails to storage (fire-and-forget, non-blocking)
      persistThumbnails(inserted).catch((err) =>
        console.error("Error persisting thumbnails:", err)
      );
    } catch (err) {
      console.error("Error inserting videos:", err);
    }

    try {
      const inserted = await insertCalendarEvents(uniqueEvents);
      eventsAdded = inserted.length;
    } catch (err) {
      console.error("Error inserting events:", err);
    }

    // Metrics from video IG data
    const igPosts = uniqueVideos
      .filter((v) => (v as any).igShortCode)
      .map((v) => ({
        url: v.embedUrl || "",
        thumbnail: v.thumbnail,
        title: (v as any).igCaption || v.title,
        date: v.deliveryDate,
        type: (v as any).igViews ? "REEL" : "POST",
        views: (v as any).igViews || 0,
        likes: (v as any).igLikes || 0,
        comments: (v as any).igComments || 0,
        shares: 0,
        reach: 0,
        engagement: (v as any).igViews && (v as any).igViews > 0
          ? (((v as any).igLikes || 0) + ((v as any).igComments || 0)) / (v as any).igViews * 100
          : 0,
        igShortCode: (v as any).igShortCode || "",
      }));

    try {
      metricsAdded = await insertPostMetrics(targetClient, "instagram", igPosts);
    } catch (err) {
      console.error("Error inserting metrics:", err);
    }

    const totalSkipped = videosSkipped + eventsSkipped;
    addNotification({
      type: "import_completado",
      message: `Importación: ${videosAdded} videos, ${eventsAdded} eventos${metricsAdded > 0 ? `, ${metricsAdded} métricas` : ""}${totalSkipped > 0 ? ` · ${totalSkipped} duplicados omitidos` : ""}`,
      date: new Date().toISOString(),
      read: false,
      link: "/videos",
    });

    return { videosAdded, videosSkipped, eventsAdded, eventsSkipped, metricsAdded, metricsSkipped: 0 };
  }, [addNotification]);

  return (
    <AppStateContext.Provider
      value={{
        videos, allVideos, setVideos,
        documents, allDocuments, setDocuments,
        scripts: scriptsFiltered, allScripts, setScripts,
        calendarEvents, allCalendarEvents, setCalendarEvents,
        notifications, setNotifications,
        comments, setComments,
        approveVideo, requestChanges, addComment, addNotification,
        isLoadingClients, selectedClienteId, setSelectedClienteId,
        clients,
        importFromApify,
        scriptComments, approveScript, requestChangesScript, addScriptComment, markScriptViewed,
        addDocumentToDb, addScriptToDb, removeDocumentFromDb, removeScriptFromDb, updateDocumentInDb,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be inside AppStateProvider");
  return ctx;
}
