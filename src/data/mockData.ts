export interface Video {
  id: string;
  title: string;
  platform: "instagram" | "tiktok" | "youtube";
  status: "pending" | "approved" | "changes" | "published";
  thumbnail: string;
  deliveryDate: string;
  embedUrl?: string;
  driveLink: string;
  comments: Comment[];
  statusHistory: StatusChange[];
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
  title: string;
  date: string;
  status: "new" | "reviewed" | "approved";
  driveLink: string;
  isNew: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: "pdf" | "doc" | "sheet" | "slide";
  date: string;
  driveLink: string;
  isNew: boolean;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  platform: "instagram" | "tiktok" | "youtube";
  videoId?: string;
}

export interface MetricEntry {
  month: string;
  instagram: number;
  tiktok: number;
  youtube: number;
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

export const currentUser = {
  name: "Bianca Aldama",
  email: "bianca@aldamaboutique.com",
  avatar: "BA",
  business: "Aldama Boutique",
};

export const videos: Video[] = [
  {
    id: "v1",
    title: "Tendencias Primavera 2025 - Colección Exclusiva",
    platform: "instagram",
    status: "pending",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
    deliveryDate: "2025-04-18",
    embedUrl: "https://www.instagram.com/reel/C5example/",
    driveLink: "https://drive.google.com/file/d/example1",
    comments: [
      { id: "c1", author: "Equipo DV", isClient: false, text: "¡Hola Bianca! Aquí tienes el primer corte del reel. Revisa el audio y las transiciones.", date: "2025-04-12T10:30:00" },
      { id: "c2", author: "Bianca", isClient: true, text: "Se ve increíble, solo quisiera que el texto final dure un poco más.", date: "2025-04-12T14:15:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2025-04-08", by: "Equipo DV" },
      { status: "Pendiente de revisión", date: "2025-04-12", by: "Equipo DV" },
    ],
  },
  {
    id: "v2",
    title: "Behind the Scenes - Sesión Fotográfica",
    platform: "tiktok",
    status: "approved",
    thumbnail: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=300&fit=crop",
    deliveryDate: "2025-04-10",
    driveLink: "https://drive.google.com/file/d/example2",
    comments: [
      { id: "c3", author: "Bianca", isClient: true, text: "¡Me encanta! Aprobado.", date: "2025-04-09T16:00:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2025-04-05", by: "Equipo DV" },
      { status: "Pendiente de revisión", date: "2025-04-08", by: "Equipo DV" },
      { status: "Aprobado", date: "2025-04-09", by: "Bianca" },
    ],
  },
  {
    id: "v3",
    title: "5 Outfits para Evento Formal",
    platform: "youtube",
    status: "changes",
    thumbnail: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop",
    deliveryDate: "2025-04-20",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    driveLink: "https://drive.google.com/file/d/example3",
    comments: [
      { id: "c4", author: "Equipo DV", isClient: false, text: "Versión 1 lista para tu revisión.", date: "2025-04-11T09:00:00" },
      { id: "c5", author: "Bianca", isClient: true, text: "El outfit 3 no es el correcto, por favor cambiar por el vestido negro.", date: "2025-04-11T12:30:00" },
      { id: "c6", author: "Equipo DV", isClient: false, text: "Entendido, lo corregimos y te enviamos nueva versión mañana.", date: "2025-04-11T13:00:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2025-04-06", by: "Equipo DV" },
      { status: "Pendiente de revisión", date: "2025-04-11", by: "Equipo DV" },
      { status: "Cambios solicitados", date: "2025-04-11", by: "Bianca" },
    ],
  },
  {
    id: "v4",
    title: "Haul de Accesorios - Temporada Nueva",
    platform: "instagram",
    status: "published",
    thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop",
    deliveryDate: "2025-04-05",
    embedUrl: "https://www.instagram.com/reel/C5example2/",
    driveLink: "https://drive.google.com/file/d/example4",
    comments: [],
    statusHistory: [
      { status: "En producción", date: "2025-03-28", by: "Equipo DV" },
      { status: "Aprobado", date: "2025-04-02", by: "Bianca" },
      { status: "Publicado", date: "2025-04-05", by: "Equipo DV" },
    ],
  },
  {
    id: "v5",
    title: "Cómo Combinar Blazers en 2025",
    platform: "tiktok",
    status: "pending",
    thumbnail: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop",
    deliveryDate: "2025-04-22",
    driveLink: "https://drive.google.com/file/d/example5",
    comments: [],
    statusHistory: [
      { status: "Pendiente de revisión", date: "2025-04-13", by: "Equipo DV" },
    ],
  },
  {
    id: "v6",
    title: "Mi Rutina de Moda Consciente",
    platform: "youtube",
    status: "approved",
    thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop",
    deliveryDate: "2025-04-15",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    driveLink: "https://drive.google.com/file/d/example6",
    comments: [
      { id: "c7", author: "Bianca", isClient: true, text: "Perfecto, aprobado sin cambios.", date: "2025-04-13T11:00:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2025-04-01", by: "Equipo DV" },
      { status: "Aprobado", date: "2025-04-13", by: "Bianca" },
    ],
  },
];

export const scripts: Script[] = [
  { id: "s1", title: "Guión - Tendencias Primavera 2025", date: "2025-04-07", status: "approved", driveLink: "https://docs.google.com/document/d/example1", isNew: false },
  { id: "s2", title: "Guión - 5 Outfits Evento Formal", date: "2025-04-10", status: "reviewed", driveLink: "https://docs.google.com/document/d/example2", isNew: false },
  { id: "s3", title: "Guión - Cómo Combinar Blazers", date: "2025-04-13", status: "new", driveLink: "https://docs.google.com/document/d/example3", isNew: true },
  { id: "s4", title: "Guión - Rutina de Moda Consciente", date: "2025-04-06", status: "approved", driveLink: "https://docs.google.com/document/d/example4", isNew: false },
];

export const documents: Document[] = [
  { id: "d1", name: "Contrato de Servicios - Aldama Boutique", type: "pdf", date: "2025-01-15", driveLink: "https://drive.google.com/file/d/contract1", isNew: false },
  { id: "d2", name: "Brief de Marca Personal", type: "doc", date: "2025-02-01", driveLink: "https://drive.google.com/file/d/brief1", isNew: false },
  { id: "d3", name: "Reporte Mensual - Marzo 2025", type: "sheet", date: "2025-04-03", driveLink: "https://drive.google.com/file/d/report1", isNew: true },
];

export const calendarEvents: CalendarEvent[] = [
  { id: "e1", date: "2025-04-05", title: "Haul de Accesorios", platform: "instagram", videoId: "v4" },
  { id: "e2", date: "2025-04-10", title: "Behind the Scenes", platform: "tiktok", videoId: "v2" },
  { id: "e3", date: "2025-04-15", title: "Rutina Moda Consciente", platform: "youtube", videoId: "v6" },
  { id: "e4", date: "2025-04-18", title: "Tendencias Primavera", platform: "instagram", videoId: "v1" },
  { id: "e5", date: "2025-04-20", title: "5 Outfits Formal", platform: "youtube", videoId: "v3" },
  { id: "e6", date: "2025-04-22", title: "Combinar Blazers", platform: "tiktok", videoId: "v5" },
  { id: "e7", date: "2025-04-25", title: "Tips de Estilo Casual", platform: "instagram" },
  { id: "e8", date: "2025-04-28", title: "Marcas Sustentables", platform: "tiktok" },
  { id: "e9", date: "2025-05-02", title: "Lookbook Mayo", platform: "youtube" },
  { id: "e10", date: "2025-05-05", title: "Accesorios Imprescindibles", platform: "instagram" },
];

export const followersData: MetricEntry[] = [
  { month: "Nov", instagram: 12400, tiktok: 8200, youtube: 3100 },
  { month: "Dic", instagram: 14100, tiktok: 10500, youtube: 3400 },
  { month: "Ene", instagram: 16800, tiktok: 13200, youtube: 3900 },
  { month: "Feb", instagram: 19200, tiktok: 16800, youtube: 4500 },
  { month: "Mar", instagram: 22500, tiktok: 21000, youtube: 5200 },
  { month: "Abr", instagram: 25100, tiktok: 24500, youtube: 5800 },
];

export const weeklyReach: WeeklyReach[] = [
  { week: "Sem 1", reach: 45000 },
  { week: "Sem 2", reach: 62000 },
  { week: "Sem 3", reach: 58000 },
  { week: "Sem 4", reach: 78000 },
  { week: "Sem 5", reach: 85000 },
  { week: "Sem 6", reach: 92000 },
  { week: "Sem 7", reach: 88000 },
  { week: "Sem 8", reach: 105000 },
];

export const engagementDistribution = [
  { name: "Instagram", value: 45, fill: "hsl(330, 70%, 55%)" },
  { name: "TikTok", value: 35, fill: "hsl(0, 0%, 60%)" },
  { name: "YouTube", value: 20, fill: "hsl(0, 80%, 50%)" },
];

export const topPost = {
  title: "Haul de Accesorios - Temporada Nueva",
  platform: "instagram" as const,
  likes: 4520,
  comments: 328,
  shares: 891,
  reach: 125000,
};

export const notifications: Notification[] = [
  { id: "n1", type: "video_ready", message: "Nuevo video listo para revisión: Cómo Combinar Blazers", date: "2025-04-13T14:00:00", read: false, link: "/videos" },
  { id: "n2", type: "guion_nuevo", message: "Nuevo guión disponible: Cómo Combinar Blazers", date: "2025-04-13T10:00:00", read: false, link: "/documentos" },
  { id: "n3", type: "documento_nuevo", message: "Nuevo documento: Reporte Mensual Marzo", date: "2025-04-12T16:00:00", read: false, link: "/documentos" },
  { id: "n4", type: "video_ready", message: "Video actualizado: Tendencias Primavera 2025", date: "2025-04-12T10:30:00", read: true, link: "/videos" },
  { id: "n5", type: "metricas_actualizadas", message: "Métricas de Marzo actualizadas", date: "2025-04-03T09:00:00", read: true, link: "/metricas" },
  { id: "n6", type: "guion_nuevo", message: "Guión revisado: 5 Outfits para Evento Formal", date: "2025-04-02T11:00:00", read: true, link: "/documentos" },
];
