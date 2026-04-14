import { createContext, useContext, ReactNode, useCallback } from "react";
import { videos as mockVideos, documents as mockDocuments, calendarEvents as mockCalendarEvents, notifications as mockNotifications, Video, Document, CalendarEvent, Notification, Comment } from "@/data/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";

interface AppStateContextType {
  videos: Video[];
  setVideos: (v: Video[] | ((prev: Video[]) => Video[])) => void;
  documents: Document[];
  setDocuments: (d: Document[] | ((prev: Document[]) => Document[])) => void;
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (e: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => void;
  notifications: Notification[];
  setNotifications: (n: Notification[] | ((prev: Notification[]) => Notification[])) => void;
  comments: Record<string, Comment[]>;
  setComments: (c: Record<string, Comment[]> | ((prev: Record<string, Comment[]>) => Record<string, Comment[]>)) => void;
  approveVideo: (videoId: string) => void;
  requestChanges: (videoId: string, comment: string) => void;
  addComment: (videoId: string, text: string) => void;
  addNotification: (notification: Omit<Notification, "id">) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

// Build initial comments from mock videos
const initialComments: Record<string, Comment[]> = {};
mockVideos.forEach((v) => {
  if (v.comments.length > 0) initialComments[v.id] = [...v.comments];
});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [videos, setVideos] = useLocalStorage<Video[]>("dv_videos_state", mockVideos);
  const [documents, setDocuments] = useLocalStorage<Document[]>("dv_documents_state", mockDocuments);
  const [calendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>("dv_calendar_state", mockCalendarEvents);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>("dv_notifications_state", mockNotifications);
  const [comments, setComments] = useLocalStorage<Record<string, Comment[]>>("dv_comments_state", initialComments);

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
              statusHistory: [
                ...v.statusHistory,
                { status: "Aprobado", date: now.split("T")[0], by: user?.name || "Cliente" },
              ],
            }
          : v
      )
    );
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      addNotification({
        type: "video_ready",
        message: `${user?.name || "Cliente"} aprobó '${video.title}'`,
        date: now,
        read: false,
        link: "/videos",
      });
    }
  }, [setVideos, videos, user, addNotification]);

  const requestChanges = useCallback((videoId: string, comment: string) => {
    const now = new Date().toISOString();
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              status: "changes" as const,
              statusHistory: [
                ...v.statusHistory,
                { status: "Cambios solicitados", date: now.split("T")[0], by: user?.name || "Cliente" },
              ],
            }
          : v
      )
    );
    // Add the change request as a comment
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
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      addNotification({
        type: "video_ready",
        message: `${user?.name || "Cliente"} solicitó cambios en '${video.title}'`,
        date: now,
        read: false,
        link: "/videos",
      });
    }
  }, [setVideos, setComments, videos, user, addNotification]);

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
        videos, setVideos,
        documents, setDocuments,
        calendarEvents, setCalendarEvents,
        notifications, setNotifications,
        comments, setComments,
        approveVideo, requestChanges, addComment, addNotification,
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
