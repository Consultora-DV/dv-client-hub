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
  // Instagram import metadata
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

// ---- FEDRA ALDAMA ----
const fedraVideos: Video[] = [
  {
    id: "v-fa-1",
    clienteId: "fedra-aldama",
    title: "5 Mitos de la Nutrición Clínica",
    platform: ["tiktok"],
    status: "pending",
    thumbnail: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-18",
    embedUrl: "",
    driveLink: "https://drive.google.com/file/d/fedra1",
    comments: [
      { id: "c-fa-1", author: "Equipo DV", isClient: false, text: "Aquí el primer corte, Dra. Revisa el copy final.", date: "2026-04-12T10:00:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2026-04-08", by: "Equipo DV" },
      { status: "Pendiente de revisión", date: "2026-04-12", by: "Equipo DV" },
    ],
  },
  {
    id: "v-fa-2",
    clienteId: "fedra-aldama",
    title: "Recetas Bariatricas Fáciles",
    platform: ["instagram"],
    status: "approved",
    thumbnail: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-10",
    driveLink: "https://drive.google.com/file/d/fedra2",
    comments: [
      { id: "c-fa-2", author: "Dra. Fedra", isClient: true, text: "Perfecto, aprobado.", date: "2026-04-09T16:00:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2026-04-05", by: "Equipo DV" },
      { status: "Aprobado", date: "2026-04-09", by: "Dra. Fedra" },
    ],
  },
  {
    id: "v-fa-3",
    clienteId: "fedra-aldama",
    title: "Balance Metabólico Explicado",
    platform: ["tiktok"],
    status: "published",
    thumbnail: "https://images.unsplash.com/photo-1505576399279-0d309ade56b4?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-05",
    driveLink: "https://drive.google.com/file/d/fedra3",
    comments: [],
    statusHistory: [
      { status: "Publicado", date: "2026-04-05", by: "Equipo DV" },
    ],
  },
];

// ---- BIANCA ALDAMA ----
const biancaVideos: Video[] = [
  {
    id: "v-ba-1",
    clienteId: "bianca-aldama",
    title: "Tendencias Primavera 2026 — Colección Exclusiva",
    platform: ["instagram"],
    status: "pending",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-18",
    embedUrl: "https://www.instagram.com/reel/C5example/",
    driveLink: "https://drive.google.com/file/d/bianca1",
    comments: [
      { id: "c-ba-1", author: "Equipo DV", isClient: false, text: "¡Hola Bianca! Aquí el primer corte del reel.", date: "2026-04-12T10:30:00" },
      { id: "c-ba-2", author: "Bianca", isClient: true, text: "Se ve increíble, solo quiero que el texto final dure más.", date: "2026-04-12T14:15:00" },
    ],
    statusHistory: [
      { status: "En producción", date: "2026-04-08", by: "Equipo DV" },
      { status: "Pendiente de revisión", date: "2026-04-12", by: "Equipo DV" },
    ],
  },
  {
    id: "v-ba-2",
    clienteId: "bianca-aldama",
    title: "Behind the Scenes — Sesión Fotográfica",
    platform: ["tiktok"],
    status: "approved",
    thumbnail: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-10",
    driveLink: "https://drive.google.com/file/d/bianca2",
    comments: [
      { id: "c-ba-3", author: "Bianca", isClient: true, text: "¡Me encanta! Aprobado.", date: "2026-04-09T16:00:00" },
    ],
    statusHistory: [
      { status: "Aprobado", date: "2026-04-09", by: "Bianca" },
    ],
  },
  {
    id: "v-ba-3",
    clienteId: "bianca-aldama",
    title: "5 Outfits para Evento Formal",
    platform: ["youtube"],
    status: "changes",
    thumbnail: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-20",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    driveLink: "https://drive.google.com/file/d/bianca3",
    comments: [
      { id: "c-ba-4", author: "Equipo DV", isClient: false, text: "Versión 1 lista.", date: "2026-04-11T09:00:00" },
      { id: "c-ba-5", author: "Bianca", isClient: true, text: "El outfit 3 no es correcto, cambiar por el vestido negro.", date: "2026-04-11T12:30:00" },
    ],
    statusHistory: [
      { status: "Cambios solicitados", date: "2026-04-11", by: "Bianca" },
    ],
  },
];

// ---- HÉCTOR BENAZUZA ----
const hectorVideos: Video[] = [
  {
    id: "v-hb-1",
    clienteId: "hector-benazuza",
    title: "Recorrido Hacienda Benazuza 2026",
    platform: ["instagram"],
    status: "pending",
    thumbnail: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-20",
    driveLink: "https://drive.google.com/file/d/hector1",
    comments: [
      { id: "c-hb-1", author: "Equipo DV", isClient: false, text: "Héctor, aquí el primer corte del tour.", date: "2026-04-14T09:00:00" },
    ],
    statusHistory: [
      { status: "Pendiente de revisión", date: "2026-04-14", by: "Equipo DV" },
    ],
  },
  {
    id: "v-hb-2",
    clienteId: "hector-benazuza",
    title: "Bodas de Ensueño — Testimonial",
    platform: ["tiktok"],
    status: "approved",
    thumbnail: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&h=300&fit=crop",
    deliveryDate: "2026-04-08",
    driveLink: "https://drive.google.com/file/d/hector2",
    comments: [],
    statusHistory: [
      { status: "Aprobado", date: "2026-04-07", by: "Héctor" },
    ],
  },
];

export const videos: Video[] = [...fedraVideos, ...biancaVideos, ...hectorVideos];

export const scripts: Script[] = [
  { id: "s-fa-1", clienteId: "fedra-aldama", title: "Guión — 5 Mitos Nutrición", date: "2026-04-07", status: "aprobado", driveLink: "https://drive.google.com/file/d/fedra-guion1", isNew: false, visto: true, comments: [], statusHistory: [{ status: "Aprobado", date: "2026-04-07", by: "Dra. Fedra" }] },
  { id: "s-fa-2", clienteId: "fedra-aldama", title: "Guión — Recetas Bariatricas", date: "2026-04-13", status: "nuevo", driveLink: "https://drive.google.com/file/d/fedra-guion2", isNew: true, visto: false, comments: [], statusHistory: [{ status: "Nuevo", date: "2026-04-13", by: "Equipo DV" }] },
  { id: "s-ba-1", clienteId: "bianca-aldama", title: "Guión — Tendencias Primavera", date: "2026-04-07", status: "aprobado", driveLink: "https://drive.google.com/file/d/bianca-guion1", isNew: false, visto: true, comments: [{ id: "sc-1", author: "Bianca", isClient: true, text: "Perfecto, aprobado.", date: "2026-04-08T10:00:00" }], statusHistory: [{ status: "Aprobado", date: "2026-04-08", by: "Bianca" }] },
  { id: "s-ba-2", clienteId: "bianca-aldama", title: "Guión — 5 Outfits Formal", date: "2026-04-10", status: "en_revision", driveLink: "https://drive.google.com/file/d/bianca-guion2", isNew: false, visto: true, comments: [], statusHistory: [{ status: "En revisión", date: "2026-04-10", by: "Equipo DV" }] },
  { id: "s-ba-3", clienteId: "bianca-aldama", title: "Guión — Blazers 2026", date: "2026-04-13", status: "nuevo", driveLink: "https://drive.google.com/file/d/bianca-guion3", isNew: true, visto: false, comments: [], statusHistory: [{ status: "Nuevo", date: "2026-04-13", by: "Equipo DV" }] },
  { id: "s-hb-1", clienteId: "hector-benazuza", title: "Guión — Tour Hacienda", date: "2026-04-12", status: "nuevo", driveLink: "https://drive.google.com/file/d/hector-guion1", isNew: true, visto: false, comments: [], statusHistory: [{ status: "Nuevo", date: "2026-04-12", by: "Equipo DV" }] },
  { id: "s-hb-2", clienteId: "hector-benazuza", title: "Guión — Testimonial Bodas", date: "2026-04-06", status: "aprobado", driveLink: "https://drive.google.com/file/d/hector-guion2", isNew: false, visto: true, comments: [], statusHistory: [{ status: "Aprobado", date: "2026-04-06", by: "Héctor" }] },
];

export const documents: Document[] = [
  { id: "d-fa-1", clienteId: "fedra-aldama", name: "Contrato de Servicios — Dra. Fedra", type: "pdf", date: "2026-01-15", driveLink: "#", isNew: false },
  { id: "d-fa-2", clienteId: "fedra-aldama", name: "Estrategia Redes — Fedra Q2", type: "doc", date: "2026-04-12", driveLink: "#", isNew: true },
  { id: "d-ba-1", clienteId: "bianca-aldama", name: "Contrato — Bianca Aldama Boutique", type: "pdf", date: "2026-01-20", driveLink: "#", isNew: false },
  { id: "d-ba-2", clienteId: "bianca-aldama", name: "Brief de Marca Personal", type: "doc", date: "2026-02-01", driveLink: "#", isNew: false },
  { id: "d-ba-3", clienteId: "bianca-aldama", name: "Reporte Mensual — Marzo 2026", type: "sheet", date: "2026-04-03", driveLink: "#", isNew: true },
  { id: "d-hb-1", clienteId: "hector-benazuza", name: "Propuesta Hacienda Benazuza", type: "slide", date: "2026-03-20", driveLink: "#", isNew: false },
  { id: "d-hb-2", clienteId: "hector-benazuza", name: "Diseño Feed Instagram — Hacienda", type: "doc", date: "2026-04-11", driveLink: "#", isNew: true },
];

export const calendarEvents: CalendarEvent[] = [
  { id: "e-fa-1", clienteId: "fedra-aldama", date: "2026-04-05", title: "Balance Metabólico", platform: ["tiktok"], contentType: "reel" },
  { id: "e-fa-2", clienteId: "fedra-aldama", date: "2026-04-18", title: "5 Mitos Nutrición", platform: ["tiktok", "instagram"], contentType: "reel" },
  { id: "e-fa-3", clienteId: "fedra-aldama", date: "2026-04-25", title: "Tips Bariatría", platform: ["instagram"], contentType: "carrusel" },
  { id: "e-ba-1", clienteId: "bianca-aldama", date: "2026-04-10", title: "Behind the Scenes", platform: ["tiktok"], contentType: "reel", videoId: "v-ba-2" },
  { id: "e-ba-2", clienteId: "bianca-aldama", date: "2026-04-18", title: "Tendencias Primavera", platform: ["instagram", "facebook"], contentType: "reel", videoId: "v-ba-1" },
  { id: "e-ba-3", clienteId: "bianca-aldama", date: "2026-04-22", title: "Lookbook Mayo", platform: ["instagram", "tiktok"], contentType: "carrusel" },
  { id: "e-hb-1", clienteId: "hector-benazuza", date: "2026-04-20", title: "Tour Hacienda", platform: ["instagram", "tiktok"], contentType: "reel", videoId: "v-hb-1" },
  { id: "e-hb-2", clienteId: "hector-benazuza", date: "2026-04-28", title: "Bodas de Ensueño", platform: ["instagram", "tiktok", "youtube"], contentType: "reel" },
  { id: "e-hb-3", clienteId: "hector-benazuza", date: "2026-05-05", title: "Eventos Corporativos", platform: ["instagram"], contentType: "post" },
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
  title: "Haul de Accesorios — Temporada Nueva",
  platform: "instagram" as const,
  likes: 4520,
  comments: 328,
  shares: 891,
  reach: 125000,
};

export const notifications: Notification[] = [
  { id: "n1", type: "video_ready", message: "Nuevo video listo: 5 Mitos de la Nutrición (Dra. Fedra)", date: "2026-04-13T14:00:00", read: false, link: "/videos" },
  { id: "n2", type: "guion_nuevo", message: "Nuevo guión: Blazers 2026 (Bianca)", date: "2026-04-13T10:00:00", read: false, link: "/documentos" },
  { id: "n3", type: "documento_nuevo", message: "Nuevo documento: Diseño Feed (Héctor)", date: "2026-04-12T16:00:00", read: false, link: "/documentos" },
  { id: "n4", type: "video_ready", message: "Video actualizado: Tendencias Primavera (Bianca)", date: "2026-04-12T10:30:00", read: true, link: "/videos" },
  { id: "n5", type: "metricas_actualizadas", message: "Métricas de Marzo actualizadas", date: "2026-04-03T09:00:00", read: true, link: "/metricas" },
];
