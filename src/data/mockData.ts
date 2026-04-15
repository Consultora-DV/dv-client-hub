export interface Client {
  id: string;
  nombre: string;
  empresa: string;
  especialidad: string;
  avatar: string;
  colorAccent: string;
  plataformas: string[];
  estado: "activa" | "prospecto";
  email: string;
  rol: "cliente";
}

export interface Video {
  id: string;
  clienteId: string;
  title: string;
  platform: string[];
  status: "pending" | "approved" | "changes" | "published";
  thumbnail: string;
  deliveryDate: string;
  embedUrl?: string;
  driveLink: string;
  comments: Comment[];
  statusHistory: StatusChange[];
  igCaption?: string;
  igLikes?: number;
  igComments?: number;
  igViews?: number;
  igHashtags?: string[];
  igShortCode?: string;
}

export interface Comment {
  id: string;
  author: string;
  isClient: boolean;
  text: string;
  date: string;
}

export interface StatusChange {
  status: string;
  date: string;
  by: string;
}

export interface Script {
  id: string;
  clienteId: string;
  title: string;
  date: string;
  status: "nuevo" | "en_revision" | "aprobado" | "cambios_solicitados";
  driveLink: string;
  isNew: boolean;
  visto: boolean;
  comments: Comment[];
  statusHistory: StatusChange[];
}

export interface Document {
  id: string;
  clienteId: string;
  name: string;
  type: "pdf" | "doc" | "sheet" | "slide";
  date: string;
  driveLink: string;
  isNew: boolean;
}

export interface CalendarEvent {
  id: string;
  clienteId: string;
  date: string;
  title: string;
  platform: string[];
  contentType?: string;
  time?: string;
  videoId?: string;
  igShortCode?: string;
}

export interface MetricEntry {
  month: string;
  instagram: number;
  tiktok: number;
  youtube: number;
  facebook?: number;
}

export interface WeeklyReach {
  week: string;
  reach: number;
}

export type NotificationType =
  | "video_ready"
  | "guion_nuevo"
  | "metricas_actualizadas"
  | "documento_nuevo"
  | "video_aprobado"
  | "video_cambios"
  | "script_aprobado"
  | "script_cambios"
  | "import_completado";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  date: string;
  read: boolean;
  link: string;
}

export const clients: Client[] = [];

export const currentUser = {
  name: "Consultora DV",
  email: "admin@consultora-dv.mx",
  avatar: "DV",
  business: "Panel de Administración",
};

export const videos: Video[] = [];
export const scripts: Script[] = [];
export const documents: Document[] = [];
export const calendarEvents: CalendarEvent[] = [];
export const notifications: Notification[] = [];

export const followersData: MetricEntry[] = [];
export const weeklyReach: WeeklyReach[] = [];

export const engagementDistribution = [
  { name: "Likes", value: 0, fill: "hsl(330, 70%, 55%)" },
  { name: "Comments", value: 0, fill: "hsl(0, 0%, 60%)" },
  { name: "Shares", value: 0, fill: "hsl(0, 80%, 50%)" },
];

export const topPost = {
  title: "—",
  platform: "instagram" as const,
  likes: 0,
  comments: 0,
  shares: 0,
  reach: 0,
};
