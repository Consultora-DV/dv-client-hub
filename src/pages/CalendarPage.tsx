import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Plus, Trash2, ExternalLink,
  Play, Calendar, Image, Target,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { CalendarEvent } from "@/data/mockData";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { insertCalendarEvents } from "@/services/supabaseDataService";
import { supabase } from "@/integrations/supabase/client";
import { SOURCE_CONFIG, FILTER_GROUPS, CalendarEventSource } from "@/services/timelineService";

// ── Platform colors for manual events ────────────────────────
const platformColors: Record<string, string> = {
  instagram: "bg-instagram",
  tiktok: "bg-foreground",
  youtube: "bg-youtube",
  facebook: "bg-status-published",
  "google maps": "bg-status-approved",
};

const allPlatforms = ["instagram", "tiktok", "youtube", "facebook", "google maps"];
const platformLabels: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", "google maps": "Google Maps",
};
const contentTypes = ["reel", "story", "post", "carrusel", "short", "live", "reseña"];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── Event colour logic ────────────────────────────────────────

function eventColor(event: CalendarEvent): string {
  const src = event.eventSource || "manual";
  return SOURCE_CONFIG[src as CalendarEventSource]?.color ?? "#9CA3AF";
}

function eventEmoji(event: CalendarEvent): string {
  const src = event.eventSource || "manual";
  return SOURCE_CONFIG[src as CalendarEventSource]?.emoji ?? "📌";
}

function eventLabel(event: CalendarEvent): string {
  const src = event.eventSource || "manual";
  return SOURCE_CONFIG[src as CalendarEventSource]?.label ?? "Manual";
}

// ── Add Event Modal ───────────────────────────────────────────

function AddEventModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { allCalendarEvents, clients } = useAppState();
  const [title, setTitle] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [contentType, setContentType] = useState("reel");
  const [time, setTime] = useState("12:00");
  const [clienteId, setClienteId] = useState(clients[0]?.id || "");
  const [saving, setSaving] = useState(false);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleSave = async () => {
    if (!title.trim() || platforms.length === 0) return;
    const isDuplicate = allCalendarEvents.some(
      (e) => e.date === date && e.title === title.trim() && e.clienteId === clienteId
    );
    if (isDuplicate) {
      toast.error("Ya existe un evento con este título en esta fecha para este cliente.");
      return;
    }
    const newEvent: CalendarEvent = {
      id: "",
      clienteId,
      date,
      title: title.trim(),
      platform: platforms,
      contentType,
      time,
      eventSource: "manual",
    };
    setSaving(true);
    try {
      await insertCalendarEvents([newEvent]);
      toast.success("Evento agregado al calendario");
      onClose();
    } catch {
      toast.error("Error al guardar el evento. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Nueva Publicación</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Fecha: {date}</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="Nombre de la publicación" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Plataformas</label>
            <div className="flex gap-2 flex-wrap">
              {allPlatforms.map((p) => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    platforms.includes(p) ? `${platformColors[p]} text-foreground border-transparent` : "bg-secondary text-muted-foreground border-border/50"
                  }`}>
                  {platformLabels[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tipo de contenido</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {contentTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Cliente asignado</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Hora de publicación</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-secondary border-border/50 rounded-xl" />
          </div>
          <Button onClick={handleSave} disabled={saving || !title.trim() || platforms.length === 0}
            className="w-full gold-gradient text-primary-foreground rounded-xl h-11">
            {saving ? "Guardando..." : "Agregar al calendario"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Rich EventPill ────────────────────────────────────────────

function EventPill({ event, onNavigate }: { event: CalendarEvent; onNavigate: (path: string) => void }) {
  const { allVideos } = useAppState();
  const color = eventColor(event);
  const emoji = eventEmoji(event);
  const srcLabel = eventLabel(event);
  const meta = event.metadata || {};

  const linkedVideo = event.videoId ? allVideos.find((v) => v.id === event.videoId) : null;
  const igUrl = event.igShortCode
    ? `https://www.instagram.com/reel/${event.igShortCode}/`
    : (meta.permalink || linkedVideo?.embedUrl || null);
  const fbUrl = event.eventSource === "fb_post" ? (meta.permalink || null) : null;
  const thumbnail = meta.thumbnail || linkedVideo?.thumbnail || null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded truncate cursor-default text-[10px] font-medium"
            style={{ backgroundColor: `${color}22`, borderLeft: `2px solid ${color}` }}
          >
            <span>{emoji}</span>
            <span className="truncate" style={{ color }}>{event.title.slice(0, 18)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          className="glass gold-border p-0 max-w-[240px] overflow-hidden rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Thumbnail */}
          {thumbnail && (
            <div className="relative w-full aspect-video bg-secondary overflow-hidden">
              <img src={thumbnail} alt={event.title} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = "none"} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white">{srcLabel}</span>
            </div>
          )}
          <div className="p-3 space-y-2">
            {/* Source badge + title */}
            <div className="flex items-start gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: `${color}22`, color }}>
                {emoji} {srcLabel}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground leading-snug">{event.title}</p>
            {event.time && <p className="text-[10px] text-muted-foreground">{event.time}</p>}

            {/* Metrics */}
            {(meta.likes || meta.comments || meta.spend) && (
              <div className="flex gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                {meta.likes != null && <span>❤️ {meta.likes?.toLocaleString()}</span>}
                {meta.comments != null && <span>💬 {meta.comments?.toLocaleString()}</span>}
                {meta.spend != null && <span>💰 ${meta.spend?.toFixed(0)}</span>}
                {meta.roas != null && <span>📈 {meta.roas?.toFixed(2)}x</span>}
              </div>
            )}

            {/* Links */}
            <div className="flex flex-col gap-1">
              {event.videoId && (
                <button onClick={(e) => { e.stopPropagation(); onNavigate("/videos"); }}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  <Play className="h-3 w-3" /> Ver en Videos
                </button>
              )}
              {(igUrl && !fbUrl) && (
                <a href={igUrl} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Ver en Instagram
                </a>
              )}
              {fbUrl && (
                <a href={fbUrl} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Ver en Facebook
                </a>
              )}
              {event.eventSource === "meta_ad" && (
                <button onClick={(e) => { e.stopPropagation(); onNavigate("/ads"); }}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  <Target className="h-3 w-3" /> Ver en Ads
                </button>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main CalendarPage ─────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents, setCalendarEvents } = useAppState();
  const { canAddCalendarEvents, isAdmin } = usePermissions();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [addEventDate, setAddEventDate] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [dragEventId, setDragEventId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDayIndex, daysInMonth]);

  // Count events per source group for filter badges
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: calendarEvents.length };
    for (const ev of calendarEvents) {
      const cfg = SOURCE_CONFIG[ev.eventSource as CalendarEventSource];
      const grp = cfg?.filterGroup ?? "manual";
      counts[grp] = (counts[grp] || 0) + 1;
    }
    return counts;
  }, [calendarEvents]);

  const filteredEvents = useMemo(() => {
    if (sourceFilter === "all") return calendarEvents;
    return calendarEvents.filter((e) => {
      const cfg = SOURCE_CONFIG[e.eventSource as CalendarEventSource];
      return (cfg?.filterGroup ?? "manual") === sourceFilter;
    });
  }, [calendarEvents, sourceFilter]);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    if (!canAddCalendarEvents) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setAddEventDate(dateStr);
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const monthName = currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const mobileEvents = filteredEvents
    .filter((e) => { const d = new Date(e.date); return d.getMonth() === month && d.getFullYear() === year; })
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Error al eliminar el evento"); return; }
    toast.success(`Evento "${deleteTarget.title}" eliminado`);
    setDeleteTarget(null);
  };

  const handleCalDragStart = (eventId: string) => { if (!isAdmin) return; setDragEventId(eventId); };
  const handleCalDragOver = (e: React.DragEvent, day: number) => { e.preventDefault(); setDragOverDay(day); };
  const handleCalDrop = async (day: number) => {
    if (!dragEventId) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const { error } = await supabase.from("calendar_events").update({ date: dateStr }).eq("id", dragEventId);
    setDragEventId(null); setDragOverDay(null);
    if (error) { toast.error("Error al mover el evento"); return; }
    toast.success("Evento movido");
  };
  const handleCalDragEnd = () => { setDragEventId(null); setDragOverDay(null); };

  const today = new Date();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Calendario Editorial</h1>
        <p className="text-sm text-muted-foreground mt-1">Posts, ads y hitos de video en un solo lugar</p>
      </motion.div>

      {/* Source filter pills */}
      <div className="flex gap-2 flex-wrap items-center">
        {FILTER_GROUPS.map((f) => {
          const count = sourceCounts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => setSourceFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                sourceFilter === f.key
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
              }`}
            >
              {f.key === "posts" && "📸"}
              {f.key === "ads" && "🎯"}
              {f.key === "videos" && "🎬"}
              {f.key === "manual" && "📌"}
              {f.label}
              {count > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${sourceFilter === f.key ? "bg-primary/20" : "bg-secondary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {/* Legend */}
        <div className="ml-auto flex gap-2 flex-wrap">
          {(Object.entries(SOURCE_CONFIG) as [CalendarEventSource, typeof SOURCE_CONFIG[CalendarEventSource]][])
            .filter(([, cfg]) => cfg.filterGroup !== "manual")
            .map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </span>
            ))
          }
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground capitalize">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={next} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop calendar */}
      <div className="hidden md:block glass gold-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7">
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground border-b border-border/30">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const events = day ? getEventsForDay(day) : [];
            const visible = events.slice(0, 3);
            const extra = events.length - 3;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day)}
                onDragOver={(e) => day && handleCalDragOver(e, day)}
                onDrop={() => day && handleCalDrop(day)}
                className={`min-h-[110px] p-2 border-b border-r border-border/20 transition-colors
                  ${day ? `${canAddCalendarEvents ? "cursor-pointer" : ""} hover:bg-secondary/30` : "bg-secondary/10"}
                  ${dragOverDay === day ? "bg-primary/10 ring-inset ring-1 ring-primary/30" : ""}
                  ${isToday ? "bg-primary/5" : ""}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}>{day}</span>
                      {canAddCalendarEvents && <Plus className="h-3 w-3 text-muted-foreground/40 hover:text-primary" />}
                    </div>
                    <div className="space-y-0.5">
                      {visible.map((ev) => (
                        <div
                          key={ev.id}
                          draggable={isAdmin}
                          onDragStart={(e) => { e.stopPropagation(); handleCalDragStart(ev.id); }}
                          onDragEnd={handleCalDragEnd}
                          className={isAdmin ? "cursor-grab active:cursor-grabbing" : ""}
                        >
                          <EventPill event={ev} onNavigate={navigate} />
                        </div>
                      ))}
                      {extra > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline w-full text-left px-1">
                              +{extra} más
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="glass gold-border p-2 w-52" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              {events.slice(3).map((ev) => (
                                <EventPill key={ev.id} event={ev} onNavigate={navigate} />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile list + mini calendar */}
      <div className="md:hidden space-y-4">
        <div className="glass gold-border rounded-xl overflow-hidden">
          {canAddCalendarEvents && (
            <button
              onClick={() => setAddEventDate(`${year}-${String(month + 1).padStart(2, "0")}-01`)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 border-b border-border/30 text-primary text-sm font-medium hover:bg-secondary/30 transition-colors"
            >
              <Plus className="h-4 w-4" /> Agregar publicación
            </button>
          )}
          {mobileEvents.length === 0 && (
            <div className="p-5">
              <EmptyState icon={Calendar} title="Sin eventos este mes" description="Los posts, ads y hitos de video aparecerán aquí automáticamente." />
            </div>
          )}
          {mobileEvents.map((ev) => {
            const color = eventColor(ev);
            const emoji = eventEmoji(ev);
            const srcLabel = eventLabel(ev);
            const meta = ev.metadata || {};
            const permalink = ev.igShortCode
              ? `https://www.instagram.com/reel/${ev.igShortCode}/`
              : meta.permalink || null;
            return (
              <div
                key={ev.id}
                className="w-full flex items-start gap-3 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors text-left group"
                style={{ borderLeftWidth: "3px", borderLeftColor: color }}
              >
                {/* Source icon */}
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base mt-0.5"
                  style={{ backgroundColor: `${color}22` }}>
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${color}22`, color }}>
                      {srcLabel}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                    {ev.time && ` · ${ev.time}`}
                  </p>
                  {/* Metrics */}
                  {(meta.likes || meta.spend) && (
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      {meta.likes != null && meta.likes > 0 && <span>❤️ {meta.likes.toLocaleString()}</span>}
                      {meta.comments != null && meta.comments > 0 && <span>💬 {meta.comments.toLocaleString()}</span>}
                      {meta.spend != null && <span>💰 ${Number(meta.spend).toFixed(0)}</span>}
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    {ev.videoId && (
                      <button onClick={() => navigate("/videos")} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Play className="h-3 w-3" /> Videos
                      </button>
                    )}
                    {ev.eventSource === "meta_ad" && (
                      <button onClick={() => navigate("/ads")} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Target className="h-3 w-3" /> Ver Ad
                      </button>
                    )}
                    {permalink && (
                      <a href={permalink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        {ev.eventSource === "fb_post" ? "Facebook" : "Instagram"}
                      </a>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setDeleteTarget(ev)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Mini calendar */}
        <div className="glass gold-border rounded-xl overflow-hidden p-3">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">Vista de calendario</h3>
          <div className="grid grid-cols-7 gap-px">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-semibold text-muted-foreground">{d.slice(0, 2)}</div>
            ))}
            {cells.map((day, i) => {
              const events = day ? getEventsForDay(day) : [];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              // Up to 3 distinct source colors for dots
              const dotColors = [...new Set(events.map((e) => eventColor(e)))].slice(0, 3);
              return (
                <div key={i} onClick={() => day && canAddCalendarEvents && handleDayClick(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-md text-[11px] ${
                    day ? `${canAddCalendarEvents ? "cursor-pointer" : ""} hover:bg-secondary/50` : ""
                  } ${isToday ? "ring-1 ring-primary bg-primary/10" : ""}`}>
                  {day && (
                    <>
                      <span className={`${events.length > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>{day}</span>
                      {dotColors.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dotColors.map((c, idx) => (
                            <span key={idx} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar evento"
        description={`¿Estás seguro de eliminar "${deleteTarget?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteEvent}
      />

      <AnimatePresence>
        {addEventDate && <AddEventModal date={addEventDate} onClose={() => setAddEventDate(null)} />}
      </AnimatePresence>
    </div>
  );
}
