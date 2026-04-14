import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/contexts/AppStateContext";
import { usePermissions } from "@/hooks/usePermissions";
import { CalendarEvent } from "@/data/mockData";

const platformColors: Record<string, string> = {
  instagram: "bg-instagram",
  tiktok: "bg-foreground",
  youtube: "bg-youtube",
  facebook: "bg-status-published",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
};

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function AddEventModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { setCalendarEvents } = useAppState();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [contentType, setContentType] = useState("reel");
  const [time, setTime] = useState("12:00");

  const handleSave = () => {
    if (!title.trim()) return;
    const newEvent: CalendarEvent = {
      id: `e_${Date.now()}`,
      date,
      title: `${title.trim()} (${contentType})`,
      platform: platform as CalendarEvent["platform"],
    };
    setCalendarEvents((prev) => [...prev, newEvent]);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass gold-border gold-glow rounded-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold text-foreground">Agregar Publicación</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Fecha: {date}</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Título del contenido</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border/50 rounded-xl" placeholder="Nombre de la publicación" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Plataforma</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(platformLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    platform === key ? `${platformColors[key]} text-foreground` : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tipo de contenido</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="bg-secondary border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass gold-border">
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="carrusel">Carrusel</SelectItem>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Hora de publicación</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-secondary border-border/50 rounded-xl" />
          </div>
          <Button onClick={handleSave} disabled={!title.trim()} className="w-full gold-gradient text-primary-foreground rounded-xl h-11">
            Agregar al calendario
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { calendarEvents } = useAppState();
  const { canAddCalendarEvents } = usePermissions();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 3, 1));
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
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Calendario Editorial</h1>
        <p className="text-sm text-muted-foreground mt-1">Planificación de publicaciones</p>
      </motion.div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground capitalize">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={next} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Calendar */}
      <div className="hidden md:block glass gold-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7">
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground border-b border-border/30">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const events = day ? getEventsForDay(day) : [];
            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day)}
                className={`min-h-[100px] p-2 border-b border-r border-border/20 ${
                  day ? `hover:bg-secondary/30 transition-colors ${canAddCalendarEvents ? "cursor-pointer" : ""}` : "bg-secondary/10"
                }`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{day}</span>
                      {canAddCalendarEvents && (
                        <Plus className="h-3 w-3 text-muted-foreground/50 hover:text-primary" />
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {events.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); ev.videoId && navigate("/videos"); }}
                          className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded ${platformColors[ev.platform] || "bg-secondary"} text-foreground truncate`}
                        >
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile List */}
      <div className="md:hidden glass gold-border rounded-xl overflow-hidden">
        {canAddCalendarEvents && (
          <button
            onClick={() => {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
              setAddEventDate(dateStr);
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-b border-border/30 text-primary text-sm font-medium hover:bg-secondary/30 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar publicación
          </button>
        )}
        {mobileEvents.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground text-center">Sin eventos este mes</p>
        )}
        {mobileEvents.map((ev) => (
          <button
            key={ev.id}
            onClick={() => ev.videoId && navigate("/videos")}
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className={`w-3 h-3 rounded-full shrink-0 ${platformColors[ev.platform] || "bg-secondary"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(ev.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
              </p>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {addEventDate && <AddEventModal date={addEventDate} onClose={() => setAddEventDate(null)} />}
      </AnimatePresence>
    </div>
  );
}
