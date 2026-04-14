import { createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import {
  videos as mockVideos, documents as mockDocuments, calendarEvents as mockCalendarEvents,
  notifications as mockNotifications, scripts as mockScripts,
  Video, Document, CalendarEvent, Notification, Comment, Script, clients,
} from "@/data/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";

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
}

const AppStateContext = createContext<AppStateContextType | null>(null);

const initialComments: Record<string, Comment[]> = {};
mockVideos.forEach((v) => {
  if (v.comments.length > 0) initialComments[v.id] = [...v.comments];
});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allVideos, setVideos] = useLocalStorage<Video[]>("dv_videos_state", mockVideos);
  const [allDocuments, setDocuments] = useLocalStorage<Document[]>("dv_documents_state", mockDocuments);
  const [allScripts, setScripts] = useLocalStorage<Script[]>("dv_scripts_state", mockScripts);
  const [allCalendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>("dv_calendar_state", mockCalendarEvents);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>("dv_notifications_state", mockNotifications);
  const [comments, setComments] = useLocalStorage<Record<string, Comment[]>>("dv_comments_state", initialComments);
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
