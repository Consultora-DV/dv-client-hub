import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { calendarEvents } from "@/data/mockData";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const platformColors: Record<string, string> = {
  instagram: "bg-instagram",
  tiktok: "bg-foreground",
  youtube: "bg-youtube",
};

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 3, 1)); // April 2025

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start

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

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  // Mobile: list view for current week
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

      {/* Header */}
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
                className={`min-h-[100px] p-2 border-b border-r border-border/20 ${
                  day ? "hover:bg-secondary/30 transition-colors" : "bg-secondary/10"
                }`}
              >
                {day && (
                  <>
                    <span className="text-xs text-muted-foreground">{day}</span>
                    <div className="mt-1 space-y-1">
                      {events.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => ev.videoId && navigate("/videos")}
                          className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded ${platformColors[ev.platform]} text-foreground truncate`}
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
        {mobileEvents.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground text-center">Sin eventos este mes</p>
        )}
        {mobileEvents.map((ev) => (
          <button
            key={ev.id}
            onClick={() => ev.videoId && navigate("/videos")}
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className={`w-3 h-3 rounded-full shrink-0 ${platformColors[ev.platform]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(ev.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
