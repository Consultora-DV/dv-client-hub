import { createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import {
  Video, Document, CalendarEvent, Notification, Comment, Script, clients,
} from "@/data/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";
import { PostMetric, PlatformMetrics, calculateMonthlySummary } from "@/services/metricsParser";
import { filterDuplicates } from "@/lib/deduplication";

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
  selectedClienteId: string | null;
  setSelectedClienteId: (id: string | null) => void;
  clients: typeof clients;
  importFromApify: (videos: Video[], events: CalendarEvent[]) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allVideos, setVideos] = useLocalStorage<Video[]>("dv_videos_state", []);
  const [allDocuments, setDocuments] = useLocalStorage<Document[]>("dv_documents_state", []);
  const [allScripts, setScripts] = useLocalStorage<Script[]>("dv_scripts_state", []);
  const [allCalendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>("dv_calendar_state", []);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>("dv_notifications_state", []);
  const [comments, setComments] = useLocalStorage<Record<string, Comment[]>>("dv_comments_state", {});
  const [selectedClienteId, setSelectedClienteId] = useLocalStorage<string | null>("dv_selected_cliente", null);

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

  const approveVideo = useCallback((videoId: string) => {
    const now = new Date().toISOString();
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              status: "approved" as const,
              statusHistory: [...v.statusHistory, { status: "Aprobado", date: now.split("T")[0], by: user?.name || "Cliente" }],
            }
          : v
      )
    );
    const video = allVideos.find((v) => v.id === videoId);
    if (video) {
      addNotification({
        type: "video_ready",
        message: `${user?.name || "Cliente"} aprobó '${video.title}'`,
        date: now,
        read: false,
        link: "/videos",
      });
    }
  }, [setVideos, allVideos, user, addNotification]);

  const requestChanges = useCallback((videoId: string, comment: string) => {
    const now = new Date().toISOString();
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              status: "changes" as const,
              statusHistory: [...v.statusHistory, { status: "Cambios solicitados", date: now.split("T")[0], by: user?.name || "Cliente" }],
            }
          : v
      )
    );
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      author: user?.name || "Cliente",
      isClient: user?.role === "cliente",
      text: comment,
      date: now,
    };
    setComments((prev) => ({
      ...prev,
      [videoId]: [newComment, ...(prev[videoId] || [])],
    }));
    const video = allVideos.find((v) => v.id === videoId);
    if (video) {
      addNotification({
        type: "video_ready",
        message: `${user?.name || "Cliente"} solicitó cambios en '${video.title}'`,
        date: now,
        read: false,
        link: "/videos",
      });
    }
  }, [setVideos, setComments, allVideos, user, addNotification]);

  const addComment = useCallback((videoId: string, text: string) => {
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      author: user?.name || "Usuario",
      isClient: user?.role === "cliente",
      text,
      date: new Date().toISOString(),
    };
    setComments((prev) => ({
      ...prev,
      [videoId]: [newComment, ...(prev[videoId] || [])],
    }));
  }, [setComments, user]);

  const feedApifyToMetrics = useCallback((importedVideos: Video[], targetClienteId: string) => {
    // Convert imported IG videos to PostMetric and persist to metrics state
    const igPosts: PostMetric[] = importedVideos
      .filter((v) => v.igShortCode)
      .map((v) => ({
        id: v.igShortCode || v.id,
        url: v.embedUrl || "",
        thumbnail: v.thumbnail,
        title: v.igCaption || v.title,
        date: v.deliveryDate,
        type: v.igViews ? "REEL" : "POST",
        views: v.igViews || 0,
        likes: v.igLikes || 0,
        comments: v.igComments || 0,
        shares: 0,
        reach: 0,
        engagement: v.igViews && v.igViews > 0
          ? ((v.igLikes || 0) + (v.igComments || 0)) / v.igViews * 100
          : 0,
      }));

    if (igPosts.length === 0) return 0;

    const metricsKey = `dv_metrics_${targetClienteId}_instagram`;
    try {
      const existing: PlatformMetrics | null = JSON.parse(localStorage.getItem(metricsKey) || "null");
      const existingPosts = existing?.posts || [];
      const existingIds = new Set(existingPosts.map((p) => p.id));
      const newPosts = igPosts.filter((p) => !existingIds.has(p.id));
      const allPosts = [...existingPosts, ...newPosts];
      const summary = calculateMonthlySummary(allPosts);

      const updated: PlatformMetrics = {
        clienteId: targetClienteId,
        platform: "instagram",
        uploadedAt: new Date().toISOString(),
        fileName: existing?.fileName || "Importado desde Apify",
        posts: allPosts,
        monthlySummary: summary,
      };
      localStorage.setItem(metricsKey, JSON.stringify(updated));
      return newPosts.length;
    } catch {
      return 0;
    }
  }, []);

  const importFromApify = useCallback((newVideos: Video[], newEvents: CalendarEvent[]) => {
    const targetClient = newVideos[0]?.clienteId || newEvents[0]?.clienteId || "";

    setVideos((prev) => {
      const ids = new Set(prev.map((v) => v.id));
      return [...prev, ...newVideos.filter((v) => !ids.has(v.id))];
    });
    setCalendarEvents((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      return [...prev, ...newEvents.filter((e) => !ids.has(e.id))];
    });

    const metricsCount = feedApifyToMetrics(newVideos, targetClient);

    addNotification({
      type: "video_ready",
      message: `Importación completada: ${newVideos.length} videos y ${newEvents.length} eventos de Instagram${metricsCount > 0 ? ` · Métricas actualizadas con ${metricsCount} posts` : ""}`,
      date: new Date().toISOString(),
      read: false,
      link: "/videos",
    });
  }, [setVideos, setCalendarEvents, addNotification, feedApifyToMetrics]);

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
        selectedClienteId, setSelectedClienteId,
        clients,
        importFromApify,
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
