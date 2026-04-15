import { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import {
  Video, Document, CalendarEvent, Notification, Comment, Script, Client,
} from "@/data/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";
import { PostMetric, PlatformMetrics, calculateMonthlySummary } from "@/services/metricsParser";
import { filterDuplicates } from "@/lib/deduplication";
import { supabase } from "@/integrations/supabase/client";

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
  selectedClienteId: string | null;
  setSelectedClienteId: (id: string | null) => void;
  clients: Client[];
  importFromApify: (videos: Video[], events: CalendarEvent[]) => ImportResult;
  // Script functions
  scriptComments: Record<string, Comment[]>;
  approveScript: (scriptId: string) => void;
  requestChangesScript: (scriptId: string, text: string) => void;
  addScriptComment: (scriptId: string, commentText: string) => void;
  markScriptViewed: (scriptId: string) => void;
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
  const [scriptComments, setScriptComments] = useLocalStorage<Record<string, Comment[]>>("dv_scripts_comments", {});
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
        type: "video_aprobado",
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
        type: "video_cambios",
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

  // Script functions
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
        date: now,
        read: false,
        link: "/documentos",
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
        date: now,
        read: false,
        link: "/documentos",
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

  const feedApifyToMetrics = useCallback((importedVideos: Video[], targetClienteId: string) => {
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

    if (igPosts.length === 0) return { added: 0, skipped: 0 };

    const metricsKey = `dv_metrics_${targetClienteId}_instagram`;
    try {
      const existing: PlatformMetrics | null = JSON.parse(localStorage.getItem(metricsKey) || "null");
      const existingPosts = existing?.posts || [];
      const { unique, duplicates } = filterDuplicates(
        igPosts,
        existingPosts,
        (p) => p.url || p.id
      );
      const allPosts = [...existingPosts, ...unique];
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
      return { added: unique.length, skipped: duplicates.length };
    } catch {
      return { added: 0, skipped: 0 };
    }
  }, []);

  const importFromApify = useCallback((newVideos: Video[], newEvents: CalendarEvent[]) => {
    const targetClient = newVideos[0]?.clienteId || newEvents[0]?.clienteId || "";

    let videosAdded = 0;
    let videosSkipped = 0;
    let eventsAdded = 0;
    let eventsSkipped = 0;

    setVideos((prev) => {
      const { unique, duplicates } = filterDuplicates(
        newVideos,
        prev,
        (v) => v.embedUrl || `${v.title}|${v.clienteId}|${v.deliveryDate}`
      );
      videosAdded = unique.length;
      videosSkipped = duplicates.length;
      return [...prev, ...unique];
    });

    setCalendarEvents((prev) => {
      const { unique, duplicates } = filterDuplicates(
        newEvents,
        prev,
        (e) => (e as any).igShortCode || `${e.date}|${e.title}|${e.clienteId}`
      );
      eventsAdded = unique.length;
      eventsSkipped = duplicates.length;
      return [...prev, ...unique];
    });

    const metricsResult = feedApifyToMetrics(newVideos, targetClient);
    const totalSkipped = videosSkipped + eventsSkipped;

    addNotification({
      type: "import_completado",
      message: `Importación: ${videosAdded} videos, ${eventsAdded} eventos${metricsResult.added > 0 ? `, ${metricsResult.added} métricas` : ""}${totalSkipped > 0 ? ` · ${totalSkipped} duplicados omitidos` : ""}`,
      date: new Date().toISOString(),
      read: false,
      link: "/videos",
    });

    return { videosAdded, videosSkipped, eventsAdded, eventsSkipped, metricsAdded: metricsResult.added, metricsSkipped: metricsResult.skipped };
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
