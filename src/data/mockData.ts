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

export interface Notification {
  id: string;
  type: "video_ready" | "guion_nuevo" | "metricas_actualizadas" | "documento_nuevo";
  message: string;
  date: string;
  read: boolean;
  link: string;
}

export const clients: Client[] = [
  {
    id: "fedra-aldama",
    nombre: "Dra. Fedra Aldama Castro",
    empresa: "Consulta Médica — Los Mochis, Sinaloa",
    especialidad: "Nutrición clínica, bariatría y balance metabólico",
    avatar: "FA",
    colorAccent: "#C084FC",
    plataformas: ["TikTok", "Instagram"],
    estado: "activa",
    email: "fedra@consultora-dv.mx",
    rol: "cliente",
  },
  {
    id: "bianca-aldama",
    nombre: "Bianca Aldama",
    empresa: "Bianca Aldama Boutique — Zapopan, GDL",
    especialidad: "Moda y calzado femenino",
    avatar: "BA",
    colorAccent: "#F472B6",
    plataformas: ["Instagram", "Facebook", "TikTok"],
    estado: "prospecto",
    email: "bianca@consultora-dv.mx",
    rol: "cliente",
  },
  {
    id: "hector-benazuza",
    nombre: "Héctor Benazuza",
    empresa: "Hacienda Benazuza — Zapopan, GDL",
    especialidad: "Venue de bodas y eventos de lujo",
    avatar: "HB",
    colorAccent: "#34D399",
    plataformas: ["Instagram", "TikTok", "Google Maps"],
    estado: "prospecto",
    email: "hector@consultora-dv.mx",
    rol: "cliente",
  },
];

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
