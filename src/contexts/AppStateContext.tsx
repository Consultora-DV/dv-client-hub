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
} from "@/services/supabaseDataService";

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

  // Still localStorage-backed (not part of shared import flow)
  const [allDocuments, setDocuments] = useLocalStorage<Document[]>("dv_documents_state", []);
  const [allScripts, setScripts] = useLocalStorage<Script[]>("dv_scripts_state", []);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>("dv_notifications_state", []);
  const [scriptComments, setScriptComments] = useLocalStorage<Record<string, Comment[]>>("dv_scripts_comments", {});
  const [selectedClienteId, setSelectedClienteId] = useLocalStorage<string | null>("dv_selected_cliente", null);

  const initialLoadDone = useRef(false);

  // ── Migrate localStorage data to DB (one-time) ──
  const migrateLocalStorage = useCallback(async () => {
    const migrationKey = "dv_migration_to_db_done";
    if (localStorage.getItem(migrationKey) === "true") return;

    try {
      // Read localStorage videos
      const localVideosRaw = localStorage.getItem("dv_videos_state");
      const localVideos: Video[] = localVideosRaw ? JSON.parse(localVideosRaw) : [];

      // Read localStorage events
      const localEventsRaw = localStorage.getItem("dv_calendar_state");
      const localEvents: CalendarEvent[] = localEventsRaw ? JSON.parse(localEventsRaw) : [];

      if (localVideos.length > 0) {
        // Check existing to avoid duplicates
        const existingVids = await fetchVideos();
        const existingCodes = new Set(existingVids.map((v: Video) => (v as any).igShortCode || v.embedUrl).filter(Boolean));
        const newVids = localVideos.filter((v) => {
          const key = (v as any).igShortCode || v.embedUrl;
          return key && !existingCodes.has(key);
        });
        if (newVids.length > 0) {
          await insertVideos(newVids);
          console.log(`Migrated ${newVids.length} videos from localStorage to DB`);
        }
      }

      if (localEvents.length > 0) {
        const existingEvts = await fetchCalendarEvents();
        const existingKeys = new Set(existingEvts.map((e: CalendarEvent) => (e as any).igShortCode || `${e.date}|${e.title}`).filter(Boolean));
        const newEvts = localEvents.filter((e) => {
          const key = (e as any).igShortCode || `${e.date}|${e.title}`;
          return !existingKeys.has(key);
        });
        if (newEvts.length > 0) {
          await insertCalendarEvents(newEvts);
          console.log(`Migrated ${newEvts.length} events from localStorage to DB`);
        }
      }

      // Migrate metrics from localStorage
      const allKeys = Object.keys(localStorage).filter((k) => k.startsWith("dv_metrics_"));
      for (const key of allKeys) {
        try {
          const metrics: PlatformMetrics = JSON.parse(localStorage.getItem(key) || "null");
          if (!metrics?.posts?.length) continue;
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
          await insertPostMetrics(metrics.clienteId, metrics.platform, posts);
          console.log(`Migrated ${posts.length} metrics for ${metrics.clienteId}`);
        } catch { /* skip broken entries */ }
      }

      localStorage.setItem(migrationKey, "true");
      console.log("localStorage → DB migration complete");
    } catch (err) {
      console.error("Migration error:", err);
    }
  }, []);

  // ── Load data from DB ──
  useEffect(() => {
    if (!user) return;
    async function load() {
      await migrateLocalStorage();
      const [vids, evts, cmts] = await Promise.all([
        fetchVideos(),
        fetchCalendarEvents(),
        fetchAllComments(),
      ]);
      setAllVideosState(vids);
      setAllEventsState(evts);
      setCommentsState(cmts);
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

  // Script functions (still localStorage)
  const approveScript = useCallback((scriptId: string) => {
    const now = new Date().toISOString();
    setScripts((prev) =>
      prev.map((s) =>
        s.id === scriptId
          ? {
              ...s,
              status: "aprobado" as const,
              statusHistory: [...s.statusHistory, { status: "Aprobado", date: now.split("T")[0], by: user?.name || "Admin" }],
            }
          : s
      )
    );
    const script = allScripts.find((s) => s.id === scriptId);
    if (script) {
      addNotification({
        type: "script_aprobado",
        message: `${user?.name || "Admin"} aprobó el guión "${script.title}"`,
        date: now, read: false, link: "/documentos",
      });
    }
  }, [setScripts, allScripts, user, addNotification]);

  const requestChangesScript = useCallback((scriptId: string, text: string) => {
    const now = new Date().toISOString();
    setScripts((prev) =>
      prev.map((s) =>
        s.id === scriptId
          ? {
              ...s,
              status: "cambios_solicitados" as const,
              statusHistory: [...s.statusHistory, { status: "Cambios solicitados", date: now.split("T")[0], by: user?.name || "Admin" }],
            }
          : s
      )
    );
    const newComment: Comment = {
      id: `sc_${Date.now()}`,
      author: user?.name || "Admin",
      isClient: user?.role === "cliente",
      text,
      date: now,
    };
    setScriptComments((prev) => ({
      ...prev,
      [scriptId]: [newComment, ...(prev[scriptId] || [])],
    }));
    const script = allScripts.find((s) => s.id === scriptId);
    if (script) {
      addNotification({
        type: "script_cambios",
        message: `${user?.name || "Admin"} solicitó cambios en "${script.title}"`,
        date: now, read: false, link: "/documentos",
      });
    }
  }, [setScripts, setScriptComments, allScripts, user, addNotification]);

  const addScriptComment = useCallback((scriptId: string, commentText: string) => {
    const newComment: Comment = {
      id: `sc_${Date.now()}`,
      author: user?.name || "Usuario",
      isClient: user?.role === "cliente",
      text: commentText,
      date: new Date().toISOString(),
    };
    setScriptComments((prev) => ({
      ...prev,
      [scriptId]: [newComment, ...(prev[scriptId] || [])],
    }));
  }, [setScriptComments, user]);

  const markScriptViewed = useCallback((scriptId: string) => {
    setScripts((prev) =>
      prev.map((s) => s.id === scriptId ? { ...s, visto: true } : s)
    );
  }, [setScripts]);

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
