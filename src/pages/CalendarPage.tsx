import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { CalendarEvent } from "@/data/mockData";

const platformColors: Record<string, string> = {
  instagram: "bg-instagram",
  tiktok: "bg-foreground",
  youtube: "bg-youtube",
  facebook: "bg-status-published",
  "google maps": "bg-status-approved",
};

const platformDotColors: Record<string, string> = {
  instagram: "#E4405F",
  tiktok: "#000000",
  youtube: "#FF0000",
  facebook: "#1877F2",
  "google maps": "#34D399",
};

const allPlatforms = ["instagram", "tiktok", "youtube", "facebook", "google maps"];
const platformLabels: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", "google maps": "Google Maps",
};

const contentTypes = ["reel", "story", "post", "carrusel", "short", "live", "reseña"];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function AddEventModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { setCalendarEvents, allCalendarEvents, clients } = useAppState();
  const [title, setTitle] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [contentType, setContentType] = useState("reel");
  const [time, setTime] = useState("12:00");
  const [clienteId, setClienteId] = useState(clients[0]?.id || "");

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleSave = () => {
    if (!title.trim() || platforms.length === 0) return;
    const isDuplicate = allCalendarEvents.some(
      (e) => e.date === date && e.title === title.trim() && e.clienteId === clienteId
    );
    if (isDuplicate) {
      toast.error("Ya existe un evento con este título en esta fecha para este cliente.");
      return;
    }
    const newEvent: CalendarEvent = {
      id: `e_${Date.now()}`,
      clienteId,
      date,
      title: title.trim(),
      platform: platforms,
      contentType,
      time,
    };
    setCalendarEvents((prev) => [...prev, newEvent]);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="glass gold-border gold-glow rounded-2xl w-full max-w-lg w-[95vw]">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Nueva Publicación</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Fecha: {date}</p>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="Nombre de la publicación" /></div>
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
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Tipo de contenido</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {contentTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Cliente asignado</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Hora de publicación</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-secondary border-border/50 rounded-xl" /></div>
          <Button onClick={handleSave} disabled={!title.trim() || platforms.length === 0} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">Agregar al calendario</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EventPill({ event }: { event: CalendarEvent }) {
  const firstPlatform = event.platform[0];
  const dotColor = platformDotColors[firstPlatform] || "#888";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-secondary/80 truncate cursor-default">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="text-[10px] text-foreground truncate">{event.title.slice(0, 15)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="glass gold-border p-3 max-w-[200px]">
          <p className="text-sm font-medium text-foreground">{event.title}</p>
          {event.time && <p className="text-xs text-muted-foreground mt-1">{event.time}</p>}
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {event.platform.map((p) => (
              <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded-full ${platformColors[p] || "bg-secondary"} text-foreground`}>
                {platformLabels[p]}
              </span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents } = useAppState();
  const { canAddCalendarEvents } = usePermissions();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const [addEventDate, setAddEventDate] = useState<string | null>(null);

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

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEvents.filter((e) => e.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    if (!canAddCalendarEvents) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setAddEventDate(dateStr);
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const monthName = currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  const mobileEvents = calendarEvents
    .filter((e) => { const d = new Date(e.date); return d.getMonth() === month && d.getFullYear() === year; })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Calendario Editorial</h1>
        <p className="text-sm text-muted-foreground mt-1">Planificación de publicaciones</p>
      </motion.div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></Button>
        <h2 className="text-lg font-semibold text-foreground capitalize">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={next} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-5 w-5" /></Button>
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
            return (
              <div key={i} onClick={() => day && handleDayClick(day)}
                className={`min-h-[100px] p-2 border-b border-r border-border/20 ${day ? `hover:bg-secondary/30 transition-colors ${canAddCalendarEvents ? "cursor-pointer" : ""}` : "bg-secondary/10"}`}>
                {day && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{day}</span>
                      {canAddCalendarEvents && <Plus className="h-3 w-3 text-muted-foreground/50 hover:text-primary" />}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {visible.map((ev) => (
                        <EventPill key={ev.id} event={ev} />
                      ))}
                      {extra > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline w-full text-left px-1"
                            >
                              +{extra} más
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="glass gold-border p-2 w-48" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              {events.slice(3).map((ev) => (
                                <EventPill key={ev.id} event={ev} />
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

      {/* Mobile list */}
      <div className="md:hidden glass gold-border rounded-xl overflow-hidden">
        {canAddCalendarEvents && (
          <button onClick={() => setAddEventDate(`${year}-${String(month + 1).padStart(2, "0")}-01`)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-b border-border/30 text-primary text-sm font-medium hover:bg-secondary/30 transition-colors">
            <Plus className="h-4 w-4" /> Agregar publicación
          </button>
        )}
        {mobileEvents.length === 0 && <p className="p-5 text-sm text-muted-foreground text-center">Sin eventos este mes</p>}
        {mobileEvents.map((ev) => {
          const firstPlatform = ev.platform[0];
          const borderColor = platformDotColors[firstPlatform] || "#888";
          return (
            <button key={ev.id} onClick={() => ev.videoId && navigate("/videos")}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors text-left"
              style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                  {ev.time && ` · ${ev.time}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {ev.platform.map((p) => (
                  <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded-full ${platformColors[p] || "bg-secondary"} text-foreground`}>
                    {platformLabels[p]?.slice(0, 2)}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>{addEventDate && <AddEventModal date={addEventDate} onClose={() => setAddEventDate(null)} />}</AnimatePresence>
    </div>
  );
}
